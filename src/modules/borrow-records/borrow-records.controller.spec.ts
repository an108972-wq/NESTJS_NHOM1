import { Test, TestingModule } from '@nestjs/testing';
import { BorrowRecordsController } from './borrow-records.controller.js';
import { BorrowRecordsService } from './borrow-records.service.js';
import {
  ReturnBorrowRecordDto,
  StaffBarcodeBorrowBatchDto,
  StaffBarcodeBorrowDto,
} from './dto/create-borrow-record.dto';
import { vi } from 'vitest';
import { CreateManualFineDto } from './dto/create-manual-fine.dto';
import { CollectFineDto } from './dto/collect-fine.dto';
import { WaiveFineDto } from './dto/waive-fine.dto';

describe('BorrowRecordsController', () => {
  let controller: BorrowRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: {} }],
    }).compile();

    controller = module.get<BorrowRecordsController>(BorrowRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates the staff barcode borrow request for the selected reader', async () => {
    const borrowByBarcode = vi.fn().mockResolvedValue({ id: 12, status: 'PENDING' });
    const module = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: { borrowByBarcode } }],
    }).compile();
    const staffController = module.get<BorrowRecordsController>(BorrowRecordsController);

    await staffController.borrowForReader({ userId: 7, barcode: 'COPY-9' } as StaffBarcodeBorrowDto);

    expect(borrowByBarcode).toHaveBeenCalledWith(7, 'COPY-9');
  });

  it('creates one atomic staff request from multiple scanned copies', async () => {
    const borrowManyByBarcodes = vi.fn().mockResolvedValue([{ id: 12 }, { id: 13 }]);
    const module = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: { borrowManyByBarcodes } }],
    }).compile();
    const staffController = module.get<BorrowRecordsController>(BorrowRecordsController);

    await staffController.borrowMultipleForReader({
      userId: 7,
      barcodes: ['COPY-8', 'COPY-9'],
    } as StaffBarcodeBorrowBatchDto);

    expect(borrowManyByBarcodes).toHaveBeenCalledWith(7, ['COPY-8', 'COPY-9']);
  });

  it('passes counter collection choice through the return endpoint', async () => {
    const returnBook = vi.fn().mockResolvedValue({ id: 12, fineStatus: 'PAID' });
    const module = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: { returnBook } }],
    }).compile();
    const staffController = module.get<BorrowRecordsController>(BorrowRecordsController);

    await staffController.returnBook(12, {
      condition: 'NORMAL',
      collectFineAtCounter: true,
    } as ReturnBorrowRecordDto);

    expect(returnBook).toHaveBeenCalledWith(12, 'NORMAL', undefined, true);
  });

  it('creates a manual fine with the authenticated staff member as its issuer', async () => {
    const createManualFine = vi.fn().mockResolvedValue({ id: 20 });
    const module = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: { createManualFine } }],
    }).compile();
    const staffController = module.get<BorrowRecordsController>(BorrowRecordsController);
    const dto = { userId: 7, type: 'DAMAGED', fineAmount: 20_000 } as CreateManualFineDto;

    await staffController.createManualFine(dto, { user: { userId: 3 } });

    expect(createManualFine).toHaveBeenCalledWith(dto, 3);
  });

  it('passes payment method and transfer reference to the manual fine ledger', async () => {
    const collectManualFine = vi.fn().mockResolvedValue({ id: 30 });
    const module = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: { collectManualFine } }],
    }).compile();
    const staffController = module.get<BorrowRecordsController>(BorrowRecordsController);
    const dto = { paymentMethod: 'VIETQR', txnRef: 'THU-MANUAL-20-abc' } as CollectFineDto;

    await staffController.collectManualFine(20, dto);

    expect(collectManualFine).toHaveBeenCalledWith(20, 'VIETQR', 'THU-MANUAL-20-abc');
  });

  it('passes the staff identity and reason when waiving a fine', async () => {
    const waiveFine = vi.fn().mockResolvedValue({ fineAmount: 5_000 });
    const module = await Test.createTestingModule({
      controllers: [BorrowRecordsController],
      providers: [{ provide: BorrowRecordsService, useValue: { waiveFine } }],
    }).compile();
    const staffController = module.get<BorrowRecordsController>(BorrowRecordsController);
    const dto = { amount: 5_000, reason: 'Có xác nhận đặc biệt' } as WaiveFineDto;

    await staffController.waiveBorrowFine(12, dto, { user: { userId: 3 } });

    expect(waiveFine).toHaveBeenCalledWith('BORROW', 12, 5_000, 'Có xác nhận đặc biệt', 3);
  });
});
