import { describe, expect, it } from 'vitest';
import { formatEuro } from './money';

describe('formatEuro', () => {
  it('adds the euro sign and keeps whole amounts whole', () => {
    expect(formatEuro(1250, 'en-GB')).toBe('€1,250');
    expect(formatEuro(0, 'en-GB')).toBe('€0');
  });

  it('shows cents only when the amount has them', () => {
    expect(formatEuro(99.5, 'en-GB')).toBe('€99.50');
  });

  it("follows the viewer's locale for symbol placement and separators", () => {
    expect(formatEuro(1250, 'nl-NL')).toBe('€ 1.250');
  });
});
