import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLibraryCardExpired } from './library-card';

describe('isLibraryCardExpired', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles SQL date strings and Date instances without lexically comparing Date.toString()', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1, 12));

    expect(isLibraryCardExpired('2026-10-31')).toBe(true);
    expect(isLibraryCardExpired(new Date(2026, 9, 31, 12))).toBe(true);
  });

  it('keeps a card valid through its expiry date and treats no expiry as unlimited', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1, 12));

    expect(isLibraryCardExpired('2026-11-01')).toBe(false);
    expect(isLibraryCardExpired(null)).toBe(false);
  });
});
