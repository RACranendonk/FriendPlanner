import type { Activity, Comment, Stay, Trip, Vote } from '../types';

/** Per-person newest-timestamp merge — votes and ratings share the shape. */
function mergePerPerson<T extends { ts: number }>(a: Record<string, T>, b: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [person, entry] of Object.entries(b)) {
    const existing = out[person];
    if (!existing || entry.ts > existing.ts) out[person] = entry;
  }
  return out;
}

function mergeVotes(a: Record<string, Vote>, b: Record<string, Vote>): Record<string, Vote> {
  return mergePerPerson(a, b);
}

/**
 * Combines two copies of the same trip: activities are matched by id and the
 * newer edit wins, votes are merged per person, deletions survive via tombstones.
 */
/** Comments are append-only and immutable: merging is a union by id. */
function mergeComments(a: Comment[], b: Comment[]): Comment[] {
  const byId = new Map<string, Comment>();
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
    const merged: Stay = {
      ...newer,
      votes: mergeVotes(older.votes, newer.votes),
      comments: mergeComments(older.comments, newer.comments),
    };
    if (older.ratings || newer.ratings) {
      merged.ratings = mergePerPerson(older.ratings ?? {}, newer.ratings ?? {});
    }
    byId.set(stay.id, merged);
  }
  return [...byId.values()];
}

/**
 * Union by id, newer edit wins whole-item. For simple list items (groceries,
 * bring-from-home) whose state is essentially one flag/field: a toggle race
 * resolves to the later action, tombstones survive.
 */
function mergeLwwList<T extends { id: string; updatedAt: number }>(a: T[] | undefined, b: T[] | undefined): T[] {
  const byId = new Map<string, T>();
  for (const item of a ?? []) byId.set(item.id, item);
  for (const item of b ?? []) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) byId.set(item.id, item);
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
      groceries: [...(t.groceries ?? [])].sort(byId),
      bring: [...(t.bring ?? [])].sort(byId),
    });
  return canonical(a) === canonical(b);
}

/**
 * Trip-level fields (name, destination, dates, description) win by their own
 * metaUpdatedAt, not trip.updatedAt — the latter bumps on every change, so a
 * rename would otherwise lose to an unrelated concurrent vote. Pre-feature
 * copies (no metaUpdatedAt) count as 0, so any real edit beats them. Equal
 * timestamps break by content, so both devices resolve a tie the same way
 * instead of each keeping its own side and ping-ponging publishes.
 */
function pickMeta(local: Trip, incoming: Trip): Trip {
  const localTs = local.metaUpdatedAt ?? 0;
  const incomingTs = incoming.metaUpdatedAt ?? 0;
  if (incomingTs !== localTs) return incomingTs > localTs ? incoming : local;
  const key = (t: Trip) => JSON.stringify([t.name, t.destination, t.start, t.end, t.description ?? '']);
  return key(incoming) > key(local) ? incoming : local;
}

export function mergeTrips(local: Trip, incoming: Trip): Trip {
  const meta = incoming.updatedAt > local.updatedAt ? incoming : local;
  const tripMeta = pickMeta(local, incoming);
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
    const merged: Activity = { ...newer, votes: mergeVotes(older.votes, newer.votes) };
    if (older.comments || newer.comments) {
      merged.comments = mergeComments(older.comments ?? [], newer.comments ?? []);
    }
    byId.set(act.id, merged);
  }
  return {
    ...meta,
    // All five set explicitly (even when undefined) so the meta winner fully
    // controls them — e.g. a cleared description stays cleared.
    name: tripMeta.name,
    destination: tripMeta.destination,
    description: tripMeta.description,
    start: tripMeta.start,
    end: tripMeta.end,
    metaUpdatedAt: tripMeta.metaUpdatedAt,
    activities: [...byId.values()],
    // Explicitly merged from both sides — never inherited from `meta`, so a
    // copy that predates the stays feature can't wipe the other side's stays.
    stays: mergeStays(local.stays, incoming.stays),
    groceries: mergeLwwList(local.groceries, incoming.groceries),
    bring: mergeLwwList(local.bring, incoming.bring),
    visited: mergeVotes(local.visited ?? {}, incoming.visited ?? {}),
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
  };
}
