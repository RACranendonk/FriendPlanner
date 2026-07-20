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

  it('lets a trip-details edit survive merging with a copy whose overall updatedAt is newer', () => {
    // The other side is "newer" only because of an unrelated change (a vote,
    // a grocery tick) — the deliberate rename must still win, both ways.
    const renamed = makeTrip({ name: 'Elba 2027', metaUpdatedAt: 10, updatedAt: 10 });
    const voted = makeTrip({ name: 'Trip', updatedAt: 50 });
    expect(mergeTrips(renamed, voted).name).toBe('Elba 2027');
    expect(mergeTrips(voted, renamed).name).toBe('Elba 2027');
  });

  it('lets the newer of two trip-details edits win as a block', () => {
    const first = makeTrip({ name: 'First rename', description: 'Old blurb', metaUpdatedAt: 10 });
    const second = makeTrip({ name: 'Second rename', start: '2026-08-03', end: '2026-08-09', metaUpdatedAt: 20 });
    for (const merged of [mergeTrips(first, second), mergeTrips(second, first)]) {
      expect(merged.name).toBe('Second rename');
      expect(merged.start).toBe('2026-08-03');
      expect(merged.end).toBe('2026-08-09');
      // The winner controls all detail fields — its cleared description stays cleared.
      expect(merged.description).toBeUndefined();
      expect(merged.metaUpdatedAt).toBe(20);
    }
  });

  it('lets a trip-details edit beat a pre-feature copy without metaUpdatedAt', () => {
    const edited = makeTrip({ name: 'Corrected name', metaUpdatedAt: 5 });
    const preFeature = makeTrip({ updatedAt: 99 });
    expect(mergeTrips(edited, preFeature).name).toBe('Corrected name');
    expect(mergeTrips(preFeature, edited).name).toBe('Corrected name');
  });

  it('resolves equal trip-details timestamps identically on both devices', () => {
    const a = makeTrip({ name: 'Alpha', metaUpdatedAt: 7 });
    const b = makeTrip({ name: 'Beta', metaUpdatedAt: 7 });
    expect(mergeTrips(a, b).name).toBe(mergeTrips(b, a).name);
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

describe('mergeTrips: bring-from-home', () => {
  const makeBring = (overrides: Partial<import('../types').BringItem> = {}): import('../types').BringItem => ({
    id: 'b1',
    text: 'Kitchen scale',
    quantity: '',
    addedBy: 'Alex',
    broughtBy: '',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });

  it('unions items and survives pre-feature copies', () => {
    const local = makeTrip({ bring: [makeBring({ id: 'b1' })] });
    const incoming = makeTrip({ bring: [makeBring({ id: 'b2', text: 'Board games' })] });
    expect(
      mergeTrips(local, incoming)
        .bring!.map((b) => b.id)
        .sort(),
    ).toEqual(['b1', 'b2']);

    const preFeature = makeTrip({ updatedAt: 9 });
    delete (preFeature as Partial<Trip>).bring;
    expect(mergeTrips(preFeature, local).bring!.length).toBe(1);
  });

  it('resolves claim races to the later action', () => {
    const claimedByDana = makeTrip({ bring: [makeBring({ broughtBy: 'Dana', updatedAt: 5 })] });
    const unclaimed = makeTrip({ bring: [makeBring({ broughtBy: '', updatedAt: 9 })] });
    expect(mergeTrips(claimedByDana, unclaimed).bring![0].broughtBy).toBe('');
    expect(mergeTrips(unclaimed, claimedByDana).bring![0].broughtBy).toBe('');
  });

  it('keeps removals via tombstones', () => {
    const removed = makeTrip({ bring: [makeBring({ deleted: true, updatedAt: 9 })] });
    const stale = makeTrip({ bring: [makeBring({ updatedAt: 5 })] });
    expect(mergeTrips(stale, removed).bring![0].deleted).toBe(true);
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

  it('merges ratings per person by timestamp', () => {
    const local = makeTrip({ stays: [makeStay({ ratings: { Alex: { score: 5, ts: 5 } } })] });
    const incoming = makeTrip({
      stays: [makeStay({ ratings: { Alex: { score: 2, ts: 9 }, Billie: { score: 4, ts: 1 } } })],
    });
    const merged = mergeTrips(local, incoming).stays![0];
    expect(merged.ratings).toEqual({ Alex: { score: 2, ts: 9 }, Billie: { score: 4, ts: 1 } });
  });

  it('keeps stay deletions via tombstones', () => {
    const local = makeTrip({ stays: [makeStay({ deleted: true, updatedAt: 9 })] });
    const incoming = makeTrip({ stays: [makeStay({ updatedAt: 1 })] });
    expect(mergeTrips(local, incoming).stays![0].deleted).toBe(true);
  });
});
