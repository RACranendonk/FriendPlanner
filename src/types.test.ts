import { describe, expect, it } from 'vitest';
import { slotForTime } from './types';

describe('slotForTime', () => {
  it('maps times to the matching day-part', () => {
    expect(slotForTime('08:30')).toBe('morning');
    expect(slotForTime('11:59')).toBe('morning');
    expect(slotForTime('12:00')).toBe('afternoon');
    expect(slotForTime('16:59')).toBe('afternoon');
    expect(slotForTime('17:00')).toBe('evening');
    expect(slotForTime('23:30')).toBe('evening');
  });
});
