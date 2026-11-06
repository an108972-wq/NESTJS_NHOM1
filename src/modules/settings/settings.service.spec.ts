import { SettingsService } from './settings.service';
import { vi } from 'vitest';

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
});
