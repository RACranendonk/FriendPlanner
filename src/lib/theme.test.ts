import { describe, expect, it } from 'vitest';
import { cycleTheme } from './theme';

describe('cycleTheme', () => {
  it('cycles auto → light → dark → auto', () => {
    expect(cycleTheme('auto')).toBe('light');
    expect(cycleTheme('light')).toBe('dark');
    expect(cycleTheme('dark')).toBe('auto');
  });
});
