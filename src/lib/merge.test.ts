import { describe, expect, it } from 'vitest';
import { mergeTrips, sameTrip } from './merge';
import type { Activity, Trip } from '../types';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    title: 'Hike',
    category: 'hike',
    day: null,
    slot: 'allday',
    locationName: '',
    locationUrl: '',
    notes: '',
    votes: {},
    createdBy: 'Robert',
    updatedAt: 1,
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    name: 'Trip',
    destination: '',
    start: '2026-08-01',
    end: '2026-08-02',
    updatedAt: 1,
    activities: [],
    ...overrides,
  };
}

describe('mergeTrips', () => {
  it('unions activities added independently on both sides', () => {
    const local = makeTrip({ activities: [makeActivity({ id: 'a1', title: 'Hike' })] });
    const incoming = makeTrip({ activities: [makeActivity({ id: 'a2', title: 'Museum' })] });
    const merged = mergeTrips(local, incoming);
    expect(merged.activities.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
  });

  it('lets the newer edit of the same activity win', () => {
    const local = makeTrip({ activities: [makeActivity({ title: 'Old title', updatedAt: 5 })] });
    const incoming = makeTrip({ activities: [makeActivity({ title: 'New title', updatedAt: 9 })] });
    const merged = mergeTrips(local, incoming);
    expect(merged.activities[0].title).toBe('New title');
  });

  it('merges votes per person, keeping each person\'s latest choice', () => {
    const local = makeTrip({
      activities: [makeActivity({ votes: { Robert: { in: true, ts: 5 }, Anna: { in: false, ts: 2 } } })],
    });
    const incoming = makeTrip({
      activities: [makeActivity({ votes: { Anna: { in: true, ts: 9 }, Ben: { in: true, ts: 1 } } })],
    });
    const merged = mergeTrips(local, incoming);
    expect(merged.activities[0].votes).toEqual({
      Robert: { in: true, ts: 5 },
      Anna: { in: true, ts: 9 },
      Ben: { in: true, ts: 1 },
    });
  });

  it('keeps a deletion even when merging with an older undeleted copy', () => {
    const local = makeTrip({ activities: [makeActivity({ deleted: true, updatedAt: 10 })] });
    const incoming = makeTrip({ activities: [makeActivity({ title: 'Edited before the delete', updatedAt: 2 })] });
    const merged = mergeTrips(local, incoming);
    expect(merged.activities[0].deleted).toBe(true);
  });

  it('reports trips as same regardless of activity order, different on content change', () => {
    const a1 = makeActivity({ id: 'a1' });
    const a2 = makeActivity({ id: 'a2' });
    expect(sameTrip(makeTrip({ activities: [a1, a2] }), makeTrip({ activities: [a2, a1] }))).toBe(true);
    expect(sameTrip(makeTrip({ activities: [a1] }), makeTrip({ activities: [a1, a2] }))).toBe(false);
  });

  it('takes trip metadata from the newer side', () => {
    const local = makeTrip({ name: 'Old name', updatedAt: 1 });
    const incoming = makeTrip({ name: 'Renamed trip', updatedAt: 2 });
    expect(mergeTrips(local, incoming).name).toBe('Renamed trip');
  });
});
