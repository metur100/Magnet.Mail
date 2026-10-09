import type { ParcelType, ParcelTypeId } from '../physics/ParcelBody';
import type { ObstacleDef } from './ObstacleDefinitions';

export interface Vec2 {
  x: number;
  y: number;
}

/** A magnet source on the map. `angle` turns the horseshoe (radians, 0 = opening downwards). */
export interface MagnetDef extends Vec2 {
  angle?: number;
}

/**
 * Mailbox: x is the centre, y the top of its floor (the parcel rests at y − radius).
 * The opening is `w` wide and `h` tall. Default 120 × 100; later levels use smaller boxes.
 */
export interface MailboxDef extends Vec2 {
  w?: number;
  h?: number;
}

export interface WorldTheme {
  skyTop: number;
  skyBottom: number;
  far: number;
  near: number;
  ground: number;
  wall: number;
  wallEdge: number;
  accent: number;
  /** HUD text colour that reads on the sky. */
  text: string;
}

export interface WorldDefinition {
  id: number;
  key: string;
  name: string;
  tagline: string;
  /** Total stars needed (in addition to finishing the previous world). */
  starsRequired: number;
  scenery: 'neighborhood' | 'city' | 'railway' | 'industrial' | 'airport' | 'space';
  theme: WorldTheme;
}

export interface LevelDefinition {
  /** Stable id used in save data ("w1-3", "daily-2026-10-09", "tutorial-2"). */
  id: string;
  /** Campaign index 0..29 (-1 for tutorial and daily levels). */
  index: number;
  world: number;
  name: string;
  parcel: ParcelTypeId;
  /** Tweaked parcel physics (daily challenges). */
  parcelOverrides?: Partial<Omit<ParcelType, 'id'>>;
  start: Vec2;
  attractor: MagnetDef;
  repeller: MagnetDef;
  /** Field strength multiplier for this level (1 = normal). */
  magnetStrength: number;
  /** Downward gravity in px/s² (default 620; space levels use less). */
  gravity?: number;
  mailbox: MailboxDef;
  /** Wrong mailboxes – entering one bounces the parcel back out with a penalty. */
  decoys?: MailboxDef[];
  /** Fail immediately when a wrong mailbox is entered. */
  wrongFails?: boolean;
  obstacles: ObstacleDef[];
  /** Seconds. */
  timeLimit: number;
  /** Maximum magnet presses (undefined = unlimited). */
  impulseLimit?: number;
  /** Magnetic energy in seconds of full-strength force (undefined = unlimited). */
  energy?: number;
  /** Collisions allowed before the parcel falls apart (undefined = unlimited). */
  maxCollisions?: number;
  /** Impulses an efficient player needs – used for stars and score. */
  par: number;
  /** Magnetic storm: a drifting disturbance force on the parcel. */
  storm?: { strength: number; period: number };
  /** One-line tip shown when the level starts. */
  tutorial?: string;
  /** Tutorial only: reaching this area completes the step instead of a mailbox. */
  goalZone?: { x: number; y: number; w: number; h: number };
  /** Stars needed in total before this level can be played (in addition to the previous level). */
  requiredStars?: number;
  /** Override the world's look (daily challenges). */
  theme?: number;
}
