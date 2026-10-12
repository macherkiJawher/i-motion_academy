import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Registration } from '../registrations/entities/registration.entity';
import { RegistrationsService } from '../registrations/registrations.service';
import { User } from '../users/entities/user.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from './entities/payment.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService receipts', () => {
  let service: PaymentsService;

  type ReceiptEmail = {
    to: string;
    recipientName: string;
    paymentReference: string;
    receipt: Buffer;
  };

  const paymentsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((input: Partial<Payment>) => input),
    save: jest.fn(),
  };
  const registrationsRepository = { findOne: jest.fn() };
  const usersRepository = { findOne: jest.fn() };
  const registrationsService = { applyPayment: jest.fn() };
  const emailService = {
    sendPaymentReceiptEmail: jest.fn<Promise<void>, [ReceiptEmail]>(),
  };
  const notificationsService = { create: jest.fn() };
  const auditService = { logAdminAction: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentsRepository,
        },
        {
          provide: getRepositoryToken(Registration),
          useValue: registrationsRepository,
        },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: RegistrationsService, useValue: registrationsService },
        { provide: EmailService, useValue: emailService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('allows only the payment owner or an administrator to read a payment', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'payment-1',
      userId: 'owner-1',
      registration: {
        participantName: 'Participant Example',
        session: { training: { title: 'Formation Exemple' } },
      },
    });

    await expect(
      service.findOne('payment-1', 'owner-1', 'PARTICIPANT'),
    ).resolves.toMatchObject({ id: 'payment-1' });
    await expect(
      service.findOne('payment-1', 'other-user', 'PARTICIPANT'),
    ).rejects.toThrow('Payment not found');
    await expect(
      service.findOne('payment-1', 'admin-1', 'ADMIN'),
    ).resolves.toMatchObject({ id: 'payment-1' });
  });

  it('generates a PDF receipt for the payment owner', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'payment-1',
      reference: 'PAY-2026-1234',
      registrationId: 'registration-1',
      userId: 'user-1',
      amount: 40,
      currency: 'TND',
      method: 'TRANSFER',
      status: PaymentStatus.PARTIAL,
      paidAt: new Date('2026-10-07T10:00:00Z'),
      createdAt: new Date('2026-10-07T10:00:00Z'),
      registration: {
        reference: 'IMA-2026-1234',
        participantName: 'Participant Example',
        participantEmail: 'participant@example.com',
        amountDue: 100,
        amountPaid: 40,
        session: { training: { title: 'Formation Exemple' } },
      },
    });

    const result = await service.getReceiptPdf('payment-1', 'user-1');

    expect(result.reference).toBe('PAY-2026-1234');
    expect(result.content.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('does not expose a receipt to another participant', async () => {
    paymentsRepository.findOne.mockResolvedValue({
      id: 'payment-1',
      userId: 'owner-1',
      status: PaymentStatus.PAID,
    });

    await expect(
      service.getReceiptPdf('payment-1', 'other-user'),
    ).rejects.toThrow('Payment not found');
  });

  it('emails a PDF receipt when a partial payment is recorded', async () => {
    const registration = {
      id: 'registration-1',
      reference: 'IMA-2026-1234',
      userId: 'user-1',
      participantName: 'Participant Example',
      participantEmail: 'participant@example.com',
      status: 'PENDING',
      amountDue: 100,
      amountPaid: 0,
      currency: 'TND',
      session: { training: { title: 'Formation Exemple' } },
    };
    registrationsRepository.findOne.mockResolvedValue(registration);
    usersRepository.findOne.mockResolvedValue({ id: 'user-1' });
    registrationsService.applyPayment.mockResolvedValue(registration);
    paymentsRepository.save.mockImplementation((payment: Partial<Payment>) =>
      Promise.resolve({ ...payment, id: 'payment-1' }),
    );
    paymentsRepository.findOne.mockResolvedValue({
      id: 'payment-1',
      reference: 'PAY-2026-5678',
      registrationId: 'registration-1',
      userId: 'user-1',
      amount: 40,
      currency: 'TND',
      method: 'TRANSFER',
      status: PaymentStatus.PARTIAL,
      paidAt: new Date('2026-10-07T10:00:00Z'),
      createdAt: new Date('2026-10-07T10:00:00Z'),
      registration: {
        ...registration,
        amountPaid: 40,
      },
    });

    const result = await service.create(
      {
        registrationId: 'registration-1',
        amount: 40,
        method: PaymentMethod.TRANSFER,
      },
      'user-1',
      'PARTICIPANT',
    );

    const receiptEmail =
      emailService.sendPaymentReceiptEmail.mock.calls[0]?.[0];
    expect(receiptEmail?.to).toBe('participant@example.com');
    expect(receiptEmail?.paymentReference).toBe(result.reference);
    expect(Buffer.isBuffer(receiptEmail?.receipt)).toBe(true);
    expect(registrationsService.applyPayment).toHaveBeenCalledWith(
      'registration-1',
      40,
    );
  });
});
