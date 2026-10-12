import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from './email.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  async findAll(): Promise<Notification[]> {
    return this.notifications.find({ order: { createdAt: 'DESC' } });
  }

  async findMine(userId: string): Promise<Notification[]> {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(input: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
    complaintEmail?: {
      event:
        | 'CREATED'
        | 'NEW_FOR_ADMIN'
        | 'MESSAGE'
        | 'ATTACHMENT'
        | 'STATUS'
        | 'REOPENED';
      reference: string;
      subject: string;
    };
  }): Promise<Notification> {
    const { complaintEmail, ...notificationInput } = input;
    const user = await this.users.findOne({ where: { id: input.userId } });
    if (!user) throw new NotFoundException('Notification recipient not found');
    const notification = await this.notifications.save(
      this.notifications.create({
        ...notificationInput,
        user,
        read: false,
        link: input.link ?? null,
      }),
    );
    if (complaintEmail) {
      await this.emailService.sendComplaintNotification({
        to: user.email,
        recipientName: `${user.firstName} ${user.lastName}`.trim(),
        event: complaintEmail.event,
        reference: complaintEmail.reference,
        subject: complaintEmail.subject,
        title: input.title,
        message: input.message,
        link: input.link,
      });
    } else {
      await this.emailService.sendNotification({
        to: user.email,
        recipientName: `${user.firstName} ${user.lastName}`.trim(),
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      });
    }
    return notification;
  }

  async markRead(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<Notification> {
    const notification = await this.notifications.findOne({ where: { id } });
    if (!notification || (!isAdmin && notification.userId !== userId))
      throw new NotFoundException('Notification not found');
    notification.read = true;
    return this.notifications.save(notification);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifications.update({ userId, read: false }, { read: true });
  }
}
