import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
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
