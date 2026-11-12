import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { NotificationTemplate } from './entities/notification-template.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport, Transporter } from 'nodemailer';
import { Between, IsNull, LessThan, Repository } from 'typeorm';
import {
  BorrowRecord,
  BorrowStatus,
} from '../borrow-records/entities/borrow-record.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { SettingsService } from '../settings/settings.service';
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
  private mailer: Transporter | undefined;
  private emailFrom = process.env.SMTP_FROM;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(BorrowRecord)
    private readonly borrowRepository: Repository<BorrowRecord>,
    private readonly reservationsService: ReservationsService,
    @Optional()
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository?: Repository<NotificationTemplate>,
    @Optional()
    private readonly settingsService?: SettingsService,
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

  
  async getTemplates() {
    if (!this.templateRepository) return [];
    return this.templateRepository.find({ order: { id: 'ASC' } });
  }

  async updateTemplate(id: number, data: Partial<NotificationTemplate>) {
    if (!this.templateRepository) return null;
    await this.templateRepository.update(id, data);
    return this.templateRepository.findOneBy({ id });
  }

  private async seedDefaultTemplates() {
    if (!this.templateRepository) return;
    const count = await this.templateRepository.count();
    if (count > 0) return;

    const defaults = [
      {
        code: 'DUE_REMINDER',
        name: 'Nhắc nhở sách sắp đến hạn',
        channel: 'EMAIL',
        subject: 'Thư viện: Sách mượn sắp đến hạn hoàn trả',
        content: 'Kính gửi {ten_doc_gia}, đầu sách "{ten_sach}" của bạn sắp đến hạn trả vào ngày {ngay_het_han}. Vui lòng sắp xếp trả sách hoặc truy cập hệ thống để gia hạn trực tuyến.',
        isActive: true,
      },
      {
        code: 'OVERDUE_ALERT',
        name: 'Cảnh báo sách mượn quá hạn',
        channel: 'EMAIL',
        subject: 'Cảnh báo: Sách mượn đã quá hạn hoàn trả',
        content: 'Kính gửi {ten_doc_gia}, cuốn sách "{ten_sach}" đã quá hạn vào ngày {ngay_het_han}. Tiền phạt phát sinh hiện tại: {so_tien_phat} VNĐ. Đề nghị bạn hoàn trả ngay.',
        isActive: true,
      },
      {
        code: 'HOLD_READY',
        name: 'Sách đặt trước đã có sẵn tại quầy',
        channel: 'ZALO',
        subject: 'Sách đặt trước của bạn đã sẵn sàng',
        content: 'Chào {ten_doc_gia}, cuốn sách "{ten_sach}" bạn đã đặt giữ chỗ hiện đã có sẵn tại quầy thư viện. Hạn giữ sách đến hết ngày {ngay_het_han_giu}.',
        isActive: true,
      },
      {
        code: 'ACQUISITION_APPROVED',
        name: 'Đề xuất mua sách được duyệt',
        channel: 'EMAIL',
        subject: 'Đề xuất mua sách của bạn đã được phê duyệt',
        content: 'Chào {ten_doc_gia}, thư viện đã phê duyệt đề xuất bổ sung cuốn sách "{ten_sach}". Sách sẽ được nhập kho và thông báo tới bạn sớm nhất.',
        isActive: true,
      },
      {
        code: 'CARD_EXPIRE_REMINDER',
        name: 'Nhắc gia hạn thẻ thư viện',
        channel: 'SMS',
        subject: 'Thẻ thư viện sắp hết hạn',
        content: 'Kính gửi {ten_doc_gia}, thẻ thư viện số {ma_the} của bạn sẽ hết hiệu lực vào ngày {ngay_het_han}. Vui lòng liên hệ quầy hoặc gia hạn qua cổng cá nhân.',
        isActive: true,
      },
    ];

    for (const d of defaults) {
      await this.templateRepository.save(this.templateRepository.create(d));
    }
  }

  getMailConfiguration() {
    return { smtpConfigured: Boolean(this.mailer) };
  }

  async findAll() {
    return this.notificationRepository.find({
      relations: { user: true, borrowRecord: { book: true }, reservation: { book: true } },
      order: { createdAt: 'DESC' },
      take: 100,
    });
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

  async sendAcquisitionNotification(user: any, title: string, message: string) {
    if (!user) return null;
    const notification = await this.notificationRepository.save(
      this.notificationRepository.create({
        user,
        type: NotificationType.ACQUISITION_UPDATE,
        title,
        message,
        emailStatus: this.mailer && user.email
          ? EmailDeliveryStatus.FAILED
          : EmailDeliveryStatus.NOT_CONFIGURED,
        emailError: null,
        readAt: null,
      }),
    );
    if (this.mailer && user.email) {
      await this.deliverEmail(notification, user.email);
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
    const { mailer } = await this.getMailerInfo();
    if (!mailer) return;
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

  async triggerDueReminders() {
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
    return {
      message: 'Đã hoàn tất gửi thông báo nhắc lịch trả sách.',
      upcomingCount: upcoming.length,
      overdueCount: overdue.length,
      totalCount: upcoming.length + overdue.length,
    };
  }

  private async createDueReminders() {
    await this.triggerDueReminders();
  }

  private async _oldCreateDueReminders() {
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

  async renderTemplate(
    code: string,
    variables: Record<string, string | number>,
  ): Promise<{ subject: string; content: string; channel: string }> {
    let tpl: NotificationTemplate | null = null;
    if (this.templateRepository) {
      try {
        tpl = await this.templateRepository.findOne({ where: { code, isActive: true } });
      } catch {}
    }

    let subject = tpl?.subject || (code === 'OVERDUE_ALERT' ? 'Cảnh báo: Sách mượn đã quá hạn hoàn trả' : 'Nhắc nhở: Sách mượn sắp đến hạn trả');
    let content = tpl?.content || (code === 'OVERDUE_ALERT'
      ? 'Kính gửi {TEN_DOC_GIA}, cuốn sách "{TEN_SACH}" đã quá hạn vào ngày {NGAY_HET_HAN}. Tiền phạt phát sinh hiện tại: {SO_TIEN_PHAT} VNĐ. Đề nghị bạn hoàn trả ngay.'
      : 'Kính gửi {TEN_DOC_GIA}, đầu sách "{TEN_SACH}" của bạn sắp đến hạn trả vào ngày {NGAY_HET_HAN}. Vui lòng sắp xếp trả sách hoặc gia hạn trực tuyến.');
    const channel = tpl?.channel || 'EMAIL';

    for (const [key, value] of Object.entries(variables)) {
      const valStr = String(value ?? '');
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      subject = subject.replace(regex, valStr);
      content = content.replace(regex, valStr);
    }

    return { subject, content, channel };
  }

  async testTemplate(body: { id?: number; code?: string; subject?: string; content?: string; email: string }) {
    const targetEmail = (body.email || '').trim();
    if (!targetEmail) throw new BadRequestException('Vui lòng nhập địa chỉ email nhận thư thử nghiệm');

    let subject = body.subject || '';
    let content = body.content || '';

    if (!subject || !content) {
      if (body.id && this.templateRepository) {
        const tpl = await this.templateRepository.findOneBy({ id: body.id });
        if (tpl) {
          subject = subject || tpl.subject;
          content = content || tpl.content;
        }
      }
    }

    const sampleVars: Record<string, string> = {
      TEN_DOC_GIA: 'Nguyễn Văn A',
      TEN_SACH: 'Giáo trình Kỹ nghệ phần mềm và Chuyển đổi số',
      NGAY_HET_HAN: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
      SO_TIEN_PHAT: '15.000',
      MA_THE: 'TV-10088',
      NGAY_HET_HAN_GIU: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('vi-VN'),
      MA_PHIEU_MUON: '#1052',
    };

    for (const [key, val] of Object.entries(sampleVars)) {
      const reg = new RegExp(`\\{${key}\\}`, 'gi');
      subject = subject.replace(reg, val);
      content = content.replace(reg, val);
    }

    const { mailer, emailFrom } = await this.getMailerInfo();
    if (!mailer) {
      throw new Error('Chưa cấu hình cổng SMTP. Hãy cài đặt thông tin máy chủ SMTP trước.');
    }

    await mailer.sendMail({
      from: emailFrom,
      to: targetEmail,
      subject: `[THỬ NGHIỆM MẪU] ${subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:10px;max-width:580px;background:#ffffff;">
          <div style="background:#e0f2fe;color:#0369a1;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:700;margin-bottom:14px;">
            ℹ️ ĐÂY LÀ THƯ THỬ NGHIỆM MẪU THÔNG BÁO TỰ ĐỘNG (PREVIEW TEST)
          </div>
          <h3 style="color:#0f766e;margin-top:0;">${subject}</h3>
          <p style="font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap;">${content}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0;">
          <small style="color:#64748b;">Thời gian thử nghiệm: ${new Date().toLocaleString('vi-VN')}</small>
        </div>
      `,
      text: content,
    });

    return {
      success: true,
      message: `Đã gửi thử nghiệm mẫu thông báo tới email "${targetEmail}" thành công!`,
      subject,
      content,
    };
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

    const readerName = record.user.fullName || record.user.username || 'Bạn đọc';
    const bookTitle = record.book.title;
    const dueDateStr = record.dueDate.toLocaleDateString('vi-VN');
    const daysLate = Math.max(0, Math.ceil((Date.now() - record.dueDate.getTime()) / (24 * 60 * 60 * 1000)));
    const fineRate = (await this.settingsService?.getSettings())?.dailyFineRate || 5000;
    const fineAmount = (daysLate * fineRate).toLocaleString('vi-VN');

    const templateCode = type === NotificationType.OVERDUE ? 'OVERDUE_ALERT' : 'DUE_REMINDER';
    const rendered = await this.renderTemplate(templateCode, {
      TEN_DOC_GIA: readerName,
      TEN_SACH: bookTitle,
      NGAY_HET_HAN: dueDateStr,
      SO_TIEN_PHAT: fineAmount,
      MA_THE: `TV-${record.user.id}`,
      MA_PHIEU_MUON: `#${record.id}`,
    });

    const title = rendered.subject;
    const message = rendered.content;
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

    const { mailer } = await this.getMailerInfo();
    if (!mailer) {
      this.logger.warn(`Email reminder ${notification.id} was not sent: SMTP is not configured`);
      return;
    }
    if (!record.user.email) {
      this.logger.warn(`Email reminder ${notification.id} was not sent: user has no email address`);
      return;
    }

    await this.deliverEmail(notification, record.user.email);
  }

  async getMailerInfo(): Promise<{ mailer: Transporter | null; emailFrom: string }> {
    if (this.settingsService) {
      try {
        const settings = await this.settingsService.getSettings();
        if (settings.smtpHost && settings.smtpUser && settings.smtpPassword) {
          const transport = createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort || 587,
            secure: Boolean(settings.smtpSecure),
            auth: { user: settings.smtpUser, pass: settings.smtpPassword },
          });
          return {
            mailer: transport,
            emailFrom: settings.smtpFrom || settings.smtpUser,
          };
        }
      } catch (e: any) {
        this.logger.warn(`Could not load SMTP settings from DB: ${e.message}`);
      }
    }
    return {
      mailer: this.mailer || null,
      emailFrom: this.emailFrom || process.env.SMTP_FROM || 'thuvien@daihoc.edu.vn',
    };
  }

  async testSmtpConnection(targetEmail: string) {
    const { mailer, emailFrom } = await this.getMailerInfo();
    if (!mailer) {
      throw new Error('Chưa cấu hình máy chủ SMTP hoặc thông tin đăng nhập còn thiếu (Host, User, Password)');
    }
    await mailer.sendMail({
      from: emailFrom,
      to: targetEmail,
      subject: '[THƯ VIỆN SỐ] Kiểm tra kết nối Cổng Email tự động (SMTP) thành công',
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #e2e8f0;border-radius:10px;max-width:550px;background:#ffffff;">
          <h2 style="color:#6f42c1;margin-top:0;">🎉 KẾT NỐI SMTP THÀNH CÔNG!</h2>
          <p>Xin chào Ban Quản trị Thư viện,</p>
          <p>Đây là email kiểm tra được gửi tự động từ <strong>Hệ Thống Quản Lý Thư Viện Số Thông Minh</strong>.</p>
          <div style="background:#f8fafc;padding:12px;border-left:4px solid #10b981;border-radius:4px;margin:16px 0;">
            <p style="margin:0 0 6px 0;font-weight:700;color:#0f766e;">Trạng thái cổng gửi:</p>
            <span style="font-size:13px;color:#334155;">Cổng SMTP đã kết nối thông suốt và sẵn sàng tự động gửi các mẫu thông báo nhắc nhở ngày trả sách, cảnh báo quá hạn và cấp lại thẻ độc giả.</span>
          </div>
          <hr style="border:none;border-top:1px solid #f1f5f9;margin:16px 0;">
          <small style="color:#64748b;">Thời gian kiểm tra: ${new Date().toLocaleString('vi-VN')}</small>
        </div>
      `,
    });
    return {
      success: true,
      message: `Đã gửi thành công email thử nghiệm tới "${targetEmail}" qua cổng SMTP!`,
    };
  }

  private async deliverEmail(notification: Notification, email: string) {
    const { mailer, emailFrom } = await this.getMailerInfo();
    if (!mailer) return;
    try {
      await mailer.sendMail({
        from: emailFrom,
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
