import { describe, expect, it } from 'vitest';
import { googleCalendarUrl } from './calendar';
import type { Activity, Trip } from '../types';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'a1',
    title: 'Coastal hike',
    category: 'hike',
    day: '2026-08-02',
    slot: 'morning',
    locationName: 'Vernazza, Italy',
    locationUrl: 'https://www.komoot.com/tour/123',
    notes: 'Bring water',
    votes: { Alex: { in: true, ts: 1 } },
    createdBy: 'Alex',
    updatedAt: 1,
    ...overrides,
  };
}

const trip: Trip = {
  id: 't1',
  name: 'Tuscany',
  destination: '',
  start: '2026-08-01',
  end: '2026-08-05',
  updatedAt: 1,
  activities: [],
};

describe('googleCalendarUrl', () => {
  it('returns null for activities without a day', () => {
    expect(googleCalendarUrl(trip, makeActivity({ day: null }))).toBeNull();
  });

  it('uses the departure time with a 2h default duration when set', () => {
    const url = googleCalendarUrl(trip, makeActivity({ time: '08:30' }))!;
    expect(url).toContain('dates=20260802T083000%2F20260802T103000');
  });

  it('falls back to the slot window when no time is set', () => {
    const url = googleCalendarUrl(trip, makeActivity({ slot: 'evening' }))!;
    expect(url).toContain('dates=20260802T190000%2F20260802T220000');
  });

  it('renders all-day activities as a full-day event', () => {
    const url = googleCalendarUrl(trip, makeActivity({ slot: 'allday' }))!;
    expect(url).toContain('dates=20260802%2F20260803');
  });

  it('carries title, location, and details', () => {
    const url = googleCalendarUrl(trip, makeActivity())!;
    const params = new URL(url).searchParams;
    expect(params.get('text')).toBe('Tuscany: Coastal hike');
    expect(params.get('location')).toBe('Vernazza, Italy');
    expect(params.get('details')).toContain('Going: Alex');
    expect(params.get('details')).toContain('Bring water');
  });
});
