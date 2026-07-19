import { describe, expect, it } from 'vitest';
import { LLAMA_TAPS, tapStreak } from './easteregg';

describe('tapStreak', () => {
  it('accumulates taps inside the window up to the trigger count', () => {
    let taps: number[] = [];
    for (let i = 0; i < LLAMA_TAPS; i++) taps = tapStreak(taps, 1000 + i * 400);
    expect(taps.length).toBe(LLAMA_TAPS);
  });

  it('drops taps older than the window, so slow tapping never triggers', () => {
    let taps: number[] = [];
    for (let i = 0; i < 10; i++) taps = tapStreak(taps, i * 4000);
    expect(taps.length).toBe(1);
  });
});
