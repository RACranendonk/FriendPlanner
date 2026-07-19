export const LLAMA_TAPS = 5;
export const LLAMA_WINDOW_MS = 3000;

/** Rolling tap streak: taps older than the window fall off, the new tap appends. */
export function tapStreak(prev: number[], now: number, windowMs: number = LLAMA_WINDOW_MS): number[] {
  return [...prev.filter((t) => now - t < windowMs), now];
}
