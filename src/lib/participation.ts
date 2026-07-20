import type { Trip } from '../types';

/** Names currently joined to at least one (non-deleted) activity, or present via trip.visited. */
export function listParticipants(trip: Trip): string[] {
  const names = new Set<string>();
  for (const act of trip.activities) {
    if (act.deleted) continue;
    for (const [name, vote] of Object.entries(act.votes)) {
      if (vote.in) names.add(name);
    }
  }
  for (const [name, visit] of Object.entries(trip.visited ?? {})) {
    if (visit.in) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * Removes someone's participation from every activity and from trip.visited,
 * while leaving their suggestions untouched. Writes in:false records with a
 * fresh timestamp instead of deleting the entries — deletion wouldn't survive
 * merging with a device that still holds an older copy, a tombstone wins the
 * per-person merge everywhere. Activity updatedAt is deliberately left alone
 * so a withdrawal never clobbers a concurrent edit of the activity itself.
 */
export function withdrawParticipation(trip: Trip, person: string): Trip {
  const ts = Date.now();
  return {
    ...trip,
    activities: trip.activities.map((act) =>
      act.votes[person]?.in ? { ...act, votes: { ...act.votes, [person]: { in: false, ts } } } : act,
    ),
    visited: trip.visited?.[person]?.in ? { ...trip.visited, [person]: { in: false, ts } } : trip.visited,
  };
}
