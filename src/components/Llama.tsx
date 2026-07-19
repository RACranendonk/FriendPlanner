import { useState } from 'react';
import { LLAMA_TAPS, tapStreak } from '../lib/easteregg';

/**
 * The compass in the app title — and the trigger for a small secret: tap it
 * five times quickly and a llama walks across the page, doing a backflip on
 * the way. Purely cosmetic, no data involved.
 */
export function CompassEgg() {
  const [taps, setTaps] = useState<number[]>([]);
  const [active, setActive] = useState(false);

  const tap = () => {
    const next = tapStreak(taps, Date.now());
    if (next.length >= LLAMA_TAPS) {
      setTaps([]);
      setActive(true);
    } else {
      setTaps(next);
    }
  };

  return (
    <>
      <span className="compass-egg" onClick={tap} aria-hidden="true">
        🧭
      </span>
      {active && (
        <span
          className="llama"
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setActive(false);
          }}
        >
          <span className="llama-flip">
            <span className="llama-emoji">🦙</span>
          </span>
        </span>
      )}
    </>
  );
}
