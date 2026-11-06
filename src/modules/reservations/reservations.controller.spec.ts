import { Test } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { CreateStaffReservationDto } from './dto/create-staff-reservation.dto';
import { vi } from 'vitest';

describe('ReservationsController', () => {
  it('creates a counter reservation for the selected reader and book', async () => {
    const reserve = vi.fn().mockResolvedValue({ id: 12 });
    const module = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [{ provide: ReservationsService, useValue: { reserve } }],
    }).compile();
    const staffController = module.get<ReservationsController>(ReservationsController);

    await staffController.createForReader({ userId: 7, bookId: 3 } as CreateStaffReservationDto);

    expect(reserve).toHaveBeenCalledWith(7, 3);
  });

  it('marks a queued reservation ready', async () => {
    const markReady = vi.fn().mockResolvedValue({ id: 12, status: 'READY' });
    const module = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [{ provide: ReservationsService, useValue: { markReady } }],
    }).compile();
    const staffController = module.get<ReservationsController>(ReservationsController);

    await staffController.markReady(12);

    expect(markReady).toHaveBeenCalledWith(12);
  });
});
