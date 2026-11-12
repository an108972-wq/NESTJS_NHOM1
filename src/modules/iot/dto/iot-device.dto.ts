import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { IotDeviceStatus, IotDeviceType } from '../entities/iot-device.entity';

export class CreateIotDeviceDto {
  @IsString()
  deviceCode: string;

  @IsString()
  name: string;

  @IsEnum(IotDeviceType)
  @IsOptional()
  type?: IotDeviceType;

  @IsString()
  location: string;

  @IsEnum(IotDeviceStatus)
  @IsOptional()
  status?: IotDeviceStatus;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  macAddress?: string;

  @IsString()
  @IsOptional()
  firmwareVersion?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  humidity?: number;

  @IsBoolean()
  @IsOptional()
  powerState?: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateIotDeviceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(IotDeviceType)
  @IsOptional()
  type?: IotDeviceType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(IotDeviceStatus)
  @IsOptional()
  status?: IotDeviceStatus;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  humidity?: number;

  @IsBoolean()
  @IsOptional()
  powerState?: boolean;

  @IsString()
  @IsOptional()
  note?: string;
}

export class DeviceActionDto {
  @IsString()
  action: 'TOGGLE_POWER' | 'TRIGGER_ALARM_TEST' | 'REBOOT' | 'CALIBRATE';
}

