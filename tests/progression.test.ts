import { describe, expect, it } from 'vitest';

import type { LevelResult } from '../src/game/gameplay/LevelRunner';
import { calculateScore } from '../src/game/gameplay/Scoring';
import { LEVELS, WORLDS } from '../src/game/levels/LevelData';
import { dateKey, generateDailyLevel, mirrorLevel } from '../src/game/progression/DailyChallenge';
import {
  isLevelUnlocked,
  isWorldUnlocked,
  nextPlayableLevel,
  recordDailyResult,
  recordLevelResult,
  totalStars,
} from '../src/game/progression/ProgressionManager';
import { createDefaultSave, MemoryStorage, migrateAndSanitize, SAVE_VERSION, SaveManager, type SaveData } from '../src/game/progression/SaveManager';

function result(levelId: string, stars: 0 | 1 | 2 | 3, impulses = 2): LevelResult {
  const breakdown = { ...calculateScore({ delivered: stars > 0, impulses, par: 2, collisions: 0, damage: 0, timeLeft: 30, timeLimit: 60, wrongMailboxes: 0 }), stars };
  return {
    levelId, success: stars > 0, failReason: stars > 0 ? null : 'time', failMessage: null, breakdown,
    impulses, collisions: 0, damage: 0, timeLeft: 30, timeLimit: 60, wrongMailboxes: 0, distance: 500,
  };
}

function complete(save: SaveData, count: number, stars: 1 | 2 | 3 = 1): SaveData {
  let s = save;
  for (let i = 0; i < count; i++) s = recordLevelResult(s, result(LEVELS[i].id, stars), 20).save;
  return s;
}

describe('Save and load', () => {
  it('round-trips through storage', () => {
    const manager = new SaveManager(new MemoryStorage(), 'k');
    const save = complete(createDefaultSave(), 3, 2);
    manager.save({ ...save, settings: { ...save.settings, leftHanded: true }, selectedParcel: 'classic-envelope' });
    const loaded = manager.load();
    expect(loaded.levels['w1-2']).toMatchObject({ completed: true, stars: 2, bestImpulses: 2 });
    expect(loaded.settings.leftHanded).toBe(true);
    expect(loaded.version).toBe(SAVE_VERSION);
  });

  it('survives corrupted JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('k', '{broken');
    expect(new SaveManager(storage, 'k').load()).toEqual(createDefaultSave());
    expect(storage.getItem('k.corrupt')).toBe('{broken');
  });

  it('sanitises bad values and unknown cosmetics', () => {
    const loaded = migrateAndSanitize({
      version: 2,
      levels: { 'w1-1': { stars: 7, bestScore: 5000, bestImpulses: -3 } },
      selectedParcel: 'does-not-exist',
      unlockedParcels: ['air-mail', 42],
      settings: { sound: 'yes' },
    });
    expect(loaded.levels['w1-1']).toMatchObject({ stars: 3, bestScore: 1000, bestImpulses: 0 });
    expect(loaded.selectedParcel).toBe('classic-envelope');
    expect(loaded.unlockedParcels).toEqual(['classic-envelope', 'air-mail']);
    expect(loaded.settings.sound).toBe(true);
  });

  it('migrates version 1 saves', () => {
    const loaded = migrateAndSanitize({ version: 1, leftHanded: true, levels: { 'w1-1': { stars: 1, completed: true } } });
    expect(loaded.settings.leftHanded).toBe(true);
    expect(loaded.levels['w1-1'].completed).toBe(true);
  });

  it('keeps best score and fewest impulses', () => {
    let save = recordLevelResult(createDefaultSave(), result('w1-1', 3, 2), 10).save;
    save = recordLevelResult(save, result('w1-1', 1, 5), 10).save;
    expect(save.levels['w1-1'].stars).toBe(3);
    expect(save.levels['w1-1'].bestImpulses).toBe(2);
    expect(save.levels['w1-1'].plays).toBe(2);
  });
});

describe('Level unlock rules', () => {
  it('only level 1 is open at first', () => {
    const save = createDefaultSave();
    expect(isLevelUnlocked(save, 0)).toBe(true);
    expect(isLevelUnlocked(save, 1)).toBe(false);
    expect(nextPlayableLevel(save)).toBe(0);
  });

  it('a delivery opens the next level; a failure does not', () => {
    expect(isLevelUnlocked(recordLevelResult(createDefaultSave(), result('w1-1', 1), 1).save, 1)).toBe(true);
    expect(isLevelUnlocked(recordLevelResult(createDefaultSave(), result('w1-1', 0), 1).save, 1)).toBe(false);
  });

  it('worlds need the previous world finished and enough stars', () => {
    let save = complete(createDefaultSave(), 5, 1);
    expect(totalStars(save)).toBe(5);
    expect(isWorldUnlocked(save, 1)).toBe(5 >= WORLDS[1].starsRequired);
    save = complete(save, 10, 1);
    expect(isWorldUnlocked(save, 2)).toBe(10 >= WORLDS[2].starsRequired);
    save = complete(save, 10, 3);
    expect(isWorldUnlocked(save, 2)).toBe(true);
    expect(save.unlockedWorlds).toContain(2);
  });

  it('completing worlds unlocks collection items', () => {
    const outcome = recordLevelResult(complete(createDefaultSave(), 4, 1), result(LEVELS[4].id, 1), 5);
    expect(outcome.newParcels).toContain('pizza-box');
  });
});

describe('Daily challenge', () => {
  it('is deterministic for a date and differs between days', () => {
    expect(generateDailyLevel('2026-10-09')).toEqual(generateDailyLevel('2026-10-09'));
    const days = Array.from({ length: 12 }, (_, i) => generateDailyLevel(`2026-12-${String(i + 1).padStart(2, '0')}`));
    expect(new Set(days.map((d) => `${d.name}/${d.parcel}/${d.start.x}`)).size).toBeGreaterThan(6);
  });

  it('uses local dates as keys', () => {
    expect(dateKey(new Date(2026, 2, 7, 23, 30))).toBe('2026-03-07');
  });

  it('mirroring twice gives the original layout', () => {
    const level = LEVELS[13];
    expect(mirrorLevel(mirrorLevel(level)).obstacles).toEqual(level.obstacles);
  });

  it('saves the personal best and counts attempts and streaks', () => {
    let save = createDefaultSave();
    save = recordDailyResult(save, '2026-10-08', result('daily-a', 2), '2026-10-07').save;
    save = recordDailyResult(save, '2026-10-09', result('daily-b', 0), '2026-10-08').save;
    save = recordDailyResult(save, '2026-10-09', result('daily-b', 3), '2026-10-08').save;
    expect(save.daily.best['2026-10-09'].attempts).toBe(2);
    expect(save.daily.best['2026-10-09'].stars).toBe(3);
    expect(save.daily.streak).toBe(2);
    expect(save.daily.completed).toBe(2);
  });
});
