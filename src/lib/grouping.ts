import type { Activity, Trip, Vote } from '../types';
import { formatDay, tripDays } from '../types';

/** Anything with per-person votes — activities and stays alike. */
interface Voted {
  votes: Record<string, Vote>;
}

const SLOT_ORDER: Record<string, number> = { allday: 0, morning: 1, afternoon: 2, evening: 3 };

export interface DayGroup {
  day: string | null;
  label: string;
  items: Activity[];
  /** The group's unique most-joined activity, highlighted in the UI. Null on ties or when nobody joined anything. */
  topId: string | null;
}

export function goingCount(item: Voted): number {
  return Object.values(item.votes).filter((v) => v.in).length;
}

export function goingNames(item: Voted): string[] {
  return Object.entries(item.votes)
    .filter(([, vote]) => vote.in)
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Trip-view grouping: the unscheduled bucket comes first — those activities
 * still need a planning decision, so they get the most visible spot — followed
 * by every trip day (plus any stray days outside the range, e.g. after the
 * trip dates were edited). Within a group the most-joined activity sorts to
 * the top (popularity is what the group is deciding on; the slot is on the
 * card anyway), then slot order, then title.
 */
export function groupActivities(trip: Trip): DayGroup[] {
  const active = trip.activities.filter((a) => !a.deleted);
  const days = tripDays(trip);
  const extraDays = [
    ...new Set(active.map((a) => a.day).filter((d): d is string => !!d && !days.includes(d))),
  ].sort();
  const build = (day: string | null, label: string): DayGroup => {
    const items = active
      .filter((a) => a.day === day)
      .sort(
        (a, b) =>
          goingCount(b) - goingCount(a) ||
          SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] ||
          // Within a slot, concrete departure times come first, in time order
          // (the form keeps slot and time consistent, so this reads as one axis).
          (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
          a.title.localeCompare(b.title),
      );
    const top = items[0];
    const uniqueWinner =
      top !== undefined &&
      goingCount(top) > 0 &&
      (items.length === 1 || goingCount(items[1]) < goingCount(top));
    return { day, label, items, topId: uniqueWinner ? top.id : null };
  };
  return [
    build(null, 'Sometime during the trip'),
    ...[...days, ...extraDays].map((d) => build(d, formatDay(d))),
  ];
}
