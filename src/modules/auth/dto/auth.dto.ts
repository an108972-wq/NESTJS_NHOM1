import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  fullName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @Matches(/^(?=(?:\D*\d){9,15}\D*$)[0-9+().\-\s]+$/, {
    message: 'Số điện thoại phải có từ 9 đến 15 chữ số',
  })
  phone: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải chứa ít nhất 6 ký tự' })
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  username?: string;

  @IsOptional()
  @IsString()
  readerGroup?: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  @IsOptional()
  @IsString()
  captchaId?: string;

  @IsOptional()
  @IsString()
  captchaAnswer?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class Verify2faDto {
  @IsString()
  @IsNotEmpty()
  mfaToken: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(10)
  code: string;
}

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  usernameOrEmail: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  usernameOrEmail: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải chứa ít nhất 6 ký tự' })
  newPassword: string;
}

export class Toggle2faDto {
  @IsBoolean()
  enable: boolean;
}
