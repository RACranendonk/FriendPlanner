import { describe, expect, it } from 'vitest';
import { listParticipants, withdrawParticipation } from './participation';
import { mergeTrips } from './merge';
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
    createdBy: 'Alex',
    updatedAt: 100,
    ...overrides,
  };
}

function makeTrip(activities: Activity[]): Trip {
  return {
    id: 'trip-1',
    name: 'Trip',
    destination: '',
    start: '2026-08-01',
    end: '2026-08-02',
    updatedAt: 1,
    activities,
  };
}

describe('listParticipants', () => {
  it('lists only people currently joined to a non-deleted activity', () => {
    const trip = makeTrip([
      makeActivity({ id: 'a1', votes: { Alex: { in: true, ts: 1 }, Billie: { in: false, ts: 2 } } }),
      makeActivity({ id: 'a2', deleted: true, votes: { Dana: { in: true, ts: 3 } } }),
    ]);
    expect(listParticipants(trip)).toEqual(['Alex']);
  });

  it('also lists people present via trip.visited, even without any vote', () => {
    const trip = { ...makeTrip([]), visited: { Charlie: { in: true, ts: 1 }, Dana: { in: false, ts: 2 } } };
    expect(listParticipants(trip)).toEqual(['Charlie']);
  });

  it('does not double-count someone who both voted and visited', () => {
    const trip = {
      ...makeTrip([makeActivity({ id: 'a1', votes: { Alex: { in: true, ts: 1 } } })]),
      visited: { Alex: { in: true, ts: 1 } },
    };
    expect(listParticipants(trip)).toEqual(['Alex']);
  });
});

describe('withdrawParticipation', () => {
  const trip = makeTrip([
    makeActivity({ id: 'a1', createdBy: 'Alex', votes: { Alex: { in: true, ts: 10 }, Billie: { in: true, ts: 11 } } }),
    makeActivity({ id: 'a2', createdBy: 'Billie', votes: { Alex: { in: true, ts: 12 } } }),
    makeActivity({ id: 'a3', votes: { Billie: { in: true, ts: 13 } } }),
  ]);

  it("clears the person's participation everywhere but keeps their suggestions and everyone else's votes", () => {
    const after = withdrawParticipation(trip, 'Alex');
    expect(listParticipants(after)).toEqual(['Billie']);
    expect(after.activities.map((a) => a.title).length).toBe(3);
    expect(after.activities.find((a) => a.id === 'a1')!.createdBy).toBe('Alex');
    expect(after.activities.find((a) => a.id === 'a1')!.votes.Billie.in).toBe(true);
  });

  it('does not bump activity updatedAt, so withdrawal cannot clobber concurrent edits', () => {
    const after = withdrawParticipation(trip, 'Alex');
    expect(after.activities.map((a) => a.updatedAt)).toEqual(trip.activities.map((a) => a.updatedAt));
  });

  it('survives merging with an older copy where the person was still in', () => {
    const withdrawn = withdrawParticipation(trip, 'Alex');
    const merged = mergeTrips(withdrawn, trip);
    expect(listParticipants(merged)).toEqual(['Billie']);
    const mergedOtherWay = mergeTrips(trip, withdrawn);
    expect(listParticipants(mergedOtherWay)).toEqual(['Billie']);
  });

  it('also withdraws trip.visited presence, and survives merging with an older copy', () => {
    const visitedTrip = { ...trip, visited: { Alex: { in: true, ts: 20 }, Billie: { in: true, ts: 21 } } };
    const withdrawn = withdrawParticipation(visitedTrip, 'Alex');
    expect(listParticipants(withdrawn)).toEqual(['Billie']);
    expect(listParticipants(mergeTrips(withdrawn, visitedTrip))).toEqual(['Billie']);
    expect(listParticipants(mergeTrips(visitedTrip, withdrawn))).toEqual(['Billie']);
  });

  it('leaves trip.visited alone for someone who was never marked present', () => {
    const after = withdrawParticipation(trip, 'Alex');
    expect(after.visited).toBeUndefined();
  });
});
