import { describe, expect, it } from 'vitest';
import { emptyDayMessage } from './copy';

describe('emptyDayMessage', () => {
  it('is deterministic for the same seed', () => {
    expect(emptyDayMessage('trip-1:2026-08-01')).toBe(emptyDayMessage('trip-1:2026-08-01'));
  });

  it('varies across seeds', () => {
    const days = Array.from({ length: 14 }, (_, i) => `trip-1:2026-08-${String(i + 1).padStart(2, '0')}`);
    expect(new Set(days.map(emptyDayMessage)).size).toBeGreaterThan(1);
  });
});
