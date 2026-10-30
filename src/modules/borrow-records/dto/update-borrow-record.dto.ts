import { PartialType } from '@nestjs/mapped-types';
import { CreateBorrowRecordDto } from './create-borrow-record.dto.js';

export class UpdateBorrowRecordDto extends PartialType(CreateBorrowRecordDto) {}
