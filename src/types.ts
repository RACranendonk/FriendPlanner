export type Category = 'hike' | 'culture' | 'food' | 'beach' | 'nightlife' | 'sport' | 'other';
export type Slot = 'allday' | 'morning' | 'afternoon' | 'evening';

/** One person's yes/no on an activity, with a timestamp so merges keep the latest choice. */
export interface Vote {
  in: boolean;
  ts: number;
}

export interface Activity {
  id: string;
  title: string;
  category: Category;
  /** ISO date (yyyy-mm-dd) or null when not scheduled yet. */
  day: string | null;
  slot: Slot;
  /** Optional start/departure time (HH:MM). Precision on top of the slot, never instead of it. */
  time?: string;
  locationName: string;
  locationUrl: string;
  /** Optional map pin. Absent on activities nobody has located yet (and on pre-map trips). */
  lat?: number;
  lng?: number;
  notes: string;
  votes: Record<string, Vote>;
  /** Discussion thread — notes are for facts, comments for questions and answers. Absent on older activities. */
  comments?: Comment[];
  createdBy: string;
  updatedAt: number;
  /** Tombstone: kept around so a deletion survives merging with older copies. */
  deleted?: boolean;
}

/** A remark in an activity's or stay's thread. Append-only and immutable — that's what makes comment merging trivially conflict-free. */
export interface Comment {
  id: string;
  author: string;
  text: string;
  ts: number;
}

/** An accommodation candidate the group is weighing up. */
export interface Stay {
  id: string;
  title: string;
  url: string;
  /** Free-text facts: price, beds, distance to town, … (no scraping — entered by hand). */
  details: string;
  votes: Record<string, Vote>;
  comments: Comment[];
  /** The crowned choice. LWW via updatedAt like other stay fields. */
  decided?: boolean;
  createdBy: string;
  updatedAt: number;
  deleted?: boolean;
}

/** One wish on the shared shopping list. */
export interface GroceryItem {
  id: string;
  text: string;
  /** Free text ("2 packs") — optional but recommended. */
  quantity: string;
  addedBy: string;
  /** Crossed off = bought. LWW via updatedAt, so an uncross beats an older cross. */
  done: boolean;
  /** Stable list position — updatedAt changes on every toggle. */
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  /** ISO dates (yyyy-mm-dd), inclusive. */
  start: string;
  end: string;
  updatedAt: number;
  activities: Activity[];
  /** Accommodation candidates — absent on trips from before this feature. */
  stays?: Stay[];
  /** Shared shopping list — absent on trips from before this feature. */
  groceries?: GroceryItem[];
}

export const CATEGORIES: Record<Category, { label: string; emoji: string }> = {
  hike: { label: 'Hike', emoji: '🥾' },
  culture: { label: 'Culture', emoji: '🏛️' },
  food: { label: 'Food & drinks', emoji: '🍽️' },
  beach: { label: 'Beach & relax', emoji: '🏖️' },
  sport: { label: 'Sport & adventure', emoji: '🚵' },
  nightlife: { label: 'Nightlife', emoji: '🌙' },
  other: { label: 'Other', emoji: '📌' },
};

/** The slot a given HH:MM time falls in, so a picked time and the slot never contradict. */
export function slotForTime(time: string): Slot {
  const hour = parseInt(time.slice(0, 2), 10);
  if (Number.isNaN(hour)) return 'allday';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export const SLOTS: Record<Slot, string> = {
  allday: 'All day',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/** Every day of the trip as ISO dates, start to end inclusive. */
export function tripDays(trip: Trip): string[] {
  const days: string[] = [];
  const end = new Date(trip.end + 'T12:00:00');
  for (let d = new Date(trip.start + 'T12:00:00'); d <= end && days.length < 60; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function formatDay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
