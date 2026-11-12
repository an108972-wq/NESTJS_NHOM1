import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreatePublisherDto } from './create-publisher.dto';

describe('CreatePublisherDto', () => {
  it('trims and accepts a valid publisher name, email, and phone', () => {
    const dto = plainToInstance(CreatePublisherDto, {
      name: '  Nhà xuất bản A  ',
      email: 'contact@example.test',
      phone: '+84 (28) 1234-5678',
    });

    expect(dto.name).toBe('Nhà xuất bản A');
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects short names, malformed email, and invalid phone numbers', () => {
    const dto = plainToInstance(CreatePublisherDto, {
      name: ' x ',
      email: 'not-an-email',
      phone: 'abcdefg',
    });

    expect(validateSync(dto).map(({ property }) => property)).toEqual(
      expect.arrayContaining(['name', 'email', 'phone']),
    );
  });

  it('accepts extended partner details: taxCode, qualityRating, discountRate and reputationNotes', () => {
    const dto = plainToInstance(CreatePublisherDto, {
      name: 'NXB Giáo Dục',
      taxCode: '0101234567',
      contactPerson: 'Nguyễn Văn A',
      qualityRating: 5,
      deliverySpeed: 'FAST',
      discountRate: 25.5,
      reputationNotes: 'Đối tác chiến lược cung cấp sách giáo trình đúng hạn',
    });

    expect(dto.taxCode).toBe('0101234567');
    expect(dto.qualityRating).toBe(5);
    expect(dto.discountRate).toBe(25.5);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects invalid rating and discount out of bounds', () => {
    const dto = plainToInstance(CreatePublisherDto, {
      name: 'NXB Lỗi',
      qualityRating: 6,
      discountRate: 150,
    });

    const errors = validateSync(dto);
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['qualityRating', 'discountRate']),
    );
  });
});
