import { describe, expect, it } from 'vitest';
import type { Trip } from './types';
import { slotForTime, sortTripsByStart } from './types';

const trip = (name: string, start: string) => ({ id: name, name, start }) as Trip;

describe('sortTripsByStart', () => {
  it('orders trips by start date regardless of the order they were added', () => {
    const sorted = sortTripsByStart([trip('Summer', '2027-07-10'), trip('Spring', '2027-04-02'), trip('Winter', '2026-12-20')]);
    expect(sorted.map((t) => t.name)).toEqual(['Winter', 'Spring', 'Summer']);
  });

  it('breaks ties by name and puts trips without a start date last', () => {
    const sorted = sortTripsByStart([trip('Undated', ''), trip('Beta', '2027-01-01'), trip('Alpha', '2027-01-01')]);
    expect(sorted.map((t) => t.name)).toEqual(['Alpha', 'Beta', 'Undated']);
  });

  it('leaves the input array untouched', () => {
    const input = [trip('B', '2027-02-01'), trip('A', '2027-01-01')];
    sortTripsByStart(input);
    expect(input.map((t) => t.name)).toEqual(['B', 'A']);
  });
});

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
