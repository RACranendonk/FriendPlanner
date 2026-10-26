import type { Comment } from '../types';

export interface DiscussionSummary {
  count: number;
  last: Comment | null;
}

/** Latest by timestamp, not array position — merged threads from two devices aren't guaranteed to be in order. */
export function summarizeComments(comments: Comment[] | undefined): DiscussionSummary {
  const list = comments ?? [];
  let last: Comment | null = null;
  for (const c of list) if (!last || c.ts > last.ts) last = c;
  return { count: list.length, last };
}

export function discussionTooltip({ count, last }: DiscussionSummary): string {
  if (!last) return 'No comments yet';
  const when = new Date(last.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${count} comment${count === 1 ? '' : 's'} — last by ${last.author}, ${when}`;
}
