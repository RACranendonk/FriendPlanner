import { describe, expect, it } from 'vitest';
import type { Comment } from '../types';
import { discussionTooltip, summarizeComments } from './discussion';

const comment = (author: string, ts: number): Comment => ({ id: `${author}-${ts}`, author, text: 'hi', ts });

describe('summarizeComments', () => {
  it('reports zero and no last comment for an empty or missing thread', () => {
    expect(summarizeComments([])).toEqual({ count: 0, last: null });
    expect(summarizeComments(undefined)).toEqual({ count: 0, last: null });
  });

  it('counts every comment and picks the newest by timestamp, not position', () => {
    const summary = summarizeComments([comment('Alex', 300), comment('Sam', 100), comment('Kim', 200)]);
    expect(summary.count).toBe(3);
    expect(summary.last?.author).toBe('Alex');
  });
});

describe('discussionTooltip', () => {
  it('names the latest commenter and pluralizes the count', () => {
    expect(discussionTooltip(summarizeComments([comment('Sam', 100), comment('Alex', 200)]))).toMatch(
      /^2 comments — last by Alex, /,
    );
    expect(discussionTooltip(summarizeComments([comment('Kim', 100)]))).toMatch(/^1 comment — last by Kim, /);
  });

  it('says so when nobody has commented', () => {
    expect(discussionTooltip(summarizeComments([]))).toBe('No comments yet');
  });
});
