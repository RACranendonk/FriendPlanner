const EMPTY_DAY_MESSAGES = [
  'Nothing here yet — toss in an idea ✨',
  'A blank canvas. What are we doing?',
  'Free as a bird today 🐦',
  'Nobody has claimed this day yet…',
  'Still wide open — beach? museum? nap?',
  'The best days start as empty ones 🌅',
  'Someone has to suggest something first 👀',
];

/**
 * Picks an empty-state message deterministically from a seed (trip + day):
 * stable across re-renders and refreshes — no flicker — but varied across
 * days, which is the fun part.
 */
export function emptyDayMessage(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return EMPTY_DAY_MESSAGES[hash % EMPTY_DAY_MESSAGES.length];
}
