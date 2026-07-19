import { describe, expect, it } from 'vitest';
import { averageRating, effectiveRatings } from './rating';
import type { Stay } from '../types';

function makeStay(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    title: 'Farmhouse',
    url: '',
    details: '',
    votes: {},
    comments: [],
    createdBy: 'Alex',
    updatedAt: 1,
    ...overrides,
  };
}

describe('effectiveRatings', () => {
  it('reads legacy in:true votes as a 4 and ignores in:false', () => {
    const stay = makeStay({ votes: { Alex: { in: true, ts: 1 }, Billie: { in: false, ts: 2 } } });
    expect(effectiveRatings(stay)).toEqual({ Alex: 4 });
  });

  it('treats a cleared rating (score 0) as no opinion, overriding even a legacy vote', () => {
    const stay = makeStay({
      votes: { Alex: { in: true, ts: 1 } },
      ratings: { Alex: { score: 0, ts: 9 }, Dana: { score: 3, ts: 2 } },
    });
    expect(effectiveRatings(stay)).toEqual({ Dana: 3 });
  });

  it('lets a real rating override the same person\'s legacy vote', () => {
    const stay = makeStay({
      votes: { Alex: { in: true, ts: 1 } },
      ratings: { Alex: { score: 2, ts: 5 }, Dana: { score: 5, ts: 6 } },
    });
    expect(effectiveRatings(stay)).toEqual({ Alex: 2, Dana: 5 });
  });
});

describe('averageRating', () => {
  it('averages effective scores and is null with no opinions', () => {
    expect(averageRating(makeStay())).toBeNull();
    const stay = makeStay({ ratings: { Alex: { score: 5, ts: 1 }, Billie: { score: 2, ts: 2 } } });
    expect(averageRating(stay)).toBe(3.5);
  });
});
