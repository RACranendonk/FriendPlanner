import type { Activity, Trip, Vote } from '../types';

// The sample friends (Alex, Billie, Charlie, Dana) are deliberately fictional —
// never real names from anyone's group.
export const DEMO_PASSPHRASE = 'demo';

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function votes(...entries: Array<[string, boolean]>): Record<string, Vote> {
  const out: Record<string, Vote> = {};
  let ts = Date.now() - 86_400_000;
  for (const [name, isIn] of entries) out[name] = { in: isIn, ts: (ts += 60_000) };
  return out;
}

/**
 * A ready-made trip for poking around: next week, four days, activities across
 * categories and slots, votes spread so the who-goes-where split is visible.
 * Fresh random id per call — demo trips on different devices are unrelated and
 * never sync into each other (the relay keypair derives from tripId).
 */
export function createDemoTrip(): Trip {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const day = (offset: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    return iso(d);
  };
  const now = Date.now();
  let counter = 0;
  const act = (partial: Omit<Activity, 'id' | 'updatedAt'>): Activity => ({
    ...partial,
    id: crypto.randomUUID(),
    updatedAt: now - 3_600_000 + counter++ * 60_000,
  });

  return {
    id: crypto.randomUUID(),
    name: 'Demo: Tuscany getaway',
    destination: 'Florence, Italy',
    start: day(0),
    end: day(3),
    updatedAt: now,
    activities: [
      act({
        title: 'Coastal hike: Monterosso → Vernazza',
        category: 'hike',
        day: day(1),
        slot: 'morning',
        locationName: 'Vernazza, Italy',
        locationUrl: '',
        notes: 'Train back from Vernazza. Bring water — little shade on the trail!',
        votes: votes(['Alex', true], ['Dana', true], ['Billie', false]),
        createdBy: 'Alex',
      }),
      act({
        // Same day as the hike: shows the group splitting up.
        title: 'Uffizi Gallery visit',
        category: 'culture',
        day: day(1),
        slot: 'morning',
        locationName: 'Uffizi Gallery, Florence',
        locationUrl: '',
        notes: 'Book skip-the-line tickets a few days ahead.',
        votes: votes(['Billie', true], ['Charlie', true]),
        createdBy: 'Billie',
      }),
      act({
        title: 'Welcome dinner — trattoria night',
        category: 'food',
        day: day(0),
        slot: 'evening',
        locationName: 'Piazza Santo Spirito, Florence',
        locationUrl: '',
        notes: 'Everyone! First night together.',
        votes: votes(['Alex', true], ['Billie', true], ['Charlie', true], ['Dana', true]),
        createdBy: 'Dana',
      }),
      act({
        title: 'Beach & swim at Cala Violina',
        category: 'beach',
        day: day(2),
        slot: 'afternoon',
        locationName: 'Cala Violina, Tuscany',
        locationUrl: '',
        notes: 'About 20 min walk from the parking. Fine gravel "singing" sand.',
        votes: votes(['Billie', true], ['Dana', true], ['Alex', false]),
        createdBy: 'Billie',
      }),
      act({
        title: 'E-bike tour through Chianti vineyards',
        category: 'sport',
        day: day(2),
        slot: 'morning',
        locationName: 'Greve in Chianti',
        locationUrl: '',
        notes: '',
        votes: votes(['Alex', true], ['Charlie', true]),
        createdBy: 'Charlie',
      }),
      act({
        title: 'Sunset drinks at Piazzale Michelangelo',
        category: 'nightlife',
        day: day(3),
        slot: 'evening',
        locationName: 'Piazzale Michelangelo, Florence',
        locationUrl: '',
        notes: 'Grab snacks beforehand, benches fill up early.',
        votes: votes(['Alex', true], ['Billie', true], ['Dana', true]),
        createdBy: 'Alex',
      }),
      act({
        title: 'Wine tasting — pick a vineyard',
        category: 'other',
        day: null,
        slot: 'allday',
        locationName: '',
        locationUrl: '',
        notes: 'Charlie is researching options — suggestions welcome.',
        votes: votes(['Charlie', true]),
        createdBy: 'Charlie',
      }),
    ],
  };
}
