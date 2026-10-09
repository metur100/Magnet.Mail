import { clamp01 } from '../utils/MathUtils';

/**
 * Scoring
 * =======
 *
 * Only successful deliveries score. With timeRatio = timeLeft / timeLimit:
 *
 *   delivery   = 0.6 + 0.4 · timeRatio                           (success and speed)      × 40 %
 *   impulses   = 1 − min(max(0, impulses − par) / (par + 2), 1)                           × 25 %
 *   collisions = (1 − min(collisions / 8, 1)) · (1 − damage / 200)                         × 20 %
 *   time       = timeRatio                                                                 × 15 %
 *
 *   score = max(0, round(1000 · Σ) − 80 · wrongMailboxes)
 *
 * Stars:
 *   ★     delivered
 *   ★★    delivered and (impulses ≤ par + 2 or collisions ≤ 2)
 *   ★★★   delivered, impulses ≤ par, collisions ≤ 3, no wrong mailbox and ≥ 30 % of the time left
 */
export const SCORE_WEIGHTS = { delivery: 0.4, impulses: 0.25, collisions: 0.2, time: 0.15 } as const;
export const WRONG_MAILBOX_PENALTY = 80;
export const THREE_STAR_TIME = 0.3;

export interface ScoreInput {
  delivered: boolean;
  impulses: number;
  par: number;
  collisions: number;
  damage: number;
  timeLeft: number;
  timeLimit: number;
  wrongMailboxes: number;
}

export interface ScoreBreakdown {
  delivery: number;
  impulses: number;
  collisions: number;
  time: number;
  penalty: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
}

export function calculateScore(input: ScoreInput): ScoreBreakdown {
  if (!input.delivered) return { delivery: 0, impulses: 0, collisions: 0, time: 0, penalty: 0, score: 0, stars: 0 };
  const timeRatio = input.timeLimit > 0 ? clamp01(input.timeLeft / input.timeLimit) : 0;
  const delivery = 0.6 + 0.4 * timeRatio;
  const over = Math.max(0, input.impulses - input.par);
  const impulses = 1 - clamp01(over / (input.par + 2));
  const collisions = (1 - clamp01(input.collisions / 8)) * (1 - clamp01(input.damage / 200));
  const time = timeRatio;
  const weighted =
    SCORE_WEIGHTS.delivery * delivery + SCORE_WEIGHTS.impulses * impulses + SCORE_WEIGHTS.collisions * collisions + SCORE_WEIGHTS.time * time;
  const penalty = input.wrongMailboxes * WRONG_MAILBOX_PENALTY;
  return {
    delivery,
    impulses,
    collisions,
    time,
    penalty,
    score: Math.max(0, Math.round(1000 * weighted) - penalty),
    stars: starsFor(input),
  };
}

export function starsFor(input: ScoreInput): 0 | 1 | 2 | 3 {
  if (!input.delivered) return 0;
  const timeRatio = input.timeLimit > 0 ? input.timeLeft / input.timeLimit : 0;
  if (input.impulses <= input.par && input.collisions <= 3 && input.wrongMailboxes === 0 && timeRatio >= THREE_STAR_TIME) return 3;
  if (input.impulses <= input.par + 2 || input.collisions <= 2) return 2;
  return 1;
}
