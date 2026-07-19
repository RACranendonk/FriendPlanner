import { describe, expect, it } from 'vitest';
import { buildTripEvent, deriveTripKeys, verifyTripEvent } from './nostr';

describe('deriveTripKeys', () => {
  it('is deterministic for the same trip and passphrase', async () => {
    const a = await deriveTripKeys('trip-1', 'tuscany');
    const b = await deriveTripKeys('trip-1', 'tuscany');
    expect(a.pubkey).toBe(b.pubkey);
    expect(a.pubkey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('yields different keys for a different passphrase or trip', async () => {
    const base = await deriveTripKeys('trip-1', 'tuscany');
    expect((await deriveTripKeys('trip-1', 'other')).pubkey).not.toBe(base.pubkey);
    expect((await deriveTripKeys('trip-2', 'tuscany')).pubkey).not.toBe(base.pubkey);
  });
});

describe('trip events', () => {
  it('builds an event that verifies against the derived pubkey', async () => {
    const keys = await deriveTripKeys('trip-1', 'tuscany');
    const event = await buildTripEvent(keys, 'FP1_ciphertext', 1_700_000_000);
    await expect(verifyTripEvent(event, keys.pubkey)).resolves.toBe(true);
  });

  it('rejects tampered content and foreign authors', async () => {
    const keys = await deriveTripKeys('trip-1', 'tuscany');
    const other = await deriveTripKeys('trip-1', 'wrong-passphrase');
    const event = await buildTripEvent(keys, 'FP1_ciphertext', 1_700_000_000);
    await expect(verifyTripEvent({ ...event, content: 'FP1_altered' }, keys.pubkey)).resolves.toBe(false);
    await expect(verifyTripEvent(event, other.pubkey)).resolves.toBe(false);
  });
});
