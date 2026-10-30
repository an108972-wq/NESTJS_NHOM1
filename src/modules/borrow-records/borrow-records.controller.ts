import { Controller, Post, Get, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { BorrowRecordsService } from './borrow-records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('borrow')
@UseGuards(JwtAuthGuard)
export class BorrowRecordsController {
  constructor(private readonly borrowService: BorrowRecordsService) {}

  @Get()
  findAll() {
    return this.borrowService.findAll();
  }

  @Post(':bookId')
  borrow(@Request() req: any, @Param('bookId', ParseIntPipe) bookId: number) {
    return this.borrowService.borrowBook(req.user.userId, bookId);
  }

  @Post('return/:recordId')
  returnBook(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.borrowService.returnBook(recordId);
  }

  @Post('pay-fine/:recordId')
  payFine(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.borrowService.payFine(recordId);
  }
}