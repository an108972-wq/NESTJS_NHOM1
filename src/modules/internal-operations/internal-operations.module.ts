import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftSchedule, StaffKpi } from './entities/internal-operation.entity';
import { InternalOperationsService } from './internal-operations.service';
import { InternalOperationsController } from './internal-operations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftSchedule, StaffKpi])],
  controllers: [InternalOperationsController],
  providers: [InternalOperationsService],
  exports: [InternalOperationsService],
})
export class InternalOperationsModule {}

