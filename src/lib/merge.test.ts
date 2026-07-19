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

  it('unions activity comments from both sides, ordered by time, in both merge directions', () => {
    const local = makeTrip({
      activities: [makeActivity({ comments: [{ id: 'c2', author: 'Anna', text: 'The viewpoint one', ts: 5 }] })],
    });
    const incoming = makeTrip({
      activities: [makeActivity({ comments: [{ id: 'c1', author: 'Ben', text: 'What is this?', ts: 2 }] })],
    });
    expect(mergeTrips(local, incoming).activities[0].comments!.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(mergeTrips(incoming, local).activities[0].comments!.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('leaves comments absent when neither side has any', () => {
    const merged = mergeTrips(makeTrip({ activities: [makeActivity()] }), makeTrip({ activities: [makeActivity()] }));
    expect(merged.activities[0].comments).toBeUndefined();
  });

  it('takes trip metadata from the newer side', () => {
    const local = makeTrip({ name: 'Old name', updatedAt: 1 });
    const incoming = makeTrip({ name: 'Renamed trip', updatedAt: 2 });
    expect(mergeTrips(local, incoming).name).toBe('Renamed trip');
  });
});

describe('mergeTrips: groceries', () => {
  const makeItem = (overrides: Partial<import('../types').GroceryItem> = {}): import('../types').GroceryItem => ({
    id: 'g1',
    text: 'Pasta',
    quantity: '2 packs',
    addedBy: 'Alex',
    done: false,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });

  it('unions items added on both sides and survives pre-feature copies', () => {
    const local = makeTrip({ groceries: [makeItem({ id: 'g1' })] });
    const incoming = makeTrip({ groceries: [makeItem({ id: 'g2', text: 'Wine' })] });
    expect(
      mergeTrips(local, incoming)
        .groceries!.map((g) => g.id)
        .sort(),
    ).toEqual(['g1', 'g2']);

    const preFeature = makeTrip({ updatedAt: 9 });
    delete (preFeature as Partial<Trip>).groceries;
    expect(mergeTrips(preFeature, local).groceries!.length).toBe(1);
  });

  it('resolves cross-off races to the later action', () => {
    const crossed = makeTrip({ groceries: [makeItem({ done: true, updatedAt: 5 })] });
    const uncrossed = makeTrip({ groceries: [makeItem({ done: false, updatedAt: 9 })] });
    expect(mergeTrips(crossed, uncrossed).groceries![0].done).toBe(false);
    expect(mergeTrips(uncrossed, crossed).groceries![0].done).toBe(false);
  });

  it('keeps cleared items gone via tombstones', () => {
    const cleared = makeTrip({ groceries: [makeItem({ deleted: true, done: true, updatedAt: 9 })] });
    const stale = makeTrip({ groceries: [makeItem({ done: true, updatedAt: 5 })] });
    expect(mergeTrips(stale, cleared).groceries![0].deleted).toBe(true);
  });
});

describe('mergeTrips: stays', () => {
  const makeStay = (overrides: Partial<import('../types').Stay> = {}): import('../types').Stay => ({
    id: 's1',
    title: 'Farmhouse',
    url: '',
    details: '',
    votes: {},
    comments: [],
    createdBy: 'Alex',
    updatedAt: 1,
    ...overrides,
  });

  it('unions comments from both sides, ordered by time', () => {
    const local = makeTrip({
      stays: [makeStay({ comments: [{ id: 'c1', author: 'Alex', text: 'Great pool', ts: 2 }] })],
    });
    const incoming = makeTrip({
      stays: [makeStay({ comments: [{ id: 'c2', author: 'Billie', text: 'Too far from town', ts: 1 }] })],
    });
    const merged = mergeTrips(local, incoming);
    expect(merged.stays![0].comments.map((c) => c.id)).toEqual(['c2', 'c1']);
    expect(mergeTrips(incoming, local).stays![0].comments.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('survives merging with a copy from before the stays feature', () => {
    const withStays = makeTrip({ stays: [makeStay()], updatedAt: 1 });
    const preFeature = makeTrip({ updatedAt: 5 });
    delete (preFeature as Partial<Trip>).stays;
    expect(mergeTrips(preFeature, withStays).stays!.length).toBe(1);
    expect(mergeTrips(withStays, preFeature).stays!.length).toBe(1);
  });

  it('merges stay votes per person and lets the newer edit win on fields', () => {
    const local = makeTrip({
      stays: [makeStay({ title: 'Old', updatedAt: 2, votes: { Alex: { in: true, ts: 5 } } })],
    });
    const incoming = makeTrip({
      stays: [makeStay({ title: 'Renamed', updatedAt: 9, votes: { Billie: { in: true, ts: 1 } } })],
    });
    const merged = mergeTrips(local, incoming).stays![0];
    expect(merged.title).toBe('Renamed');
    expect(Object.keys(merged.votes).sort()).toEqual(['Alex', 'Billie']);
  });

  it('keeps stay deletions via tombstones', () => {
    const local = makeTrip({ stays: [makeStay({ deleted: true, updatedAt: 9 })] });
    const incoming = makeTrip({ stays: [makeStay({ updatedAt: 1 })] });
    expect(mergeTrips(local, incoming).stays![0].deleted).toBe(true);
  });
});
