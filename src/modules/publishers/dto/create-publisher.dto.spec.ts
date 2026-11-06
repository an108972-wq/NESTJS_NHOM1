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
});
