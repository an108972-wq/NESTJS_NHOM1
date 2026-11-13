import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IotDevice } from './entities/iot-device.entity';
import { IotAlert } from './entities/iot-alert.entity';
import { IotService } from './iot.service';
import { IotController } from './iot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IotDevice, IotAlert])],
  controllers: [IotController],
  providers: [IotService],
  exports: [IotService],
})
export class IotModule {}

