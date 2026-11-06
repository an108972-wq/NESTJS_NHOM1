import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport, Transporter } from 'nodemailer';
import { Between, IsNull, LessThan, Repository } from 'typeorm';
import {
  BorrowRecord,
  BorrowStatus,
} from '../borrow-records/entities/borrow-record.entity';
import { ReservationsService } from '../reservations/reservations.service';
import {
  EmailDeliveryStatus,
  Notification,
  NotificationType,
} from './entities/notification.entity';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly reminderWindowHours = 48;
  private timer: NodeJS.Timeout | undefined;
  private reservationTimer: NodeJS.Timeout | undefined;
  private isRunning = false;
  private isRunningReservationTasks = false;
  private readonly mailer: Transporter | undefined;
  private readonly emailFrom = process.env.SMTP_FROM;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(BorrowRecord)
    private readonly borrowRepository: Repository<BorrowRecord>,
    private readonly reservationsService: ReservationsService,
  ) {
    const smtpSettings = [
      process.env.SMTP_HOST,
      process.env.SMTP_USER,
      process.env.SMTP_PASSWORD,
      process.env.SMTP_FROM,
    ];
    const smtpConfigured = smtpSettings.every(Boolean);
    if (smtpSettings.some(Boolean) && !smtpConfigured) {
      throw new Error('SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM must be configured together');
    }

    if (smtpConfigured) {
      const port = Number(process.env.SMTP_PORT ?? 587);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('SMTP_PORT must be a valid TCP port');
      }
      this.mailer = createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
    }
  }

  onModuleInit() {
    this.timer = setTimeout(() => {
      void this.runScheduledTasks();
      this.timer = setInterval(() => void this.runScheduledTasks(), 24 * 60 * 60 * 1000);
      this.timer.unref();
    }, 30_000);
    this.timer.unref();
    void this.runReservationTasks();
    this.reservationTimer = setInterval(
      () => void this.runReservationTasks(),
      60 * 1000,
    );
    this.reservationTimer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
    if (this.reservationTimer) clearInterval(this.reservationTimer);
  }

  getMailConfiguration() {
    return { smtpConfigured: Boolean(this.mailer) };
  }

  async findMine(userId: number) {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationRepository.find({
        where: { user: { id: userId } },
        relations: { borrowRecord: { book: true }, reservation: { book: true } },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
      this.notificationRepository.count({ where: { user: { id: userId }, readAt: IsNull() } }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(id: number, userId: number) {
    const notification = await this.notificationRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async runScheduledTasks() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.reservationsService.expireReadyReservations();
      await this.createDueReminders();
    } catch (error) {
      this.logger.error('Scheduled notification/reservation job failed', error);
    } finally {
      this.isRunning = false;
    }
  }

  async runReservationTasks() {
    if (this.isRunningReservationTasks) return;
    this.isRunningReservationTasks = true;
    try {
      await this.reservationsService.expireReadyReservations();
      await this.deliverReservationReadyEmails();
    } catch (error) {
      this.logger.error('Scheduled reservation task failed', error);
    } finally {
      this.isRunningReservationTasks = false;
    }
  }

  private async deliverReservationReadyEmails() {
    if (!this.mailer) return;
    const pending = await this.notificationRepository
      .createQueryBuilder('notification')
      .innerJoinAndSelect('notification.user', 'user')
      .innerJoinAndSelect('notification.reservation', 'reservation')
      .innerJoinAndSelect('reservation.book', 'book')
      .where('notification.type = :type', { type: NotificationType.RESERVATION_READY })
      .andWhere('notification.emailStatus = :status', {
        status: EmailDeliveryStatus.NOT_CONFIGURED,
      })
      .orderBy('notification.createdAt', 'ASC')
      .take(50)
      .getMany();

    for (const notification of pending) {
      if (!notification.user.email) {
        notification.emailStatus = EmailDeliveryStatus.FAILED;
        notification.emailError = 'Reader has no email address';
        await this.notificationRepository.save(notification);
        this.logger.warn(`Reservation notification ${notification.id} was not emailed: reader has no email`);
        continue;
      }
      await this.deliverEmail(notification, notification.user.email);
    }
  }

  private async createDueReminders() {
    const now = new Date();
    const reminderCutoff = new Date(now.getTime() + this.reminderWindowHours * 60 * 60 * 1000);
    const [upcoming, overdue] = await Promise.all([
      this.borrowRepository.find({
        where: {
          status: BorrowStatus.BORROWED,
          dueDate: Between(now, reminderCutoff),
        },
        relations: { user: true, book: true },
      }),
      this.borrowRepository.find({
        where: {
          status: BorrowStatus.BORROWED,
          dueDate: LessThan(now),
        },
        relations: { user: true, book: true },
      }),
    ]);

    for (const record of upcoming) {
      await this.createReminder(record, NotificationType.DUE_SOON);
    }
    for (const record of overdue) {
      await this.createReminder(record, NotificationType.OVERDUE);
    }
  }

  private async createReminder(record: BorrowRecord, type: NotificationType) {
    if (!record.user || !record.book || !record.dueDate) return;
    const existing = await this.notificationRepository.findOne({
      where: {
        user: { id: record.user.id },
        borrowRecord: { id: record.id },
        type,
      },
    });
    if (existing) {
      if (this.mailer && record.user.email && existing.emailStatus !== EmailDeliveryStatus.SENT) {
        await this.deliverEmail(existing, record.user.email);
      }
      return;
    }

    const dueDate = record.dueDate.toLocaleString('vi-VN');
    const title = type === NotificationType.OVERDUE ? 'Sách đã quá hạn' : 'Sắp đến hạn trả sách';
    const message =
      type === NotificationType.OVERDUE
        ? `Vui lòng trả "${record.book.title}" hoặc liên hệ thư viện. Hạn trả: ${dueDate}.`
        : `Sách "${record.book.title}" cần được trả trước ${dueDate}.`;
    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({
        user: record.user,
        borrowRecord: record,
        type,
        title,
        message,
        emailStatus: this.mailer && record.user.email
          ? EmailDeliveryStatus.FAILED
          : EmailDeliveryStatus.NOT_CONFIGURED,
        emailError: null,
        readAt: null,
      }),
    );

    if (!this.mailer) {
      this.logger.warn(`Email reminder ${notification.id} was not sent: SMTP is not configured`);
      return;
    }
    if (!record.user.email) {
      this.logger.warn(`Email reminder ${notification.id} was not sent: user has no email address`);
      return;
    }

    await this.deliverEmail(notification, record.user.email);
  }

  private async deliverEmail(notification: Notification, email: string) {
    if (!this.mailer) return;
    try {
      await this.mailer.sendMail({
        from: this.emailFrom,
        to: email,
        subject: notification.title,
        text: notification.message,
      });
      notification.emailStatus = EmailDeliveryStatus.SENT;
      notification.emailError = null;
      await this.notificationRepository.save(notification);
    } catch (error) {
      notification.emailStatus = EmailDeliveryStatus.FAILED;
      notification.emailError = error instanceof Error ? error.message : 'Unknown SMTP delivery error';
      await this.notificationRepository.save(notification);
      this.logger.error(`Email reminder ${notification.id} failed`, error);
    }
  }
}
