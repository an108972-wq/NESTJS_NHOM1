import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { ReviewsService } from './reviews.service';
import { Review } from './entities/review.entity';

describe('ReviewsService moderation', () => {
  it('updates review visibility', async () => {
    const review = { id: 8, isVisible: true } as Review;
    const reviewRepository = {
      findOne: vi.fn().mockResolvedValue(review),
      save: vi.fn(async (value: Review) => value),
    };
    const service = new ReviewsService(
      reviewRepository as never,
      {} as never,
      {} as never,
    );

    await expect(service.setVisibility(8, false)).resolves.toMatchObject({
      id: 8,
      isVisible: false,
    });
    expect(reviewRepository.save).toHaveBeenCalledWith(review);
  });

  it('rejects moderation for a missing review', async () => {
    const service = new ReviewsService(
      { findOne: vi.fn().mockResolvedValue(null) } as never,
      {} as never,
      {} as never,
    );

    await expect(service.setVisibility(404, true)).rejects.toBeInstanceOf(NotFoundException);
  });
});
