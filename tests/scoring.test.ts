import { describe, expect, it } from 'vitest';

import { calculateScore, starsFor, THREE_STAR_TIME, WRONG_MAILBOX_PENALTY } from '../src/game/gameplay/Scoring';

const base = { delivered: true, impulses: 2, par: 2, collisions: 0, damage: 0, timeLeft: 30, timeLimit: 60, wrongMailboxes: 0 };

describe('Score calculation', () => {
  it('is 0 without a delivery', () => {
    expect(calculateScore({ ...base, delivered: false }).score).toBe(0);
  });

  it('follows the documented weights', () => {
    // delivery 0.6 + 0.4·0.5 = 0.8 → 320, impulses 1 → 250, collisions 1 → 200, time 0.5 → 75
    expect(calculateScore(base).score).toBe(845);
    expect(calculateScore({ ...base, timeLeft: 60 }).score).toBe(1000);
  });

  it('extra impulses, collisions and damage reduce the score', () => {
    const best = calculateScore(base).score;
    expect(calculateScore({ ...base, impulses: 4 }).score).toBeLessThan(best);
    expect(calculateScore({ ...base, collisions: 4 }).score).toBeLessThan(best);
    expect(calculateScore({ ...base, damage: 80 }).score).toBeLessThan(best);
  });

  it('subtracts the wrong-mailbox penalty', () => {
    expect(calculateScore({ ...base, wrongMailboxes: 2 }).score).toBe(845 - 2 * WRONG_MAILBOX_PENALTY);
  });
});

describe('Star thresholds', () => {
  it('one star for any delivery', () => {
    expect(starsFor({ ...base, impulses: 9, collisions: 9, timeLeft: 1 })).toBe(1);
    expect(starsFor({ ...base, delivered: false })).toBe(0);
  });

  it('two stars with limited impulses or collisions', () => {
    expect(starsFor({ ...base, impulses: 4, collisions: 9, timeLeft: 1 })).toBe(2);
    expect(starsFor({ ...base, impulses: 9, collisions: 2, timeLeft: 1 })).toBe(2);
  });

  it('three stars for an efficient delivery with time left', () => {
    expect(starsFor(base)).toBe(3);
    expect(starsFor({ ...base, timeLeft: base.timeLimit * THREE_STAR_TIME - 1 })).toBe(2);
    expect(starsFor({ ...base, impulses: 3 })).toBe(2);
    expect(starsFor({ ...base, wrongMailboxes: 1 })).toBe(2);
  });
});
