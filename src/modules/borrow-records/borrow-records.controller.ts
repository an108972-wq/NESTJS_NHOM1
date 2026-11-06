import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ReturnBorrowRecordDto,
  StaffBarcodeBorrowBatchDto,
  StaffBarcodeBorrowDto,
} from './dto/create-borrow-record.dto';
import { CreateManualFineDto } from './dto/create-manual-fine.dto';
import { CollectFineDto } from './dto/collect-fine.dto';
import { WaiveFineDto } from './dto/waive-fine.dto';
import { PaymentMethod } from '../payments/entities/payment.entity';
import { BorrowRecordsService } from './borrow-records.service';

@Controller('borrow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BorrowRecordsController {
  constructor(private readonly borrowService: BorrowRecordsService) {}

  @Get()
  @Roles(...COUNTER_ROLES)
  findAll() {
    return this.borrowService.findAll();
  }

  @Get('mine')
  @Roles(...STAFF_ROLES, UserRole.READER)
  findMine(@Request() req: any) {
    return this.borrowService.findMine(req.user.userId);
  }

  @Post('staff-barcode')
  @Roles(...COUNTER_ROLES)
  borrowForReader(@Body() dto: StaffBarcodeBorrowDto) {
    return this.borrowService.borrowByBarcode(dto.userId, dto.barcode);
  }

  @Post('staff-barcodes')
  @Roles(...COUNTER_ROLES)
  borrowMultipleForReader(@Body() dto: StaffBarcodeBorrowBatchDto) {
    return this.borrowService.borrowManyByBarcodes(dto.userId, dto.barcodes);
  }

  @Get('fines')
  @Roles(...COUNTER_ROLES)
  findFines() {
    return this.borrowService.findFines();
  }

  @Post('fines/manual')
  @Roles(...COUNTER_ROLES)
  createManualFine(@Body() dto: CreateManualFineDto, @Request() req: any) {
    return this.borrowService.createManualFine(dto, req.user.userId);
  }

  @Post('fines/manual/:fineId/pay')
  @Roles(...COUNTER_ROLES)
  collectManualFine(
    @Param('fineId', ParseIntPipe) fineId: number,
    @Body() dto: CollectFineDto,
  ) {
    return this.borrowService.collectManualFine(fineId, dto.paymentMethod, dto.txnRef);
  }

  @Post('fines/manual/:fineId/waive')
  @Roles(...COUNTER_ROLES)
  waiveManualFine(
    @Param('fineId', ParseIntPipe) fineId: number,
    @Body() dto: WaiveFineDto,
    @Request() req: any,
  ) {
    return this.borrowService.waiveFine(
      'MANUAL',
      fineId,
      dto.amount,
      dto.reason,
      req.user.userId,
    );
  }

  @Post('fines/borrow/:recordId/waive')
  @Roles(...COUNTER_ROLES)
  waiveBorrowFine(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: WaiveFineDto,
    @Request() req: any,
  ) {
    return this.borrowService.waiveFine(
      'BORROW',
      recordId,
      dto.amount,
      dto.reason,
      req.user.userId,
    );
  }

  @Post(':bookId')
  @Roles(...STAFF_ROLES, UserRole.READER)
  borrow(@Request() req: any, @Param('bookId', ParseIntPipe) bookId: number) {
    return this.borrowService.borrowBook(req.user.userId, bookId);
  }

  @Post('barcode/:barcode')
  @Roles(...STAFF_ROLES, UserRole.READER)
  borrowByBarcode(@Request() req: any, @Param('barcode') barcode: string) {
    return this.borrowService.borrowByBarcode(req.user.userId, barcode);
  }

  @Post(':recordId/approve')
  @Roles(...COUNTER_ROLES)
  approve(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.borrowService.approve(recordId);
  }

  @Post(':recordId/reject')
  @Roles(...COUNTER_ROLES)
  reject(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.borrowService.reject(recordId);
  }

  @Post(':recordId/extend')
  @Roles(...COUNTER_ROLES, UserRole.READER)
  extend(@Param('recordId', ParseIntPipe) recordId: number, @Request() req: any) {
    const isStaff = COUNTER_ROLES.includes(req.user.role);
    return this.borrowService.extend(recordId, req.user.userId, isStaff);
  }

  @Post(':recordId/renew')
  @Roles(...COUNTER_ROLES, UserRole.READER)
  renew(@Param('recordId', ParseIntPipe) recordId: number, @Request() req: any) {
    const isStaff = COUNTER_ROLES.includes(req.user.role);
    return this.borrowService.extend(recordId, req.user.userId, isStaff);
  }

  @Post('return/:recordId')
  @Roles(...COUNTER_ROLES)
  returnBook(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Body() dto: ReturnBorrowRecordDto,
  ) {
    return this.borrowService.returnBook(
      recordId,
      dto.condition,
      dto.damageFineAmount,
      dto.collectFineAtCounter,
    );
  }

  @Post('return/barcode/:barcode')
  @Roles(...COUNTER_ROLES)
  returnByBarcode(
    @Param('barcode') barcode: string,
    @Body() dto: ReturnBorrowRecordDto,
  ) {
    return this.borrowService.returnByBarcode(
      barcode,
      dto.condition,
      dto.damageFineAmount,
      dto.collectFineAtCounter,
    );
  }

  @Post('pay-fine/:recordId')
  @Roles(...COUNTER_ROLES)
  payFine(
    @Param('recordId', ParseIntPipe) recordId: number,
    @Request() req: any,
    @Body() dto?: CollectFineDto,
  ) {
    return this.borrowService.payFine(
      recordId,
      req.user.userId,
      STAFF_ROLES.includes(req.user.role),
      dto?.paymentMethod || PaymentMethod.CASH,
      dto?.txnRef,
    );
  }
}
