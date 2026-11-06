import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { STAFF_ROLES } from '../../common/constants/user-role';
import {
  BorrowRecord,
  BorrowStatus,
} from '../borrow-records/entities/borrow-record.entity';
import { FinePayment, PaymentMethod, PaymentStatus } from './entities/payment.entity';

type VnpayParams = Record<string, string>;

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(FinePayment)
    private readonly paymentRepository: Repository<FinePayment>,
    private readonly dataSource: DataSource,
  ) {}

  async createFinePayment(
    recordId: number,
    requesterId: number,
    requesterRole: string,
    ipAddress: string,
  ) {
    const config = this.getConfig();
    const payment = await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(BorrowRecord, {
        where: { id: recordId },
        relations: { user: true, book: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) throw new NotFoundException('Không tìm thấy phiếu mượn');
      if (!STAFF_ROLES.includes(requesterRole as (typeof STAFF_ROLES)[number]) && record.user.id !== requesterId) {
        throw new ForbiddenException('Bạn chỉ có thể thanh toán tiền phạt của mình');
      }
      if (record.status !== BorrowStatus.RETURNED || record.fineStatus !== 'UNPAID') {
        throw new BadRequestException('Phiếu mượn không có tiền phạt cần thanh toán');
      }
      const amount = Math.round(Number(record.fineAmount));
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new BadRequestException('Số tiền phạt không hợp lệ');
      }

      const existing = await manager.findOne(FinePayment, {
        where: { borrowRecord: { id: recordId }, status: PaymentStatus.INITIATED },
        relations: { borrowRecord: true },
        order: { createdAt: 'DESC' },
      });
      if (existing && Date.now() - existing.createdAt.getTime() < 15 * 60 * 1000) {
        return existing;
      }

      return manager.save(
        manager.create(FinePayment, {
          txnRef: randomUUID().replace(/-/g, ''),
          borrowRecord: record,
          amount,
          status: PaymentStatus.INITIATED,
          paymentMethod: PaymentMethod.VNPAY,
          vnpayTransactionNo: null,
          responseCode: null,
          paidAt: null,
        }),
      );
    });

    return {
      paymentId: payment.id,
      amount: Number(payment.amount),
      paymentUrl: this.buildPaymentUrl(payment, config, ipAddress),
    };
  }

  async handleIpn(params: VnpayParams) {
    const config = this.getConfig();
    if (!this.isValidSignature(params, config.hashSecret)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const payment = await this.paymentRepository.findOne({
      where: { txnRef: params.vnp_TxnRef },
      relations: { borrowRecord: true },
    });
    if (!payment) return { RspCode: '01', Message: 'Payment not found' };
    if (params.vnp_TmnCode !== config.tmnCode) {
      return { RspCode: '97', Message: 'Invalid merchant' };
    }
    if (Number(params.vnp_Amount) !== Math.round(Number(payment.amount) * 100)) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      return { RspCode: '02', Message: 'Payment already confirmed' };
    }

    const succeeded =
      params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
    const alreadyConfirmed = await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(BorrowRecord, {
        where: { id: payment.borrowRecord.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) throw new NotFoundException('Không tìm thấy phiếu mượn');
      const lockedPayment = await manager.findOne(FinePayment, {
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedPayment || lockedPayment.status !== PaymentStatus.INITIATED) {
        return true;
      }
      if (succeeded && (record.fineStatus !== 'UNPAID' ||
          Math.round(Number(record.fineAmount)) !== Number(lockedPayment.amount))) {
        throw new BadRequestException('Số dư tiền phạt đã thay đổi');
      }

      lockedPayment.status = succeeded ? PaymentStatus.PAID : PaymentStatus.FAILED;
      lockedPayment.responseCode = params.vnp_ResponseCode || null;
      lockedPayment.vnpayTransactionNo = params.vnp_TransactionNo || null;
      lockedPayment.paidAt = succeeded ? new Date() : null;
      await manager.save(lockedPayment);
      if (succeeded) {
        record.fineStatus = 'PAID';
        await manager.save(record);
      }
      return false;
    });
    if (alreadyConfirmed) return { RspCode: '02', Message: 'Payment already confirmed' };
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async verifyReturn(params: VnpayParams) {
    const config = this.getConfig();
    if (!this.isValidSignature(params, config.hashSecret) ||
        params.vnp_TmnCode !== config.tmnCode) return 'invalid';
    const payment = await this.paymentRepository.findOneBy({ txnRef: params.vnp_TxnRef });
    if (!payment || Number(params.vnp_Amount) !== Math.round(Number(payment.amount) * 100)) {
      return 'invalid';
    }
    if (payment.status === PaymentStatus.PAID) return 'success';
    if (params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00') {
      return 'processing';
    }
    return 'failed';
  }

  private buildPaymentUrl(
    payment: FinePayment,
    config: ReturnType<PaymentsService['getConfig']>,
    ipAddress: string,
  ) {
    const now = new Date();
    const params: VnpayParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.tmnCode,
      vnp_Amount: String(Math.round(Number(payment.amount) * 100)),
      vnp_CreateDate: this.formatVnpayDate(now),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: this.normalizeIpAddress(ipAddress),
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Nop phat tre han phieu muon ${payment.borrowRecord?.id ?? ''}`.trim(),
      vnp_OrderType: 'other',
      vnp_ReturnUrl: config.returnUrl,
      vnp_TxnRef: payment.txnRef,
      vnp_ExpireDate: this.formatVnpayDate(new Date(now.getTime() + 15 * 60 * 1000)),
    };
    const canonical = this.canonicalQuery(params);
    const signature = createHmac('sha512', config.hashSecret).update(canonical, 'utf8').digest('hex');
    return `${config.paymentUrl}?${canonical}&vnp_SecureHash=${signature}`;
  }

  private isValidSignature(params: VnpayParams, secret: string) {
    const provided = params.vnp_SecureHash;
    if (!provided || !/^[a-fA-F0-9]{128}$/.test(provided)) return false;
    const signed = createHmac('sha512', secret)
      .update(this.canonicalQuery(params), 'utf8')
      .digest();
    const received = Buffer.from(provided, 'hex');
    return received.length === signed.length && timingSafeEqual(received, signed);
  }

  private canonicalQuery(params: VnpayParams) {
    return Object.keys(params)
      .filter((key) => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');
  }

  private getConfig() {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const returnUrl = process.env.VNPAY_RETURN_URL;
    if (!tmnCode || !hashSecret || !returnUrl) {
      throw new ServiceUnavailableException(
        'VNPay chưa được cấu hình: cần VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL',
      );
    }
    const paymentUrl =
      process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    try {
      const parsedPaymentUrl = new URL(paymentUrl);
      const parsedReturnUrl = new URL(returnUrl);
      if (!['http:', 'https:'].includes(parsedPaymentUrl.protocol) ||
          !['http:', 'https:'].includes(parsedReturnUrl.protocol)) throw new Error();
      if (process.env.NODE_ENV === 'production' &&
          (parsedPaymentUrl.protocol !== 'https:' || parsedReturnUrl.protocol !== 'https:')) throw new Error();
    } catch {
      throw new ServiceUnavailableException('URL VNPay phải là URL HTTP(S) hợp lệ; production bắt buộc HTTPS');
    }
    return { tmnCode, hashSecret, returnUrl, paymentUrl };
  }

  private formatVnpayDate(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
  }

  private normalizeIpAddress(ipAddress: string) {
    const normalized = ipAddress?.replace(/^::ffff:/, '');
    return normalized && /^[\da-fA-F:.]{3,45}$/.test(normalized) ? normalized : '127.0.0.1';
  }
}
