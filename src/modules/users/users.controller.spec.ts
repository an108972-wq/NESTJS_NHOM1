import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../../common/constants/user-role';
import { vi } from 'vitest';

describe('UsersController', () => {
  let controller: UsersController;
  let findProfile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findProfile = vi.fn().mockResolvedValue({ user: { id: 10 } });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: { findProfile } }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('does not let a librarian grant staff roles', () => {
    expect(() =>
      controller.create(
        { username: 'staff', password: 'password', role: UserRole.LIBRARIAN },
        { user: { role: UserRole.LIBRARIAN } },
      ),
    ).toThrow(ForbiddenException);
  });

  it('does not let a librarian change a role', () => {
    expect(() =>
      controller.update(
        3,
        { role: UserRole.ADMIN },
        { user: { role: UserRole.LIBRARIAN } },
      ),
    ).toThrow(ForbiddenException);
  });

  it('only lets readers access their own profile history', async () => {
    await expect(
      controller.findProfile(10, { user: { userId: 11, role: UserRole.READER } }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows a reader to request their own profile', async () => {
    await expect(
      controller.findProfile(10, { user: { userId: 10, role: UserRole.READER } }),
    ).resolves.toEqual({ user: { id: 10 } });
    expect(findProfile).toHaveBeenCalledWith(10);
  });
});
