import { decryptJson, encryptJson } from './crypto';
import type { Trip } from '../types';

const PREFIX = 'FP1_';

export async function tripToToken(trip: Trip, passphrase: string): Promise<string> {
  return PREFIX + (await encryptJson(trip, passphrase));
}

/** Pulls a share token out of any pasted text (full URL, message, or bare token). */
export function extractToken(input: string): string | null {
  const match = input.match(/FP1_[A-Za-z0-9_-]+/);
  return match ? match[0] : null;
}

export async function tokenToTrip(token: string, passphrase: string): Promise<Trip> {
  return decryptJson<Trip>(token.slice(PREFIX.length), passphrase);
}

export function shareUrl(token: string): string {
  return `${location.origin}${location.pathname}#${token}`;
}
