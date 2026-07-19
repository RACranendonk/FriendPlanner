import type { Trip } from '../types';

const NAME_KEY = 'fp.name';
const TRIPS_KEY = 'fp.tripIds';

export function getName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function setName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim());
}

export function listTripIds(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(TRIPS_KEY) ?? '[]');
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function loadTrip(id: string): Trip | null {
  const raw = localStorage.getItem(`fp.trip.${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
}

export function saveTrip(trip: Trip): void {
  localStorage.setItem(`fp.trip.${trip.id}`, JSON.stringify(trip));
  const ids = listTripIds();
  if (!ids.includes(trip.id)) {
    localStorage.setItem(TRIPS_KEY, JSON.stringify([...ids, trip.id]));
  }
}

export function deleteTrip(id: string): void {
  localStorage.removeItem(`fp.trip.${id}`);
  localStorage.removeItem(`fp.pass.${id}`);
  localStorage.setItem(TRIPS_KEY, JSON.stringify(listTripIds().filter((x) => x !== id)));
}

export function getPassphrase(tripId: string): string {
  return localStorage.getItem(`fp.pass.${tripId}`) ?? '';
}

export function setPassphrase(tripId: string, passphrase: string): void {
  localStorage.setItem(`fp.pass.${tripId}`, passphrase);
}
