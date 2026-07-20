import type { Activity, BringItem, Comment, GroceryItem, Rating, Stay, Trip, Vote } from '../types';

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

function ratings(...entries: Array<[string, number]>): Record<string, Rating> {
  const out: Record<string, Rating> = {};
  let ts = Date.now() - 80_000_000;
  for (const [name, score] of entries) out[name] = { score, ts: (ts += 60_000) };
  return out;
}

function comments(...entries: Array<[string, string]>): Comment[] {
  let ts = Date.now() - 82_800_000;
  return entries.map(([author, text]) => ({ id: crypto.randomUUID(), author, text, ts: (ts += 180_000) }));
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
    description: 'Four days of hills, art and far too much pasta. Tap the ✏️ up top to change the name, dates or this text.',
    start: day(0),
    end: day(3),
    updatedAt: now,
    activities: [
      act({
        title: 'Coastal hike: Monterosso → Vernazza',
        category: 'hike',
        day: day(1),
        slot: 'morning',
        time: '08:30',
        locationName: 'Vernazza, Italy',
        lat: 44.1359,
        lng: 9.6839,
        locationUrl: '',
        notes: 'Train back from Vernazza. Bring water — little shade on the trail!',
        votes: votes(['Alex', true], ['Dana', true], ['Billie', false]),
        comments: comments(
          ['Dana', 'How long is this roughly?'],
          ['Alex', 'About 3.5h with photo stops — the 08:30 start beats the heat'],
          ['Billie', "That's exactly why I'm choosing the museum 😅"],
        ),
        createdBy: 'Alex',
      }),
      act({
        // Same day as the hike: shows the group splitting up.
        title: 'Uffizi Gallery visit',
        category: 'culture',
        day: day(1),
        slot: 'morning',
        locationName: 'Uffizi Gallery, Florence',
        lat: 43.7678,
        lng: 11.2554,
        locationUrl: '',
        notes: 'Book skip-the-line tickets a few days ahead.',
        votes: votes(['Billie', true], ['Charlie', true]),
        comments: comments(['Charlie', 'Booked two tickets for us ✔️']),
        createdBy: 'Billie',
      }),
      act({
        title: 'Welcome dinner — trattoria night',
        category: 'food',
        day: day(0),
        slot: 'evening',
        locationName: 'Piazza Santo Spirito, Florence',
        lat: 43.7669,
        lng: 11.2477,
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
        lat: 42.877,
        lng: 10.7784,
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
        lat: 43.585,
        lng: 11.316,
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
        lat: 43.7629,
        lng: 11.2657,
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
        comments: comments(
          ['Billie', 'What even is a Super Tuscan?'],
          ['Charlie', "Expensive. That's what it is."],
        ),
        createdBy: 'Charlie',
      }),
    ],
    stays: demoStays(now),
    groceries: demoGroceries(now),
    bring: demoBring(now),
  };
}

function demoBring(now: number): BringItem[] {
  let order = 0;
  const item = (text: string, quantity: string, addedBy: string, broughtBy = ''): BringItem => {
    const createdAt = now - 9_000_000 + order++ * 300_000;
    return {
      id: crypto.randomUUID(),
      text,
      quantity,
      addedBy,
      broughtBy,
      createdAt,
      updatedAt: broughtBy ? createdAt + 1_800_000 : createdAt,
    };
  };
  return [
    item('Kitchen scale', 'the small one', 'Dana', 'Dana'),
    item('Salt, pepper & olive oil', 'starter kit', 'Alex', 'Alex'),
    item('Board games', 'Wingspan + cards', 'Billie', 'Billie'),
    item('Bluetooth speaker', '', 'Charlie'),
    item('First-aid kit', '', 'Alex'),
  ];
}

function demoGroceries(now: number): GroceryItem[] {
  let order = 0;
  const item = (text: string, quantity: string, addedBy: string, done = false): GroceryItem => {
    const createdAt = now - 10_800_000 + order++ * 300_000;
    return {
      id: crypto.randomUUID(),
      text,
      quantity,
      addedBy,
      done,
      createdAt,
      updatedAt: done ? createdAt + 3_600_000 : createdAt,
    };
  };
  return [
    item('Espresso beans', '2 bags', 'Alex', true),
    item('Pasta', '1kg', 'Dana', true),
    item('Sunscreen SPF 50', '1 bottle', 'Billie', true),
    item('Tomatoes, basil, mozzarella', 'lots', 'Dana'),
    item('Local red wine', '3 bottles', 'Charlie'),
    item('Breakfast eggs', '12', 'Alex'),
    item('Snacks for the hike', '', 'Dana'),
  ];
}

function demoStays(now: number): Stay[] {
  const stay = (partial: Omit<Stay, 'id' | 'updatedAt'>, age: number): Stay => ({
    ...partial,
    id: crypto.randomUUID(),
    updatedAt: now - age,
  });
  return [
    stay(
      {
        title: 'Agriturismo with pool near Greve',
        url: 'https://www.airbnb.com/s/Greve-in-Chianti--Italy/homes',
        details: '€38 pp/night · 6 beds · pool · 40 min drive to Florence',
        votes: {},
        ratings: ratings(['Alex', 5], ['Billie', 5], ['Dana', 4], ['Charlie', 2]),
        comments: comments(
          ['Billie', 'That pool though 😍'],
          ['Charlie', 'And how do we get home after a night out?'],
          ['Alex', 'Designated driver roster, like last year'],
        ),
        createdBy: 'Alex',
      },
      7_200_000,
    ),
    stay(
      {
        title: 'Apartment in Florence centre',
        url: 'https://www.booking.com/city/it/florence.html',
        details: '€45 pp/night · 5 beds · everything walkable',
        votes: {},
        ratings: ratings(['Charlie', 5], ['Dana', 2], ['Alex', 3]),
        comments: comments(['Charlie', 'We can stumble home from anywhere'], ['Dana', 'No pool, no deal 🏊']),
        createdBy: 'Charlie',
      },
      5_400_000,
    ),
    stay(
      {
        title: 'Villa with own vineyard, San Gimignano',
        url: 'https://www.airbnb.com/s/San-Gimignano--Italy/homes',
        details: '€52 pp/night · 8 beds · vineyard(!) · quite remote',
        votes: {},
        ratings: ratings(['Dana', 5], ['Billie', 3], ['Charlie', 2]),
        comments: comments(['Dana', 'It. Has. A. Vineyard.']),
        createdBy: 'Dana',
      },
      3_600_000,
    ),
  ];
}
