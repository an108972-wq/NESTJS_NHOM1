import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeGrant, Seminar } from './entities/academic-exchange.entity';
import { AcademicExchangeService } from './academic-exchange.service';
import { AcademicExchangeController } from './academic-exchange.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Seminar, ExchangeGrant])],
  controllers: [AcademicExchangeController],
  providers: [AcademicExchangeService],
  exports: [AcademicExchangeService],
})
export class AcademicExchangeModule {}

