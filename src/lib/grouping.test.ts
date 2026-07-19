import { describe, expect, it } from 'vitest';
import { groupActivities } from './grouping';
import type { Activity, Trip } from '../types';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: crypto.randomUUID(),
    title: 'Hike',
    category: 'hike',
    day: null,
    slot: 'allday',
    locationName: '',
    locationUrl: '',
    notes: '',
    votes: {},
    createdBy: 'Alex',
    updatedAt: 1,
    ...overrides,
  };
}

function makeTrip(activities: Activity[]): Trip {
  return {
    id: 'trip-1',
    name: 'Trip',
    destination: '',
    start: '2026-08-01',
    end: '2026-08-03',
    updatedAt: 1,
    activities,
  };
}

describe('groupActivities', () => {
  it('puts the unscheduled bucket first, then every trip day in order', () => {
    const trip = makeTrip([
      makeActivity({ day: '2026-08-02', title: 'Museum' }),
      makeActivity({ day: null, title: 'Wine tasting' }),
    ]);
    const groups = groupActivities(trip);
    expect(groups.map((g) => g.day)).toEqual([null, '2026-08-01', '2026-08-02', '2026-08-03']);
    expect(groups[0].items.map((a) => a.title)).toEqual(['Wine tasting']);
  });

  it('sorts a day by popularity first, then time slot, then title', () => {
    const votes = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`P${i}`, { in: true, ts: 1 }]));
    const trip = makeTrip([
      makeActivity({ day: '2026-08-01', slot: 'morning', title: 'Hike', votes: votes(1) }),
      makeActivity({ day: '2026-08-01', slot: 'evening', title: 'Dinner', votes: votes(3) }),
      makeActivity({ day: '2026-08-01', slot: 'morning', title: 'Boat trip' }),
    ]);
    const [, first] = groupActivities(trip);
    expect(first.items.map((a) => a.title)).toEqual(['Dinner', 'Hike', 'Boat trip']);
  });

  it('marks a unique most-joined activity as topId, but not on ties or all-zero groups', () => {
    const votes = (n: number) =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`P${i}`, { in: true, ts: 1 }]));
    const winner = makeActivity({ day: '2026-08-01', title: 'Winner', votes: votes(2) });
    const withWinner = makeTrip([winner, makeActivity({ day: '2026-08-01', votes: votes(1) })]);
    expect(groupActivities(withWinner).find((g) => g.day === '2026-08-01')!.topId).toBe(winner.id);

    const tied = makeTrip([
      makeActivity({ day: '2026-08-01', votes: votes(2) }),
      makeActivity({ day: '2026-08-01', title: 'Other', votes: votes(2) }),
    ]);
    expect(groupActivities(tied).find((g) => g.day === '2026-08-01')!.topId).toBeNull();

    const nobody = makeTrip([makeActivity({ day: '2026-08-01' })]);
    expect(groupActivities(nobody).find((g) => g.day === '2026-08-01')!.topId).toBeNull();
  });

  it('within a slot, timed activities come first in time order, untimed after', () => {
    const trip = makeTrip([
      makeActivity({ day: '2026-08-01', slot: 'morning', title: 'Vague stroll' }),
      makeActivity({ day: '2026-08-01', slot: 'morning', time: '10:30', title: 'Boat' }),
      makeActivity({ day: '2026-08-01', slot: 'morning', time: '08:15', title: 'Hike' }),
    ]);
    const [, first] = groupActivities(trip);
    expect(first.items.map((a) => a.title)).toEqual(['Hike', 'Boat', 'Vague stroll']);
  });

  it('keeps days outside the trip range visible after their day group', () => {
    const trip = makeTrip([makeActivity({ day: '2026-08-09', title: 'Stray' })]);
    const groups = groupActivities(trip);
    expect(groups.map((g) => g.day)).toContain('2026-08-09');
    expect(groups.find((g) => g.day === '2026-08-09')!.items.map((a) => a.title)).toEqual(['Stray']);
  });

  it('excludes deleted activities', () => {
    const trip = makeTrip([makeActivity({ day: null, deleted: true })]);
    expect(groupActivities(trip)[0].items).toEqual([]);
  });
});
