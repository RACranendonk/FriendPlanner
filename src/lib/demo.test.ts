import { describe, expect, it } from 'vitest';
import { createDemoTrip } from './demo';
import { tripDays } from '../types';

describe('createDemoTrip', () => {
  it('produces a valid trip: unique ids, days inside the trip range', () => {
    const trip = createDemoTrip();
    const days = tripDays(trip);
    expect(days.length).toBe(4);
    const ids = trip.activities.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const act of trip.activities) {
      expect(act.day === null || days.includes(act.day)).toBe(true);
      expect(act.title).not.toBe('');
    }
  });

  it('demos the newer mechanics: comments, a departure time, and a stays race', () => {
    const trip = createDemoTrip();
    expect(trip.activities.some((a) => (a.comments ?? []).length > 0)).toBe(true);
    expect(trip.activities.some((a) => a.time)).toBe(true);
    expect(trip.stays!.length).toBeGreaterThanOrEqual(2);
    expect(trip.stays!.every((s) => !s.deleted)).toBe(true);
    expect(trip.stays!.some((s) => s.comments.length > 0)).toBe(true);
    const voteCounts = trip.stays!.map((s) => Object.values(s.votes).filter((v) => v.in).length);
    expect(Math.max(...voteCounts)).toBeGreaterThan(Math.min(...voteCounts));
  });

  it('gives every generated trip a fresh identity so demo trips never sync into each other', () => {
    expect(createDemoTrip().id).not.toBe(createDemoTrip().id);
  });

  it('shows a same-slot split: two activities on one day and slot with different people going', () => {
    const trip = createDemoTrip();
    const going = (title: string) => {
      const act = trip.activities.find((a) => a.title.includes(title))!;
      return Object.entries(act.votes)
        .filter(([, v]) => v.in)
        .map(([name]) => name)
        .sort();
    };
    const hikers = going('Coastal hike');
    const culture = going('Uffizi');
    expect(hikers.length).toBeGreaterThan(0);
    expect(culture.length).toBeGreaterThan(0);
    expect(hikers.filter((p) => culture.includes(p))).toEqual([]);
  });
});
