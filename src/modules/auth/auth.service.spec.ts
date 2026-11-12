import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { vi, describe, it, expect } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/constants/user-role';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';

describe('AuthService registration', () => {
  const registration = {
    fullName: 'Nguyen Van A',
    email: ' Reader@Example.com ',
    phone: '0901234567',
    password: 'strong-password',
  } satisfies RegisterDto;

  it('creates an inactive reader account pending approval', async () => {
    const usersRepository = {
      findOneBy: vi.fn().mockResolvedValue(null),
      create: vi.fn((user) => user),
      save: vi.fn(async (user) => user),
    };
    const service = new AuthService(usersRepository as never, {} as never);

    await expect(service.register(registration)).resolves.toMatchObject({
      message: expect.stringContaining('chờ thư viện duyệt'),
    });
    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'reader@example.com',
        fullName: 'Nguyen Van A',
        email: 'reader@example.com',
        phone: '0901234567',
        role: UserRole.READER,
        isActive: false,
        passwordHash: expect.not.stringContaining('strong-password'),
      }),
    );
  });

  it('rejects registration with an existing email', async () => {
    const usersRepository = {
      findOneBy: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 2 }),
      create: vi.fn(),
      save: vi.fn(),
    };
    const service = new AuthService(usersRepository as never, {} as never);

    await expect(service.register(registration)).rejects.toBeInstanceOf(BadRequestException);
    expect(usersRepository.save).not.toHaveBeenCalled();
  });
});

describe('AuthService Security & 2FA & Brute-force & Forgot Password', () => {
  it('generates math captcha correctly', () => {
    const service = new AuthService({} as never, {} as never);
    const captcha = service.getCaptcha();
    expect(captcha.captchaId).toBeDefined();
    expect(captcha.question).toMatch(/\d+ \+ \d+ = \?/);
  });

  it('handles forgot password and generates 6-digit OTP', async () => {
    const mockUser = {
      id: 1,
      username: 'reader1',
      email: 'reader1@example.com',
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    };
    const usersRepository = {
      findOne: vi.fn().mockResolvedValue(mockUser),
      save: vi.fn().mockResolvedValue(mockUser),
    };
    const service = new AuthService(usersRepository as never, {} as never);

    const result = await service.forgotPassword({ usernameOrEmail: 'reader1' });
    expect(result.message).toContain('hiệu lực 10 phút');
    expect(result.debugOtp).toMatch(/^\d{6}$/);
    expect(mockUser.passwordResetToken).toBe(result.debugOtp);
  });

  it('resets password successfully with valid OTP', async () => {
    const mockUser = {
      id: 1,
      username: 'reader1',
      email: 'reader1@example.com',
      passwordResetToken: '123456',
      passwordResetExpiresAt: new Date(Date.now() + 500000),
      passwordHash: 'oldHash',
    };
    const usersRepository = {
      findOne: vi.fn().mockResolvedValue(mockUser),
      save: vi.fn().mockResolvedValue(mockUser),
    };
    const service = new AuthService(usersRepository as never, {} as never);

    const res = await service.resetPassword({
      usernameOrEmail: 'reader1',
      otp: '123456',
      newPassword: 'new-strong-password',
    });
    expect(res.message).toContain('thành công');
    expect(mockUser.passwordResetToken).toBeNull();
  });

  it('requires 2FA when two-factor authentication is enabled during login', async () => {
    const hash = await bcrypt.hash('adminPassword123!', 10);
    const mockAdmin = {
      id: 1,
      username: 'admin',
      email: 'admin@library.edu.vn',
      role: UserRole.ADMIN,
      isActive: true,
      isTwoFactorEnabled: true,
      passwordHash: hash,
      failedLoginAttempts: 0,
    };
    const usersRepository = {
      findOne: vi.fn().mockResolvedValue(mockAdmin),
      save: vi.fn().mockResolvedValue(mockAdmin),
    };
    const jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-mfa-token'),
    };
    const service = new AuthService(usersRepository as never, jwtService as never);

    const loginRes = await service.login({
      username: 'admin',
      password: 'adminPassword123!',
    });

    expect(loginRes).toMatchObject({
      requiresMfa: true,
      mfaToken: 'mock-mfa-token',
    });
  });

  it('locks account after 5 consecutive failed login attempts', async () => {
    const hash = await bcrypt.hash('correctPassword123!', 10);
    const mockUser = {
      id: 2,
      username: 'testreader',
      role: UserRole.READER,
      isActive: true,
      passwordHash: hash,
      failedLoginAttempts: 4,
      lockoutUntil: null,
    };
    const usersRepository = {
      findOne: vi.fn().mockResolvedValue(mockUser),
      save: vi.fn().mockResolvedValue(mockUser),
    };
    const service = new AuthService(usersRepository as never, {} as never);

    const captcha = service.getCaptcha();
    const [num1, num2] = captcha.question.replace(' = ?', '').split(' + ').map(Number);

    await expect(
      service.login({
        username: 'testreader',
        password: 'wrongPassword',
        captchaId: captcha.captchaId,
        captchaAnswer: String(num1 + num2),
      }),
    ).rejects.toThrowError(/tạm khóa 15 phút/);

    expect(mockUser.failedLoginAttempts).toBe(5);
    expect(mockUser.lockoutUntil).toBeInstanceOf(Date);
  });
});
