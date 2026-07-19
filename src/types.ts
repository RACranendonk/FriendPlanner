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
  locationName: string;
  locationUrl: string;
  /** Optional map pin. Absent on activities nobody has located yet (and on pre-map trips). */
  lat?: number;
  lng?: number;
  notes: string;
  votes: Record<string, Vote>;
  createdBy: string;
  updatedAt: number;
  /** Tombstone: kept around so a deletion survives merging with older copies. */
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
