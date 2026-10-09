import { describe, expect, it } from 'vitest';

import { LevelRunner } from '../src/game/gameplay/LevelRunner';
import { LEVELS, LEVELS_PER_WORLD, WORLDS } from '../src/game/levels/LevelData';
import { validateLevel } from '../src/game/levels/LevelManager';
import { TUTORIAL_STEPS } from '../src/game/levels/TutorialData';
import { PARCEL_TYPES } from '../src/game/physics/ParcelBody';
import { generateDailyLevel } from '../src/game/progression/DailyChallenge';

describe('Level data', () => {
  it('has 30 levels in 6 worlds of 5', () => {
    expect(LEVELS).toHaveLength(30);
    expect(WORLDS).toHaveLength(6);
    LEVELS.forEach((l, i) => {
      expect(l.index).toBe(i);
      expect(l.world).toBe(Math.floor(i / LEVELS_PER_WORLD));
    });
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(30);
  });

  it('every level passes validation and loads', () => {
    for (const level of [...LEVELS, ...TUTORIAL_STEPS.map((t) => t.level)]) {
      expect(validateLevel(level), level.id).toEqual([]);
      const r = new LevelRunner(level);
      for (let i = 0; i < 60; i++) r.stepOnce();
      expect(r.state.status, level.id).toBe('flying');
    }
  });

  it('parcels start resting on a surface (not inside a wall)', () => {
    for (const level of LEVELS) {
      const r = new LevelRunner(level);
      for (let i = 0; i < 120; i++) r.stepOnce();
      expect(Math.abs(r.state.y - level.start.y), level.id).toBeLessThan(PARCEL_TYPES[level.parcel].radius);
    }
  });

  it('worlds introduce the parcel types in order', () => {
    const firstParcel = WORLDS.map((w) => LEVELS[w.id * LEVELS_PER_WORLD].parcel);
    expect(firstParcel).toEqual(['envelope', 'box', 'crate', 'glass', 'bouncy', 'magnetic']);
  });

  it('daily levels are valid for a whole month', () => {
    for (let d = 1; d <= 31; d++) {
      const level = generateDailyLevel(`2027-01-${String(d).padStart(2, '0')}`);
      expect(validateLevel(level)).toEqual([]);
      const r = new LevelRunner(level);
      for (let i = 0; i < 60; i++) r.stepOnce();
      expect(r.state.status).toBe('flying');
    }
  });
});
