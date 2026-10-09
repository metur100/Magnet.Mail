import { ARENA_HEIGHT, ARENA_WIDTH } from '../utils/Constants';
import { LEVELS, LEVELS_PER_WORLD, WORLDS } from './LevelData';
import type { LevelDefinition, WorldDefinition } from './LevelDefinition';

export function getWorld(id: number): WorldDefinition {
  return WORLDS[Math.max(0, Math.min(WORLDS.length - 1, id))];
}

export function getLevel(index: number): LevelDefinition | undefined {
  return LEVELS[index];
}

export function getLevelById(id: string): LevelDefinition | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelsInWorld(world: number): LevelDefinition[] {
  return LEVELS.slice(world * LEVELS_PER_WORLD, (world + 1) * LEVELS_PER_WORLD);
}

/** "2-3" style label. */
export function levelLabel(level: LevelDefinition): string {
  return level.index < 0 ? level.name : `${level.world + 1}-${(level.index % LEVELS_PER_WORLD) + 1}`;
}

/**
 * Fits the 720 × 960 arena into the space between the HUD and the controls, centred horizontally.
 * It never scales up, so obstacle sizes stay consistent on tall phones.
 */
export function fitArena(screenWidth: number, top: number, bottom: number): { x: number; y: number; scale: number } {
  const available = Math.max(200, bottom - top);
  const scale = Math.min(1, available / ARENA_HEIGHT, screenWidth / ARENA_WIDTH);
  return {
    scale,
    x: (screenWidth - ARENA_WIDTH * scale) / 2,
    y: top + (available - ARENA_HEIGHT * scale) / 2,
  };
}

/** Basic sanity checks used by tests and the level editor workflow. */
export function validateLevel(level: LevelDefinition): string[] {
  const problems: string[] = [];
  const inside = (x: number, y: number) => x >= 0 && x <= ARENA_WIDTH && y >= 0 && y <= ARENA_HEIGHT + 60;
  if (!inside(level.start.x, level.start.y)) problems.push('start outside the arena');
  if (!level.goalZone && !inside(level.mailbox.x, level.mailbox.y)) problems.push('mailbox outside the arena');
  if (!inside(level.attractor.x, level.attractor.y)) problems.push('attractor outside the arena');
  if (!inside(level.repeller.x, level.repeller.y)) problems.push('repeller outside the arena');
  if (level.par < 1) problems.push('par must be at least 1');
  if (level.impulseLimit !== undefined && level.impulseLimit < level.par) problems.push('impulse limit below par');
  if (level.timeLimit < 20) problems.push('time limit too short');
  return problems;
}
