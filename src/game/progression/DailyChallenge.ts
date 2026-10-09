import { LEVELS } from '../levels/LevelData';
import type { LevelDefinition } from '../levels/LevelDefinition';
import type { ObstacleDef } from '../levels/ObstacleDefinitions';
import { PARCEL_TYPES, type ParcelTypeId } from '../physics/ParcelBody';
import { ARENA_WIDTH } from '../utils/Constants';
import { hashString, Rng } from '../utils/MathUtils';

/** Local calendar date as YYYY-MM-DD – the daily seed. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Campaign layouts that make good daily challenges (verified by `npm run solve:levels`). */
export const DAILY_LAYOUTS = ['w1-3', 'w1-4', 'w1-5', 'w2-1', 'w2-3', 'w2-4', 'w4-1', 'w4-2', 'w5-1', 'w5-2', 'w6-1', 'w6-3'];

const DAILY_PARCELS: ParcelTypeId[] = ['envelope', 'box', 'bouncy', 'magnetic', 'glass', 'crate'];

const PARCEL_ADJECTIVE: Record<ParcelTypeId, string> = {
  envelope: 'Featherweight',
  box: 'Classic',
  crate: 'Heavyweight',
  glass: 'Fragile',
  bouncy: 'Springy',
  magnetic: 'Supercharged',
};

const mx = (x: number) => ARENA_WIDTH - x;

/** Mirrors an obstacle left ↔ right. */
export function mirrorObstacle(o: ObstacleDef): ObstacleDef {
  switch (o.type) {
    case 'wall':
    case 'spikes':
    case 'barrier':
      return { ...o, x: mx(o.x), angle: o.angle ? -o.angle : o.angle };
    case 'bumper':
      return { ...o, x: mx(o.x) };
    case 'platform':
      return { ...o, x: mx(o.x), dx: -o.dx };
    case 'rotor':
      return { ...o, x: mx(o.x), speed: -o.speed, angle: o.angle ? -o.angle : o.angle };
    case 'conveyor':
      return { ...o, x: mx(o.x), speed: -o.speed };
    case 'oneway':
      return { ...o, x: mx(o.x), allowX: -o.allowX };
    case 'train':
      return { ...o, from: mx(o.from), to: mx(o.to) };
    case 'wind':
      return { ...o, x: mx(o.x), fx: -o.fx };
    case 'gravity':
      return { ...o, x: mx(o.x), gx: -o.gx };
    case 'teleporter':
      return { ...o, ax: mx(o.ax), bx: mx(o.bx) };
    case 'floater':
      return { ...o, x: mx(o.x), dx: -o.dx };
  }
}

export function mirrorLevel(level: LevelDefinition): LevelDefinition {
  return {
    ...level,
    start: { ...level.start, x: mx(level.start.x) },
    attractor: { ...level.attractor, x: mx(level.attractor.x) },
    repeller: { ...level.repeller, x: mx(level.repeller.x) },
    mailbox: { ...level.mailbox, x: mx(level.mailbox.x) },
    decoys: level.decoys?.map((d) => ({ ...d, x: mx(d.x) })),
    goalZone: level.goalZone ? { ...level.goalZone, x: mx(level.goalZone.x) } : undefined,
    obstacles: level.obstacles.map(mirrorObstacle),
  };
}

/**
 * Builds the daily challenge for a date: a campaign layout (maybe mirrored) with an unusual parcel –
 * a different parcel type with tweaked mass and bounce, and slightly different gravity. The same date
 * gives the same challenge on every device. `variant` produces a second level for the same day
 * (bonus daily delivery).
 */
export function generateDailyLevel(key: string, variant = ''): LevelDefinition {
  const rng = new Rng(hashString(`magnet-mail:daily:${key}${variant}`));
  const sourceId = rng.pick(DAILY_LAYOUTS);
  const source = LEVELS.find((l) => l.id === sourceId) as LevelDefinition;
  const mirrored = rng.chance(0.5);
  const parcel = rng.pick(DAILY_PARCELS);
  const type = PARCEL_TYPES[parcel];
  const massScale = rng.range(0.85, 1.2);
  const layout = mirrored ? mirrorLevel(source) : source;
  // Keep the magnets strong enough for the new parcel relative to the layout's original parcel.
  const strength = layout.magnetStrength * Math.max(1, (type.mass * massScale) / PARCEL_TYPES[source.parcel].mass);
  const level: LevelDefinition = {
    ...layout,
    id: `daily-${key}${variant ? `-${variant}` : ''}`,
    index: -1,
    name: `${PARCEL_ADJECTIVE[parcel]} ${source.name}`,
    parcel,
    parcelOverrides: {
      mass: type.mass * massScale,
      restitution: Math.min(0.85, type.restitution * rng.range(0.9, 1.4)),
    },
    magnetStrength: strength,
    gravity: (source.gravity ?? 620) * rng.range(0.85, 1.1),
    // Rest the parcel on the floor of its start spot whatever its size.
    start: { x: layout.start.x, y: layout.start.y + PARCEL_TYPES[source.parcel].radius - type.radius },
    impulseLimit: undefined,
    energy: undefined,
    maxCollisions: undefined,
    timeLimit: source.timeLimit + 20,
    par: source.par + 1,
    tutorial: undefined,
    theme: source.world,
  };
  return level;
}
