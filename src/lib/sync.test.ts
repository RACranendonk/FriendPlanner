import { describe, expect, it } from 'vitest';
import { STALE_RESEED_SECONDS, isStale } from './sync';

describe('isStale', () => {
  const nowMs = 1_750_000_000_000;

  it('treats a missing relay copy as stale', () => {
    expect(isStale(0, nowMs)).toBe(true);
  });

  it('leaves fresh copies alone — an active group never re-seeds', () => {
    expect(isStale(nowMs / 1000 - 3600, nowMs)).toBe(false);
    expect(isStale(nowMs / 1000 - STALE_RESEED_SECONDS + 60, nowMs)).toBe(false);
  });

  it('flags copies older than the one-week threshold', () => {
    expect(isStale(nowMs / 1000 - STALE_RESEED_SECONDS - 60, nowMs)).toBe(true);
  });
});
