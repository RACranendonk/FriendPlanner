import { describe, expect, it } from 'vitest';
import { cycleLayout, resolveLayout } from './layout';

describe('cycleLayout', () => {
  it('cycles auto → wide → compact → auto', () => {
    expect(cycleLayout('auto')).toBe('wide');
    expect(cycleLayout('wide')).toBe('compact');
    expect(cycleLayout('compact')).toBe('auto');
  });
});

describe('resolveLayout', () => {
  it('follows the screen width on auto', () => {
    expect(resolveLayout('auto', true)).toBe('wide');
    expect(resolveLayout('auto', false)).toBe('compact');
  });

  it('honours an explicit choice regardless of screen width', () => {
    expect(resolveLayout('wide', false)).toBe('wide');
    expect(resolveLayout('compact', true)).toBe('compact');
  });
});
