import { decryptJson, encryptJson } from './crypto';
import type { Trip } from '../types';

const PREFIX = 'FP1_';
const INVITE_PREFIX = 'FPJ_';

export async function tripToToken(trip: Trip, passphrase: string): Promise<string> {
  return PREFIX + (await encryptJson(trip, passphrase));
}

/**
 * Short invite token: identifies the trip, carries no data. The plan itself is
 * fetched from the relays — which requires deriving the trip key from BOTH the
 * id and the passphrase, so the link alone reveals and unlocks nothing.
 */
export function inviteToken(tripId: string): string {
  return INVITE_PREFIX + tripId;
}

export function isInviteToken(token: string): boolean {
  return token.startsWith(INVITE_PREFIX);
}

export function inviteTripId(token: string): string {
  return token.slice(INVITE_PREFIX.length);
}

/** Pulls a share token (full-plan FP1_ or invite FPJ_) out of any pasted text. */
export function extractToken(input: string): string | null {
  const match = input.match(/FP(?:1|J)_[A-Za-z0-9_-]+/);
  return match ? match[0] : null;
}

export async function tokenToTrip(token: string, passphrase: string): Promise<Trip> {
  return decryptJson<Trip>(token.slice(PREFIX.length), passphrase);
}

export function shareUrl(token: string): string {
  return `${location.origin}${location.pathname}#${token}`;
}
