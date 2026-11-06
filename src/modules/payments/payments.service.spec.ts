import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { DataSource } from 'typeorm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BorrowRecord, BorrowStatus } from '../borrow-records/entities/borrow-record.entity';
import { FinePayment, PaymentStatus } from './entities/payment.entity';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: { findOne: ReturnType<typeof vi.fn> };
  let manager: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let borrowRecord: BorrowRecord;
  const originalConfig = {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    returnUrl: process.env.VNPAY_RETURN_URL,
    paymentUrl: process.env.VNPAY_PAYMENT_URL,
    nodeEnv: process.env.NODE_ENV,
  };

  beforeEach(() => {
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'test-hmac-secret';
    process.env.VNPAY_RETURN_URL = 'https://library.example.test/payments/vnpay/return';
    delete process.env.VNPAY_PAYMENT_URL;
    delete process.env.NODE_ENV;

    borrowRecord = {
      id: 7,
      fineAmount: 12500,
      fineStatus: 'UNPAID',
      status: BorrowStatus.RETURNED,
    } as BorrowRecord;
    const payment = {
      id: 9,
      txnRef: 'payment-reference',
      amount: 12500,
      status: PaymentStatus.INITIATED,
      borrowRecord,
    } as FinePayment;
    paymentRepository = { findOne: vi.fn().mockResolvedValue(payment) };
    manager = {
      findOne: vi.fn().mockImplementation((entity) =>
        Promise.resolve(entity === FinePayment ? payment : borrowRecord),
      ),
      create: vi.fn((_entity, values) => ({ id: 10, createdAt: new Date(), ...values })),
      save: vi.fn(async (entity) => entity),
    };
    const dataSource = {
      transaction: vi.fn((callback) => callback(manager)),
    };
    service = new PaymentsService(
      paymentRepository as any,
      dataSource as unknown as DataSource,
    );
  });

  afterEach(() => {
    for (const [key, value] of Object.entries({
      VNPAY_TMN_CODE: originalConfig.tmnCode,
      VNPAY_HASH_SECRET: originalConfig.hashSecret,
      VNPAY_RETURN_URL: originalConfig.returnUrl,
      VNPAY_PAYMENT_URL: originalConfig.paymentUrl,
      NODE_ENV: originalConfig.nodeEnv,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function sign(params: Record<string, string>) {
    const canonical = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`)
      .join('&');
    return createHmac('sha512', 'test-hmac-secret').update(canonical).digest('hex');
  }

  it('rejects unsigned payment callbacks without modifying the fine', async () => {
    const result = await service.handleIpn({
      vnp_TxnRef: 'payment-reference',
      vnp_SecureHash: 'invalid',
    });

    expect(result.RspCode).toBe('97');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('creates a signed VNPay URL for an authenticated owner', async () => {
    const record = {
      ...borrowRecord,
      user: { id: 5 },
      book: { title: 'Book' },
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : null),
    );

    const result = await service.createFinePayment(7, 5, 'READER', '127.0.0.1');
    const url = new URL(result.paymentUrl);
    const params = Object.fromEntries(url.searchParams.entries());
    const signature = params.vnp_SecureHash;
    delete params.vnp_SecureHash;

    expect(result.amount).toBe(12500);
    expect(params.vnp_Amount).toBe('1250000');
    expect(params.vnp_TmnCode).toBe('TESTCODE');
    expect(signature).toBe(sign(params));
  });

  it('does not allow a reader to pay another reader fine', async () => {
    manager.findOne.mockResolvedValue({
      ...borrowRecord,
      user: { id: 6 },
      book: { title: 'Book' },
    });

    await expect(
      service.createFinePayment(7, 5, 'READER', '127.0.0.1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirms the fine only after a valid, amount-matched successful callback', async () => {
    const params = {
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: 'payment-reference',
      vnp_Amount: '1250000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '987654321',
    };
    const result = await service.handleIpn({ ...params, vnp_SecureHash: sign(params) });

    expect(result.RspCode).toBe('00');
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: PaymentStatus.PAID }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ fineStatus: 'PAID' }),
    );
  });

  it('rejects a callback whose amount does not match the stored payment', async () => {
    const params = {
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: 'payment-reference',
      vnp_Amount: '1',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    };
    const result = await service.handleIpn({ ...params, vnp_SecureHash: sign(params) });

    expect(result.RspCode).toBe('04');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not report success when the fine changed after checkout started', async () => {
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === FinePayment ? {
        id: 9,
        txnRef: 'payment-reference',
        amount: 12500,
        status: PaymentStatus.INITIATED,
        borrowRecord,
      } : { ...borrowRecord, fineAmount: 20000 }),
    );
    const params = {
      vnp_TmnCode: 'TESTCODE',
      vnp_TxnRef: 'payment-reference',
      vnp_Amount: '1250000',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    };

    await expect(
      service.handleIpn({ ...params, vnp_SecureHash: sign(params) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
