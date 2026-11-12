import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { DeviceLoan } from './entities/device-loan.entity';
import { DeviceMaintenance } from './entities/device-maintenance.entity';
import { User } from '../users/entities/user.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, DeviceLoan, DeviceMaintenance, User]),
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}

