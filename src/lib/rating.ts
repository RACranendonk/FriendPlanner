import type { Stay } from '../types';

export const RATING_LEVELS = [
  { score: 1, emoji: '😖', label: 'Hate it' },
  { score: 2, emoji: '😕', label: 'Meh' },
  { score: 3, emoji: '😐', label: 'Neutral' },
  { score: 4, emoji: '🙂', label: 'Like it' },
  { score: 5, emoji: '😍', label: 'Love it' },
] as const;

export function ratingEmoji(score: number): string {
  return RATING_LEVELS.find((l) => l.score === Math.round(score))?.emoji ?? '😐';
}

/**
 * Everyone's effective 1–5 score. Legacy binary votes (from before the scale
 * existed) read as a 4; a real rating always overrides the person's old vote —
 * no data migration needed.
 */
export function effectiveRatings(stay: Stay): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [person, vote] of Object.entries(stay.votes)) {
    if (vote.in) out[person] = 4;
  }
  for (const [person, rating] of Object.entries(stay.ratings ?? {})) {
    out[person] = rating.score;
  }
  return out;
}

export function averageRating(stay: Stay): number | null {
  const scores = Object.values(effectiveRatings(stay));
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}
