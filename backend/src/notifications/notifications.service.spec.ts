import { EmailService } from './email.service';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';

describe('NotificationsService complaint email dispatch', () => {
  it('sends complaint notifications through the business email template', async () => {
    const user = {
      id: 'participant-1',
      firstName: 'Camille',
      lastName: 'Martin',
      email: 'camille@example.test',
    } as User;
    const notificationRepo = {
      create: jest.fn((input: object) => input),
      save: jest.fn((input: object) => Promise.resolve(input)),
    };
    const usersRepo = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const emailService = {
      sendComplaintNotification: jest.fn().mockResolvedValue(undefined),
      sendNotification: jest.fn().mockResolvedValue(undefined),
    };
    const service = new NotificationsService(
      notificationRepo as unknown as Repository<Notification>,
      usersRepo as unknown as Repository<User>,
      emailService as unknown as EmailService,
    );

    const notification = await service.create({
      userId: user.id,
      type: NotificationType.SYSTEM,
      title: 'Nouveau message',
      message: 'Une réponse a été ajoutée à votre dossier.',
      link: '/dashboard/complaints/complaint-1',
      complaintEmail: {
        event: 'MESSAGE',
        reference: 'REC-20261007-0001',
        subject: 'Question concernant mon inscription',
      },
    });

    expect(notification).toEqual(
      expect.objectContaining({
        title: 'Nouveau message',
        link: '/dashboard/complaints/complaint-1',
      }),
    );
    expect(notificationRepo.save).toHaveBeenCalled();
    expect(emailService.sendComplaintNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: user.email,
        recipientName: 'Camille Martin',
        event: 'MESSAGE',
        reference: 'REC-20261007-0001',
        subject: 'Question concernant mon inscription',
        link: '/dashboard/complaints/complaint-1',
      }),
    );
    expect(emailService.sendNotification).not.toHaveBeenCalled();
  });
});
