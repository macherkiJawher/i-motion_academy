import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  AuditAction,
  AuditEntity,
  AuditStatus,
} from '../audit/entities/audit-log.entity';
import { RegistrationsService } from '../registrations/registrations.service';
import {
  Registration,
  RegistrationStatus,
} from '../registrations/entities/registration.entity';
import { User } from '../users/entities/user.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { Certificate, CertificateStatus } from './entities/certificate.entity';
import {
  CertificateAudit,
  CertificateAuditAction,
} from './entities/certificate-audit.entity';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';

type CertificateResponse = {
  id: string;
  number: string;
  userId: string;
  registrationId: string;
  type: Certificate['type'];
  issuedAt: Date;
  completedAt: Date;
  status: CertificateStatus;
  fileUrl: string | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  participantName: string;
  trainingTitle: string;
};

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificates: Repository<Certificate>,
    @InjectRepository(Registration)
    private readonly registrations: Repository<Registration>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CertificateAudit)
    private readonly audits: Repository<CertificateAudit>,
    private readonly registrationsService: RegistrationsService,
    @Optional() private readonly notifications?: NotificationsService,
    private readonly auditService?: AuditService,
  ) {}

  async findAll(): Promise<CertificateResponse[]> {
    const certificates = await this.certificates.find({
      relations: { registration: { session: { training: true } }, user: true },
      order: { issuedAt: 'DESC' },
    });
    return certificates.map((certificate) => this.toResponse(certificate));
  }

  async findMine(userId: string): Promise<CertificateResponse[]> {
    const certificates = await this.certificates.find({
      where: { userId },
      relations: { registration: { session: { training: true } }, user: true },
      order: { issuedAt: 'DESC' },
    });
    return certificates.map((certificate) => this.toResponse(certificate));
  }

  async findOne(
    id: string,
    actorUserId?: string,
    actorRole?: string,
  ): Promise<CertificateResponse> {
    const certificate = await this.certificates.findOne({
      where: { id },
      relations: { registration: { session: { training: true } }, user: true },
    });
    if (!certificate) throw new NotFoundException('Certificate not found');
    this.assertOwner(certificate, actorUserId, actorRole);
    return this.toResponse(certificate);
  }

  async verify(number: string) {
    const certificate = await this.certificates.findOne({
      where: { number },
      relations: { registration: { session: { training: true } } },
    });
    if (!certificate) return { valid: false, number };
    return {
      valid: certificate.status === CertificateStatus.ISSUED,
      number: certificate.number,
      type: certificate.type,
      trainingTitle: certificate.registration?.session?.training?.title ?? '',
      issuedAt: certificate.issuedAt,
      status: certificate.status,
    };
  }

  async create(
    dto: CreateCertificateDto,
    actorUserId?: string,
  ): Promise<CertificateResponse> {
    const registration = await this.registrations.findOne({
      where: { id: dto.registrationId },
      relations: { session: { training: true }, user: true },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== RegistrationStatus.COMPLETED) {
      throw new ConflictException(
        'Certificate requires a completed registration',
      );
    }
    if (!registration.userId)
      throw new ConflictException('Registration has no participant account');
    if (registration.certificateId)
      throw new ConflictException(
        'A certificate already exists for this registration',
      );

    const user = await this.users.findOne({
      where: { id: registration.userId },
    });
    if (!user) throw new NotFoundException('Participant not found');
    const certificate = this.certificates.create({
      number: this.generateNumber(),
      userId: registration.userId,
      user,
      registrationId: registration.id,
      registration,
      type: dto.type,
      status: CertificateStatus.ISSUED,
      completedAt: registration.completedAt ?? new Date(),
      fileUrl: dto.fileUrl ?? null,
      revokedAt: null,
      revocationReason: null,
    });
    const saved = await this.certificates.save(certificate);
    if (!saved.fileUrl) {
      saved.fileUrl = await this.generatePdf(saved, registration);
      await this.certificates.save(saved);
    }
    await this.audit(
      saved.id,
      CertificateAuditAction.ISSUED,
      actorUserId ?? null,
      'Certificate issued',
    );
    await this.auditService?.logAdminAction(
      actorUserId ?? null,
      AuditAction.CERTIFICATE_ISSUED,
      AuditEntity.CERTIFICATE,
      saved.id,
      `Certificate ${saved.number} issued for registration ${registration.id}`,
      AuditStatus.SUCCESS,
    );
    await this.registrationsService.attachCertificate(
      registration.id,
      saved.id,
    );
    await this.notifications?.create({
      userId: registration.userId,
      type: NotificationType.CERTIFICATE_AVAILABLE,
      title: 'Certificate available',
      message: `Your certificate ${saved.number} is now available to download.`,
      link: '/dashboard/certificates',
    });
    return this.toResponse({ ...saved, registration, user });
  }

  async update(
    id: string,
    dto: UpdateCertificateDto,
    actorUserId?: string,
  ): Promise<CertificateResponse> {
    const certificate = await this.certificates.findOne({
      where: { id },
      relations: { registration: { session: { training: true } }, user: true },
    });
    if (!certificate) throw new NotFoundException('Certificate not found');
    const previousStatus = certificate.status;
    Object.assign(certificate, dto);
    if (dto.status === CertificateStatus.REVOKED) {
      certificate.revokedAt = new Date();
      if (!dto.revocationReason)
        throw new ConflictException('Revocation reason is required');
      certificate.revocationReason = dto.revocationReason;
    }
    const saved = await this.certificates.save(certificate);
    if (dto.status && dto.status !== previousStatus) {
      await this.audit(
        saved.id,
        dto.status === CertificateStatus.REVOKED
          ? CertificateAuditAction.REVOKED
          : CertificateAuditAction.ARCHIVED,
        actorUserId ?? null,
        dto.revocationReason ?? null,
      );
      await this.auditService?.logAdminAction(
        actorUserId ?? null,
        dto.status === CertificateStatus.REVOKED
          ? AuditAction.CERTIFICATE_REVOKED
          : AuditAction.CERTIFICATE_ISSUED,
        AuditEntity.CERTIFICATE,
        saved.id,
        dto.revocationReason ?? `Certificate status changed to ${saved.status}`,
        AuditStatus.SUCCESS,
      );
    }
    return this.toResponse(saved);
  }

  async download(id: string, actorUserId: string, actorRole?: string) {
    const certificate = await this.certificates.findOne({
      where: { id },
      relations: { registration: { session: { training: true } }, user: true },
    });
    if (!certificate) throw new NotFoundException('Certificate not found');
    this.assertOwner(certificate, actorUserId, actorRole);
    if (certificate.status !== CertificateStatus.ISSUED)
      throw new ConflictException('Certificate is not available');
    let filePath = certificate.fileUrl
      ? join(process.cwd(), certificate.fileUrl)
      : '';
    if (!filePath || !existsSync(filePath)) {
      certificate.fileUrl = await this.generatePdf(
        certificate,
        certificate.registration,
      );
      await this.certificates.save(certificate);
      filePath = join(process.cwd(), certificate.fileUrl);
    }
    await this.audit(
      certificate.id,
      CertificateAuditAction.DOWNLOADED,
      actorUserId,
      null,
    );
    return {
      buffer: readFileSync(filePath),
      filename: `${certificate.number}.pdf`,
    };
  }

  private generateNumber(): string {
    return `IMA-CERT-${new Date().getFullYear()}-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private toResponse(certificate: Certificate): CertificateResponse {
    const registration = certificate.registration;
    const training = registration?.session?.training;
    return {
      id: certificate.id,
      number: certificate.number,
      userId: certificate.userId,
      registrationId: certificate.registrationId,
      type: certificate.type,
      issuedAt: certificate.issuedAt,
      completedAt: certificate.completedAt,
      status: certificate.status,
      fileUrl: certificate.fileUrl,
      revokedAt: certificate.revokedAt,
      revocationReason: certificate.revocationReason,
      participantName:
        registration?.participantName ??
        `${certificate.user?.firstName ?? ''} ${certificate.user?.lastName ?? ''}`.trim(),
      trainingTitle: training?.title ?? '',
    };
  }

  private assertOwner(
    certificate: Certificate,
    actorUserId?: string,
    actorRole?: string,
  ): void {
    if (actorRole !== 'ADMIN' && certificate.userId !== actorUserId) {
      throw new ForbiddenException('You cannot access this certificate');
    }
  }

  private async audit(
    certificateId: string,
    action: CertificateAuditAction,
    actorUserId: string | null,
    details: string | null,
  ): Promise<void> {
    await this.audits.save(
      this.audits.create({ certificateId, action, actorUserId, details }),
    );
  }

  private async generatePdf(
    certificate: Certificate,
    registration: Registration,
  ): Promise<string> {
    const relativeDirectory = join('uploads', 'certificates');
    const directory = join(process.cwd(), relativeDirectory);
    mkdirSync(directory, { recursive: true });
    const relativePath = join(relativeDirectory, `${certificate.number}.pdf`);
    const absolutePath = join(process.cwd(), relativePath);
    const verificationUrl = `${process.env.PUBLIC_API_URL ?? 'http://localhost:3000'}/certificates/verify/${encodeURIComponent(certificate.number)}`;
    const qrData = await QRCode.toDataURL(verificationUrl, {
      margin: 1,
      width: 180,
    });
    const qrImage = Buffer.from(qrData.split(',')[1], 'base64');

    await new Promise<void>((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 56 });
      const output = createWriteStream(absolutePath);
      output.on('finish', resolve);
      output.on('error', reject);
      document.pipe(output);
      document
        .fontSize(12)
        .fillColor('#555555')
        .text('I-MOTION ACADEMY', { align: 'center' });
      document
        .moveDown(2)
        .fontSize(30)
        .fillColor('#111111')
        .text(certificate.type === 'DIPLOMA' ? 'DIPLOMA' : 'CERTIFICATE', {
          align: 'center',
        });
      document
        .moveDown()
        .fontSize(16)
        .text('of successful completion', { align: 'center' });
      document
        .moveDown(3)
        .fontSize(24)
        .text(registration.participantName, { align: 'center' });
      document
        .moveDown()
        .fontSize(16)
        .text(
          registration.session?.training?.title ?? 'i-Motion Academy training',
          { align: 'center' },
        );
      document
        .moveDown()
        .fontSize(11)
        .fillColor('#555555')
        .text(
          `Completed: ${(certificate.completedAt ?? new Date()).toLocaleDateString('en-GB')}`,
          { align: 'center' },
        );
      document.text(
        `Issued: ${certificate.issuedAt.toLocaleDateString('en-GB')}`,
        { align: 'center' },
      );
      document.moveDown(3).image(qrImage, { fit: [130, 130], align: 'center' });
      document
        .moveDown()
        .fontSize(10)
        .text(`Verify at: ${verificationUrl}`, { align: 'center' });
      document
        .moveDown()
        .text(`Certificate number: ${certificate.number}`, { align: 'center' });
      document.end();
    });
    return relativePath.replace(/\\/g, '/');
  }
}
