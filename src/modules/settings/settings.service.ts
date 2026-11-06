import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateLibrarySettingsDto } from './dto/update-library-settings.dto';
import { LibrarySettings } from './entities/library-settings.entity';

const DEFAULT_SETTINGS = Object.freeze({
  id: 1,
  maxActiveLoans: 5,
  borrowDays: 14,
  renewalDays: 14,
  dailyFineRate: 5000,
});

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(LibrarySettings)
    private readonly settingsRepository: Repository<LibrarySettings>,
  ) {}

  async getSettings() {
    const settings = await this.settingsRepository.findOneBy({ id: 1 });
    return settings ?? { ...DEFAULT_SETTINGS, updatedAt: null };
  }

  async updateSettings(dto: UpdateLibrarySettingsDto) {
    const current = await this.getSettings();
    const { updatedAt: _updatedAt, ...settings } = current;
    return this.settingsRepository.save({
      ...settings,
      ...dto,
      id: 1,
    });
  }
}
