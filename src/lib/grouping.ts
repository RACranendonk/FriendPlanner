import type { Activity, Trip } from '../types';
import { formatDay, tripDays } from '../types';

const SLOT_ORDER: Record<string, number> = { allday: 0, morning: 1, afternoon: 2, evening: 3 };

export interface DayGroup {
  day: string | null;
  label: string;
  items: Activity[];
}

/**
 * Trip-view grouping: the unscheduled bucket comes first — those activities
 * still need a planning decision, so they get the most visible spot — followed
 * by every trip day (plus any stray days outside the range, e.g. after the
 * trip dates were edited).
 */
export function groupActivities(trip: Trip): DayGroup[] {
  const active = trip.activities.filter((a) => !a.deleted);
  const days = tripDays(trip);
  const extraDays = [
    ...new Set(active.map((a) => a.day).filter((d): d is string => !!d && !days.includes(d))),
  ].sort();
  const build = (day: string | null, label: string): DayGroup => ({
    day,
    label,
    items: active
      .filter((a) => a.day === day)
      .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot] || a.title.localeCompare(b.title)),
  });
  return [
    build(null, 'Sometime during the trip'),
    ...[...days, ...extraDays].map((d) => build(d, formatDay(d))),
  ];
}
