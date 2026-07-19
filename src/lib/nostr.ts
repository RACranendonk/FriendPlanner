import { schnorr } from '@noble/curves/secp256k1.js';

/**
 * Public relays used as an encrypted dead-drop. Best-effort commodity
 * infrastructure: any single relay may be slow or drop data, which is why the
 * app publishes to all of them and every device keeps the full plan locally.
 */
export const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://offchain.pub',
];

/** NIP-78 application-specific data, parameterized replaceable: relays keep only the latest event per (pubkey, d-tag). */
export const TRIP_KIND = 30078;
export const TRIP_D_TAG = 'friendplanner';

const textEncoder = new TextEncoder();

export interface TripKeys {
  privkey: Uint8Array;
  /** x-only pubkey, hex — doubles as the trip's identity on the relays. */
  pubkey: string;
}

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Every group member derives the SAME keypair from tripId + passphrase, so all
 * updates appear as one author and replaceable-event semantics apply. Knowing
 * the passphrase is what authorizes publishing — there are no accounts.
 */
export async function deriveTripKeys(tripId: string, passphrase: string): Promise<TripKeys> {
  const baseKey = await crypto.subtle.importKey('raw', textEncoder.encode(passphrase), 'PBKDF2', false, [
    'deriveBits',
  ]);
  for (let attempt = 0; ; attempt++) {
    const salt = textEncoder.encode(`friendplanner-nostr:${tripId}:${attempt}`);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
      baseKey,
      256,
    );
    const privkey = new Uint8Array(bits);
    try {
      return { privkey, pubkey: bytesToHex(schnorr.getPublicKey(privkey)) };
    } catch {
      // Astronomically rare: derived bytes weren't a valid secp256k1 scalar. Re-derive.
    }
  }
}

async function eventIdBytes(
  pubkey: string,
  createdAt: number,
  kind: number,
  tags: string[][],
  content: string,
): Promise<Uint8Array> {
  const serialized = JSON.stringify([0, pubkey, createdAt, kind, tags, content]);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', textEncoder.encode(serialized)));
}

export async function buildTripEvent(keys: TripKeys, token: string, createdAt: number): Promise<NostrEvent> {
  const tags = [['d', TRIP_D_TAG]];
  const id = await eventIdBytes(keys.pubkey, createdAt, TRIP_KIND, tags, token);
  return {
    id: bytesToHex(id),
    pubkey: keys.pubkey,
    created_at: createdAt,
    kind: TRIP_KIND,
    tags,
    content: token,
    sig: bytesToHex(schnorr.sign(id, keys.privkey)),
  };
}

/** A relay can only withhold data, never alter it: id and signature are checked against our derived pubkey. */
export async function verifyTripEvent(ev: NostrEvent, pubkey: string): Promise<boolean> {
  if (ev.pubkey !== pubkey || ev.kind !== TRIP_KIND) return false;
  const id = await eventIdBytes(ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content);
  if (bytesToHex(id) !== ev.id) return false;
  try {
    return schnorr.verify(hexToBytes(ev.sig), id, hexToBytes(ev.pubkey));
  } catch {
    return false;
  }
}

export function tripSubscription(subId: string, pubkey: string): unknown[] {
  return ['REQ', subId, { kinds: [TRIP_KIND], authors: [pubkey], '#d': [TRIP_D_TAG], limit: 1 }];
}
