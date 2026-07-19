import type { Activity, Trip, Vote } from '../types';

function mergeVotes(a: Record<string, Vote>, b: Record<string, Vote>): Record<string, Vote> {
  const out: Record<string, Vote> = { ...a };
  for (const [person, vote] of Object.entries(b)) {
    const existing = out[person];
    if (!existing || vote.ts > existing.ts) out[person] = vote;
  }
  return out;
}

/**
 * Combines two copies of the same trip: activities are matched by id and the
 * newer edit wins, votes are merged per person, deletions survive via tombstones.
 */
/** Content equality regardless of activity ordering — used to stop publish/merge echo loops. */
export function sameTrip(a: Trip, b: Trip): boolean {
  const canonical = (t: Trip) =>
    JSON.stringify({ ...t, activities: [...t.activities].sort((x, y) => x.id.localeCompare(y.id)) });
  return canonical(a) === canonical(b);
}

export function mergeTrips(local: Trip, incoming: Trip): Trip {
  const meta = incoming.updatedAt > local.updatedAt ? incoming : local;
  const byId = new Map<string, Activity>();
  for (const act of local.activities) byId.set(act.id, act);
  for (const act of incoming.activities) {
    const existing = byId.get(act.id);
    if (!existing) {
      byId.set(act.id, act);
      continue;
    }
    const newer = act.updatedAt >= existing.updatedAt ? act : existing;
    const older = newer === act ? existing : act;
    byId.set(act.id, { ...newer, votes: mergeVotes(older.votes, newer.votes) });
  }
  return {
    ...meta,
    activities: [...byId.values()],
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
  };
}
