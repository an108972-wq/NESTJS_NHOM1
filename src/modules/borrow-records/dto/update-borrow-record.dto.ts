import { PartialType } from '@nestjs/mapped-types';
import { ReturnBorrowRecordDto } from './create-borrow-record.dto';

export class UpdateBorrowRecordDto extends PartialType(ReturnBorrowRecordDto) {}
