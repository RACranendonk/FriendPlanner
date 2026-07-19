import type { Activity, Stay, StayComment, Trip, Vote } from '../types';

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
/** Comments are append-only and immutable: merging is a union by id. */
function mergeComments(a: StayComment[], b: StayComment[]): StayComment[] {
  const byId = new Map<string, StayComment>();
  for (const c of [...a, ...b]) byId.set(c.id, c);
  return [...byId.values()].sort((x, y) => x.ts - y.ts || x.id.localeCompare(y.id));
}

function mergeStays(a: Stay[] | undefined, b: Stay[] | undefined): Stay[] {
  const byId = new Map<string, Stay>();
  for (const stay of a ?? []) byId.set(stay.id, stay);
  for (const stay of b ?? []) {
    const existing = byId.get(stay.id);
    if (!existing) {
      byId.set(stay.id, stay);
      continue;
    }
    const newer = stay.updatedAt >= existing.updatedAt ? stay : existing;
    const older = newer === stay ? existing : stay;
    byId.set(stay.id, {
      ...newer,
      votes: mergeVotes(older.votes, newer.votes),
      comments: mergeComments(older.comments, newer.comments),
    });
  }
  return [...byId.values()];
}

/** Content equality regardless of activity/stay ordering — used to stop publish/merge echo loops. */
export function sameTrip(a: Trip, b: Trip): boolean {
  const byId = (x: { id: string }, y: { id: string }) => x.id.localeCompare(y.id);
  const canonical = (t: Trip) =>
    JSON.stringify({
      ...t,
      activities: [...t.activities].sort(byId),
      stays: [...(t.stays ?? [])].sort(byId),
    });
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
    // Explicitly merged from both sides — never inherited from `meta`, so a
    // copy that predates the stays feature can't wipe the other side's stays.
    stays: mergeStays(local.stays, incoming.stays),
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
  };
}
