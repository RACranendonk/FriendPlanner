import { describe, expect, it } from 'vitest';
import { extractToken, tokenToTrip, tripToToken } from './share';
import type { Trip } from '../types';

const trip: Trip = {
  id: 'trip-1',
  name: 'Test trip',
  destination: 'Testville',
  start: '2026-08-01',
  end: '2026-08-03',
  updatedAt: 1,
  activities: [],
};

describe('share tokens', () => {
  it('round-trips a trip through a token', async () => {
    const token = await tripToToken(trip, 'passphrase');
    expect(token.startsWith('FP1_')).toBe(true);
    await expect(tokenToTrip(token, 'passphrase')).resolves.toEqual(trip);
  });

  it('extracts the token from a full URL pasted inside a chat message', async () => {
    const token = await tripToToken(trip, 'passphrase');
    const message = `here's the plan! https://example.github.io/FriendPlanner/#${token} see you there 🎉`;
    expect(extractToken(message)).toBe(token);
  });

  it('accepts a bare token and rejects text without one', () => {
    expect(extractToken('FP1_abc-DEF_123')).toBe('FP1_abc-DEF_123');
    expect(extractToken('no token in here')).toBeNull();
  });
});
