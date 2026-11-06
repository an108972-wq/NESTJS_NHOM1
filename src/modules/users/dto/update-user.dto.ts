import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { UserRole } from '../../../common/constants/user-role';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?=(?:\D*\d){9,15}\D*$)[0-9+().\-\s]+$/)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxActiveLoans?: number;

  @IsOptional()
  @IsDateString()
  libraryCardIssuedAt?: string | null;

  @IsOptional()
  @IsDateString()
  libraryCardExpiresAt?: string | null;
}
