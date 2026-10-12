import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntity,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import { EmailService } from '../notifications/email.service';
import {
  Registration,
  RegistrationStatus,
} from '../registrations/entities/registration.entity';
import { RegistrationsService } from '../registrations/registrations.service';
import { Role, User } from '../users/entities/user.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    @InjectRepository(Registration)
    private readonly registrations: Repository<Registration>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly registrationsService: RegistrationsService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly emailService?: EmailService,
    private readonly auditService?: AuditService,
  ) {}

  async findAll(): Promise<Payment[]> {
    const payments = await this.payments.find({
      relations: { registration: { session: { training: true } }, user: true },
      order: { createdAt: 'DESC' },
    });
    return payments.map((payment) => this.toResponse(payment) as Payment);
  }

  async findMine(userId: string): Promise<Payment[]> {
    const payments = await this.payments.find({
      where: { userId },
      relations: { registration: { session: { training: true } }, user: true },
      order: { createdAt: 'DESC' },
    });
    return payments.map((payment) => this.toResponse(payment) as Payment);
  }

  async findOne(
    id: string,
    actorUserId?: string,
    actorRole?: Role | string,
  ): Promise<Payment> {
    const payment = await this.payments.findOne({
      where: { id },
      relations: { registration: { session: { training: true } }, user: true },
    });
    if (
      !payment ||
      (actorRole !== Role.ADMIN && payment.userId !== actorUserId)
    ) {
      throw new NotFoundException('Payment not found');
    }
    return this.toResponse(payment);
  }

  async getReceiptPdf(
    id: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<{ reference: string; content: Buffer }> {
    const payment = await this.payments.findOne({
      where: { id },
      relations: { registration: { session: { training: true } }, user: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (actorRole !== 'ADMIN' && payment.userId !== actorUserId) {
      throw new NotFoundException('Payment not found');
    }
    if (
      payment.status !== PaymentStatus.PAID &&
      payment.status !== PaymentStatus.PARTIAL
    ) {
      throw new ConflictException(
        'A receipt is only available for a recorded payment',
      );
    }
    return {
      reference: payment.reference,
      content: await this.generateReceiptPdf(payment),
    };
  }

  async create(
    dto: CreatePaymentDto,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<Payment> {
    const registration = await this.registrations.findOne({
      where: { id: dto.registrationId },
      relations: { session: { training: true }, user: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status === RegistrationStatus.CANCELLED) {
      throw new ConflictException(
        'Cannot record payment for a cancelled registration',
      );
    }
    if (actorRole !== 'ADMIN' && registration.userId !== actorUserId) {
      throw new ForbiddenException(
        'You can only pay for your own registration',
      );
    }

    const amount = dto.amount;
    const remaining = Math.max(
      0,
      Number(registration.amountDue) - Number(registration.amountPaid),
    );
    const status =
      dto.status ??
      (amount >= remaining ? PaymentStatus.PAID : PaymentStatus.PARTIAL);
    if (status !== PaymentStatus.FAILED && amount > remaining) {
      throw new BadRequestException(
        'Payment cannot exceed the remaining balance',
      );
    }

    const userId = registration.userId ?? actorUserId ?? null;
    const user = userId
      ? await this.users.findOne({ where: { id: userId } })
      : null;
    const payment = this.payments.create({
      reference: this.generateReference(),
      registrationId: registration.id,
      registration,
      userId,
      user,
      amount,
      currency: registration.currency,
      method: dto.method,
      status,
      paidAt:
        status === PaymentStatus.PAID || status === PaymentStatus.PARTIAL
          ? new Date()
          : null,
    });

    const saved = await this.payments.save(payment);
    if (status === PaymentStatus.PAID || status === PaymentStatus.PARTIAL)
      await this.registrationsService.applyPayment(registration.id, amount);
    if (
      (status === PaymentStatus.PAID || status === PaymentStatus.PARTIAL) &&
      registration.participantEmail &&
      this.emailService
    ) {
      try {
        const receiptPayment = await this.payments.findOne({
          where: { id: saved.id },
          relations: {
            registration: { session: { training: true } },
            user: true,
          },
        });
        if (!receiptPayment)
          throw new NotFoundException('Payment not found after creation');
        const receipt = await this.generateReceiptPdf(receiptPayment);
        await this.emailService.sendPaymentReceiptEmail({
          to: registration.participantEmail,
          recipientName: registration.participantName,
          paymentReference: saved.reference,
          receipt,
        });
      } catch (error) {
        this.logger.error(
          `Could not generate or email receipt for payment ${saved.reference}: ${(error as Error).message}`,
        );
      }
    }
    if (userId) {
      await this.notifications?.create({
        userId,
        type: NotificationType.PAYMENT,
        title:
          status === PaymentStatus.FAILED
            ? 'Payment failed'
            : 'Payment recorded',
        message:
          status === PaymentStatus.FAILED
            ? `Payment ${saved.reference} could not be processed.`
            : `Payment ${saved.reference} of ${amount} ${saved.currency} was recorded.`,
        link: '/dashboard/payments',
      });
    }
    await this.auditService?.logAdminAction(
      actorUserId ?? userId ?? null,
      AuditAction.PAYMENT_PROCESSED,
      AuditEntity.PAYMENT,
      saved.id,
      `Payment ${saved.reference} processed for registration ${registration.id}`,
      status === PaymentStatus.FAILED
        ? AuditStatus.FAILED
        : AuditStatus.SUCCESS,
    );
    return this.toResponse(saved);
  }

  private generateReference(): string {
    return `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private async generateReceiptPdf(payment: Payment): Promise<Buffer> {
    const registration = payment.registration;
    if (!registration)
      throw new NotFoundException('Payment registration not found');

    const trainingTitle =
      registration.session?.training?.title ?? 'Formation i-Motion Academy';
    const paidAt = payment.paidAt ?? payment.createdAt;
    const paidDate = paidAt
      ? new Date(paidAt).toLocaleString('fr-FR', {
          dateStyle: 'long',
          timeStyle: 'short',
        })
      : 'Date non renseignée';
    const money = (amount: number) =>
      `${Number(amount).toFixed(2)} ${payment.currency}`;

    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 52 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer | Uint8Array) =>
        chunks.push(Buffer.from(chunk)),
      );
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      const left = 52;
      const right = 543;
      document.roundedRect(left, 48, right - left, 86, 12).fill('#10283f');
      document
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text('I-MOTION ACADEMY', left + 22, 68);
      document
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#cbd5e1')
        .text('Formation professionnelle', left + 22, 91);
      document
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#ffffff')
        .text('REÇU DE PAIEMENT', 310, 76, { width: 210, align: 'right' });

      document
        .fillColor('#10283f')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('DÉTAILS DU REÇU', left, 164);
      document
        .moveTo(left, 185)
        .lineTo(right, 185)
        .lineWidth(1)
        .strokeColor('#dbe3ea')
        .stroke();

      const row = (label: string, value: string, y: number) => {
        document
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#64748b')
          .text(label, left, y, { width: 175 });
        document
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#17202a')
          .text(value, 230, y, { width: right - 230 });
      };

      row('Référence du reçu', payment.reference, 204);
      row('Date du paiement', paidDate, 232);
      row('Référence de l’inscription', registration.reference, 260);
      row('Participant', registration.participantName, 288);
      row('Adresse e-mail', registration.participantEmail, 316);
      row('Formation', trainingTitle, 344);
      row('Mode de paiement', this.paymentMethodLabel(payment.method), 372);
      row(
        'Statut du paiement',
        payment.status === PaymentStatus.PARTIAL ? 'Partiel' : 'Payé',
        400,
      );

      document.roundedRect(left, 448, right - left, 150, 10).fill('#f1f5f9');
      document
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#10283f')
        .text('RÉCAPITULATIF', left + 18, 466);
      const summaryRow = (
        label: string,
        amount: number,
        y: number,
        bold = false,
      ) => {
        document
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(11)
          .fillColor(bold ? '#10283f' : '#475569')
          .text(label, left + 18, y);
        document
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(11)
          .text(money(amount), 360, y, { width: right - 378, align: 'right' });
      };
      summaryRow('Montant reçu', payment.amount, 496, true);
      summaryRow('Montant total de l’inscription', registration.amountDue, 526);
      summaryRow('Total réglé à ce jour', registration.amountPaid, 556);
      summaryRow(
        'Solde restant',
        Math.max(
          0,
          Number(registration.amountDue) - Number(registration.amountPaid),
        ),
        578,
      );

      document
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(9)
        .text(
          'Ce document confirme la réception du paiement indiqué ci-dessus. Veuillez le conserver pour vos dossiers.',
          left,
          630,
          { width: right - left, align: 'center' },
        );
      document
        .fontSize(9)
        .text('i-Motion Academy · Merci pour votre confiance.', left, 662, {
          width: right - left,
          align: 'center',
        });
      document.end();
    });
  }

  private paymentMethodLabel(method: Payment['method']): string {
    const labels: Record<Payment['method'], string> = {
      CARD: 'Carte bancaire',
      TRANSFER: 'Virement bancaire',
      CASH: 'Espèces',
      CHEQUE: 'Chèque',
    };
    return labels[method];
  }

  private toResponse(payment: Payment) {
    const registration = payment.registration;
    const training = registration?.session?.training;
    return {
      ...payment,
      participantName: registration?.participantName ?? '',
      trainingTitle: training?.title ?? '',
    };
  }
}
