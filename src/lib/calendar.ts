import type { Activity, Trip } from '../types';
import { goingNames } from './grouping';

/** Default event windows per slot, used when no departure time is set. */
const SLOT_WINDOWS: Record<string, [string, string]> = {
  morning: ['0900', '1200'],
  afternoon: ['1300', '1700'],
  evening: ['1900', '2200'],
};

const DEFAULT_DURATION_HOURS = 2;

function compactDay(day: string): string {
  return day.replaceAll('-', '');
}

function nextDay(day: string): string {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Prefilled Google Calendar event link for a planned activity. Times are
 * floating local (no timezone suffix) on purpose: on holiday the phones are in
 * the destination timezone, and "09:00" should mean 09:00 there. Null for
 * unplanned activities — nothing to put on a calendar yet.
 */
export function googleCalendarUrl(trip: Trip, act: Activity): string | null {
  if (!act.day) return null;
  const day = compactDay(act.day);
  let dates: string;
  if (act.time) {
    const start = act.time.replace(':', '');
    const endHour = Math.min(23, parseInt(act.time.slice(0, 2), 10) + DEFAULT_DURATION_HOURS);
    dates = `${day}T${start}00/${day}T${String(endHour).padStart(2, '0')}${act.time.slice(3, 5)}00`;
  } else if (act.slot === 'allday') {
    dates = `${day}/${compactDay(nextDay(act.day))}`;
  } else {
    const [start, end] = SLOT_WINDOWS[act.slot];
    dates = `${day}T${start}00/${day}T${end}00`;
  }
  const going = goingNames(act);
  const details = [
    act.notes,
    act.locationUrl,
    going.length > 0 ? `Going: ${going.join(', ')}` : '',
    'Planned with FriendPlanner — the plan can still change.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${trip.name}: ${act.title}`,
    dates,
    details,
  });
  if (act.locationName) params.set('location', act.locationName);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
