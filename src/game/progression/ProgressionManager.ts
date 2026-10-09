import type { LevelResult } from '../gameplay/LevelRunner';
import { LEVELS, LEVELS_PER_WORLD, WORLDS } from '../levels/LevelData';
import { computeUnlocks, type UnlockFacts } from './Cosmetics';
import type { SaveData } from './SaveManager';

/**
 * Unlock rules
 * ------------
 * - Level 1 is always open. Every other level opens when the level before it is delivered
 *   (and, if the level defines `requiredStars`, enough total stars have been collected).
 * - A world opens when the last level of the previous world is delivered AND the player has at least
 *   `world.starsRequired` stars in total.
 * - Collection items unlock from stars, completed worlds, 3★ levels and daily deliveries.
 */

export function totalStars(save: SaveData): number {
  let sum = 0;
  for (const level of LEVELS) sum += save.levels[level.id]?.stars ?? 0;
  return sum;
}

export function worldStars(save: SaveData, world: number): number {
  let sum = 0;
  for (const level of LEVELS.slice(world * LEVELS_PER_WORLD, (world + 1) * LEVELS_PER_WORLD)) sum += save.levels[level.id]?.stars ?? 0;
  return sum;
}

export function isCompleted(save: SaveData, levelId: string): boolean {
  return save.levels[levelId]?.completed === true;
}

export function isWorldComplete(save: SaveData, world: number): boolean {
  return LEVELS.slice(world * LEVELS_PER_WORLD, (world + 1) * LEVELS_PER_WORLD).every((l) => isCompleted(save, l.id));
}

export function isWorldUnlocked(save: SaveData, world: number): boolean {
  if (world <= 0) return true;
  if (world >= WORLDS.length) return false;
  return isCompleted(save, LEVELS[world * LEVELS_PER_WORLD - 1].id) && totalStars(save) >= WORLDS[world].starsRequired;
}

export function worldLockReason(save: SaveData, world: number): string | null {
  if (isWorldUnlocked(save, world)) return null;
  if (!isCompleted(save, LEVELS[world * LEVELS_PER_WORLD - 1].id)) return `Finish ${WORLDS[world - 1].name}`;
  return `Collect ${WORLDS[world].starsRequired} ★ (you have ${totalStars(save)})`;
}

export function isLevelUnlocked(save: SaveData, index: number): boolean {
  if (index < 0 || index >= LEVELS.length) return false;
  const world = Math.floor(index / LEVELS_PER_WORLD);
  if (!isWorldUnlocked(save, world)) return false;
  const required = LEVELS[index].requiredStars ?? 0;
  if (totalStars(save) < required) return false;
  return index % LEVELS_PER_WORLD === 0 || isCompleted(save, LEVELS[index - 1].id);
}

export function nextPlayableLevel(save: SaveData): number {
  let lastUnlocked = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (!isLevelUnlocked(save, i)) continue;
    lastUnlocked = i;
    if (!isCompleted(save, LEVELS[i].id)) return i;
  }
  return lastUnlocked;
}

export function unlockFacts(save: SaveData): UnlockFacts {
  return {
    totalStars: totalStars(save),
    worldsCompleted: WORLDS.map((w) => w.id).filter((w) => isWorldComplete(save, w)),
    dailyCompleted: save.daily.completed,
    threeStarLevels: LEVELS.filter((l) => (save.levels[l.id]?.stars ?? 0) >= 3).length,
  };
}

/** Recomputes the persisted derived fields: stars, unlocked worlds and collection items. */
export function refreshDerived(save: SaveData): SaveData {
  const unlocks = computeUnlocks(save, unlockFacts(save));
  return {
    ...save,
    totalStars: totalStars(save),
    unlockedWorlds: WORLDS.map((w) => w.id).filter((w) => isWorldUnlocked(save, w)),
    unlockedParcels: [...new Set([...save.unlockedParcels, ...unlocks.parcels])],
    unlockedMailboxes: [...new Set([...save.unlockedMailboxes, ...unlocks.mailboxes])],
  };
}

export interface RecordOutcome {
  save: SaveData;
  newBest: boolean;
  previousBest: number;
  starsGained: number;
  firstCompletion: boolean;
  worldsUnlocked: number[];
  newParcels: string[];
  newMailboxes: string[];
}

function diffUnlocks(before: SaveData, after: SaveData): Pick<RecordOutcome, 'worldsUnlocked' | 'newParcels' | 'newMailboxes'> {
  return {
    worldsUnlocked: after.unlockedWorlds.filter((w) => !before.unlockedWorlds.includes(w)),
    newParcels: after.unlockedParcels.filter((p) => !before.unlockedParcels.includes(p)),
    newMailboxes: after.unlockedMailboxes.filter((m) => !before.unlockedMailboxes.includes(m)),
  };
}

/** Applies a campaign result (immutably). */
export function recordLevelResult(save: SaveData, result: LevelResult, playSeconds: number): RecordOutcome {
  const before = refreshDerived(save);
  const previous = save.levels[result.levelId] ?? { completed: false, stars: 0, bestScore: 0, bestImpulses: 0, plays: 0 };
  const score = result.success ? result.breakdown.score : 0;
  const updated = {
    completed: previous.completed || result.success,
    stars: Math.max(previous.stars, result.breakdown.stars),
    bestScore: Math.max(previous.bestScore, score),
    bestImpulses: result.success ? (previous.bestImpulses > 0 ? Math.min(previous.bestImpulses, result.impulses) : result.impulses) : previous.bestImpulses,
    plays: previous.plays + 1,
  };
  const next = refreshDerived({
    ...save,
    levels: { ...save.levels, [result.levelId]: updated },
    stats: {
      deliveries: save.stats.deliveries + (result.success ? 1 : 0),
      impulses: save.stats.impulses + result.impulses,
      playSeconds: save.stats.playSeconds + playSeconds,
    },
  });
  return {
    save: next,
    newBest: result.success && score > previous.bestScore,
    previousBest: previous.bestScore,
    starsGained: updated.stars - previous.stars,
    firstCompletion: result.success && !previous.completed,
    ...diffUnlocks(before, next),
  };
}

/** Applies a daily challenge result. Consecutive days build a streak; the day can be replayed. */
export function recordDailyResult(save: SaveData, key: string, result: LevelResult, yesterdayKey: string): RecordOutcome {
  const before = refreshDerived(save);
  const previous = save.daily.best[key];
  const score = result.success ? result.breakdown.score : 0;
  const best = {
    score: Math.max(previous?.score ?? 0, score),
    stars: Math.max(previous?.stars ?? 0, result.breakdown.stars),
    impulses: result.success ? Math.min(previous?.impulses || Infinity, result.impulses) : (previous?.impulses ?? 0),
    attempts: (previous?.attempts ?? 0) + 1,
  };
  let { streak, lastCompleted, completed } = save.daily;
  if (result.success && lastCompleted !== key) {
    streak = lastCompleted === yesterdayKey ? streak + 1 : 1;
    lastCompleted = key;
    completed++;
  }
  const entries = Object.entries({ ...save.daily.best, [key]: best })
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 60);
  const next = refreshDerived({
    ...save,
    daily: { best: Object.fromEntries(entries), streak, lastCompleted, completed },
    stats: {
      ...save.stats,
      deliveries: save.stats.deliveries + (result.success ? 1 : 0),
      impulses: save.stats.impulses + result.impulses,
    },
  });
  return {
    save: next,
    newBest: result.success && score > (previous?.score ?? 0),
    previousBest: previous?.score ?? 0,
    starsGained: 0,
    firstCompletion: result.success && !previous?.score,
    ...diffUnlocks(before, next),
  };
}
