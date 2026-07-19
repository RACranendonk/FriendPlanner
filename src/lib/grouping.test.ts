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

  it('sorts a day by time slot, ties by title', () => {
    const trip = makeTrip([
      makeActivity({ day: '2026-08-01', slot: 'evening', title: 'Dinner' }),
      makeActivity({ day: '2026-08-01', slot: 'morning', title: 'Hike' }),
      makeActivity({ day: '2026-08-01', slot: 'morning', title: 'Boat trip' }),
    ]);
    const [, first] = groupActivities(trip);
    expect(first.items.map((a) => a.title)).toEqual(['Boat trip', 'Hike', 'Dinner']);
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
