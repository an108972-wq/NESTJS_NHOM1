import { SettingsService } from './settings.service';
import { vi, describe, expect, it } from 'vitest';

describe('SettingsService', () => {
  const defaultSettings = {
    id: 1,
    maxActiveLoans: 5,
    borrowDays: 14,
    renewalDays: 14,
    dailyFineRate: 5000,
  };

  it('returns library defaults before settings are first saved', async () => {
    const repository = { findOneBy: vi.fn().mockResolvedValue(null), save: vi.fn() };
    const service = new SettingsService(repository as never);

    await expect(service.getSettings()).resolves.toMatchObject(defaultSettings);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('persists partial updates while retaining unspecified settings', async () => {
    const repository = {
      findOneBy: vi.fn().mockResolvedValue({ ...defaultSettings }),
      save: vi.fn(async (value) => value),
    };
    const service = new SettingsService(repository as never);

    await expect(service.updateSettings({ dailyFineRate: 7000 })).resolves.toMatchObject({
      ...defaultSettings,
      dailyFineRate: 7000,
    });
  });

  it('persists the configured renewal interval', async () => {
    const repository = {
      findOneBy: vi.fn().mockResolvedValue({ ...defaultSettings }),
      save: vi.fn(async (value) => value),
    };
    const service = new SettingsService(repository as never);

    await expect(service.updateSettings({ renewalDays: 7 })).resolves.toMatchObject({
      ...defaultSettings,
      renewalDays: 7,
    });
  });

  it('executes triggerAutomationRules and returns summary', async () => {
    const repository = {
      findOneBy: vi.fn().mockResolvedValue({ ...defaultSettings, autoLockOverdueDays: 30, enableAutoLockOverdue: true }),
    };
    const mockBorrowRepo = {
      find: vi.fn().mockResolvedValue([{ id: 1, user: { id: 99, isActive: true } }]),
      createQueryBuilder: vi.fn().mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      }),
    };
    const mockUserRepo = { update: vi.fn().mockResolvedValue({ affected: 1 }) };
    const service = new SettingsService(
      repository as never,
      undefined,
      mockUserRepo as never,
      mockBorrowRepo as never,
    );

    const result = await service.triggerAutomationRules();
    expect(result.success).toBe(true);
    expect(result.lockedCount).toBe(1);
    expect(mockUserRepo.update).toHaveBeenCalled();
  });

  it('generates database backup SQL and updates lastBackupAt', async () => {
    const repository = {
      findOneBy: vi.fn().mockResolvedValue({ ...defaultSettings }),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    const mockDataSource = {
      query: vi.fn().mockImplementation((query: string) => {
        if (query.includes('library_settings')) return Promise.resolve([{ id: 1, maxActiveLoans: 5 }]);
        return Promise.resolve([]);
      }),
    };
    const service = new SettingsService(repository as never, mockDataSource as never);

    const backup = await service.generateDatabaseBackupSql();
    expect(backup.filename).toMatch(/^library_backup_\d+\.sql$/);
    expect(backup.sql).toContain('INSERT INTO `library_settings`');
    expect(repository.update).toHaveBeenCalled();
  });
});
