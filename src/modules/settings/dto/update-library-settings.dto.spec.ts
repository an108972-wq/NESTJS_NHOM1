import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateLibrarySettingsDto } from './update-library-settings.dto';

describe('UpdateLibrarySettingsDto', () => {
  it('accepts a renewal interval between 7 and 14 days', () => {
    const dto = plainToInstance(UpdateLibrarySettingsDto, { renewalDays: '7' });

    expect(dto.renewalDays).toBe(7);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it.each([6, 15])('rejects a renewal interval of %i days', (renewalDays) => {
    const dto = plainToInstance(UpdateLibrarySettingsDto, { renewalDays });

    expect(validateSync(dto).some(({ property }) => property === 'renewalDays')).toBe(true);
  });

  it('validates optional SMS OTP configuration parameters', () => {
    const dto = plainToInstance(UpdateLibrarySettingsDto, {
      smsProvider: 'ESMS',
      smsApiKey: 'key-12345',
      smsApiSecret: 'secret-67890',
      smsBrandName: 'THUVIEN_UNI',
      enableSmsOtp: true,
    });
    expect(dto.smsProvider).toBe('ESMS');
    expect(dto.enableSmsOtp).toBe(true);
    expect(validateSync(dto)).toHaveLength(0);
  });
});
