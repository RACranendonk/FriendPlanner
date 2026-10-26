import { describe, expect, it } from 'vitest';
import type { Trip } from './types';
import { localToday, slotForTime, splitTripsByDate } from './types';

const trip = (name: string, start: string, end = start) => ({ id: name, name, start, end }) as Trip;
const names = (trips: Trip[]) => trips.map((t) => t.name);
const TODAY = '2027-03-15';

describe('splitTripsByDate', () => {
  it('puts upcoming trips first, soonest on top, regardless of the order they were added', () => {
    const { upcoming } = splitTripsByDate(
      [trip('Summer', '2027-07-10'), trip('Spring', '2027-04-02'), trip('Easter', '2027-03-28')],
      TODAY,
    );
    expect(names(upcoming)).toEqual(['Easter', 'Spring', 'Summer']);
  });

  it('keeps a trip that is underway or ends today with the upcoming ones', () => {
    const { upcoming, past } = splitTripsByDate(
      [trip('Underway', '2027-03-10', '2027-03-20'), trip('Ends today', '2027-03-12', TODAY)],
      TODAY,
    );
    expect(names(upcoming)).toEqual(['Underway', 'Ends today']);
    expect(past).toEqual([]);
  });

  it('moves ended trips to past, most recent first', () => {
    const { upcoming, past } = splitTripsByDate(
      [trip('Long ago', '2025-06-01'), trip('Next', '2027-05-01'), trip('Last month', '2027-02-01', '2027-02-07')],
      TODAY,
    );
    expect(names(upcoming)).toEqual(['Next']);
    expect(names(past)).toEqual(['Last month', 'Long ago']);
  });

  it('breaks ties by name and puts undated trips last among the upcoming', () => {
    const { upcoming } = splitTripsByDate(
      [trip('Undated', '', ''), trip('Beta', '2027-04-01'), trip('Alpha', '2027-04-01')],
      TODAY,
    );
    expect(names(upcoming)).toEqual(['Alpha', 'Beta', 'Undated']);
  });

  it('leaves the input array untouched', () => {
    const input = [trip('B', '2027-05-01'), trip('A', '2027-04-01')];
    splitTripsByDate(input, TODAY);
    expect(names(input)).toEqual(['B', 'A']);
  });
});

describe('localToday', () => {
  it('formats the local calendar date, zero-padded', () => {
    expect(localToday(new Date(2027, 0, 5, 23, 59))).toBe('2027-01-05');
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
