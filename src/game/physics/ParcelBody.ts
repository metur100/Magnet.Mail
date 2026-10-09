/**
 * Parcel physics types and the mutable simulation state.
 *
 * Everything that changes during a level lives in one flat `SimState` object. Moving obstacles are
 * pure functions of time, so copying a SimState is enough to snapshot the whole world – the hint
 * solver relies on this.
 */

export type ParcelTypeId = 'envelope' | 'box' | 'crate' | 'glass' | 'bouncy' | 'magnetic';

export interface ParcelType {
  id: ParcelTypeId;
  name: string;
  description: string;
  mass: number;
  /** Collision radius (the parcel is drawn as a rounded box of about this size). */
  radius: number;
  /** Bounciness 0..1. */
  restitution: number;
  /** Exponential air resistance per second. */
  airDrag: number;
  /** Surface friction per contact step (0..1). */
  friction: number;
  maxSpeed: number;
  /** How strongly magnetic fields affect it. */
  susceptibility: number;
  /** Constant weak pull towards the attractor (magnetic parcels only). */
  passivePull: number;
  /** Impacts above this speed (px/s) cause damage. */
  impactTolerance: number;
  /** Damage per px/s above the tolerance. */
  fragility: number;
}

export const PARCEL_TYPES: Record<ParcelTypeId, ParcelType> = {
  envelope: {
    id: 'envelope', name: 'Envelope', description: 'Light and fast – hard to stop',
    mass: 0.6, radius: 19, restitution: 0.3, airDrag: 0.55, friction: 0.012, maxSpeed: 980,
    susceptibility: 1, passivePull: 0, impactTolerance: 700, fragility: 0.25,
  },
  box: {
    id: 'box', name: 'Standard Box', description: 'Balanced and reliable',
    mass: 1, radius: 24, restitution: 0.22, airDrag: 0.4, friction: 0.02, maxSpeed: 880,
    susceptibility: 1, passivePull: 0, impactTolerance: 760, fragility: 0.25,
  },
  crate: {
    id: 'crate', name: 'Heavy Crate', description: 'Needs strong magnets',
    mass: 2.1, radius: 29, restitution: 0.08, airDrag: 0.3, friction: 0.03, maxSpeed: 720,
    susceptibility: 1, passivePull: 0, impactTolerance: 900, fragility: 0.2,
  },
  glass: {
    id: 'glass', name: 'Fragile Glass', description: 'Hard hits break it',
    mass: 0.9, radius: 23, restitution: 0.18, airDrag: 0.45, friction: 0.02, maxSpeed: 850,
    susceptibility: 1, passivePull: 0, impactTolerance: 420, fragility: 0.32,
  },
  bouncy: {
    id: 'bouncy', name: 'Bouncy Package', description: 'Springs off every wall',
    mass: 0.8, radius: 23, restitution: 0.78, airDrag: 0.35, friction: 0.01, maxSpeed: 900,
    susceptibility: 1, passivePull: 0, impactTolerance: 1100, fragility: 0.15,
  },
  magnetic: {
    id: 'magnetic', name: 'Magnetic Package', description: 'Extra sensitive to fields',
    mass: 1, radius: 24, restitution: 0.22, airDrag: 0.4, friction: 0.02, maxSpeed: 900,
    susceptibility: 1.75, passivePull: 0.04, impactTolerance: 760, fragility: 0.25,
  },
};

export type FailReason = 'spikes' | 'out' | 'train' | 'car' | 'collisions' | 'wrong' | 'broken' | 'time' | 'impulses' | 'energy';

export const FAIL_MESSAGES: Record<FailReason, string> = {
  spikes: 'The parcel was popped by spikes.',
  out: 'The parcel flew out of the delivery area.',
  train: 'The parcel was hit by a train.',
  car: 'The parcel was hit by a car.',
  collisions: 'Too many collisions – the parcel fell apart.',
  wrong: 'Delivered to the wrong mailbox.',
  broken: 'The parcel broke from a hard impact.',
  time: 'Time ran out before the delivery.',
  impulses: 'Out of magnetic impulses.',
  energy: 'Out of magnetic energy.',
};

export interface ChannelState {
  /** Is the control currently held down? */
  pressed: boolean;
  /** Current force level (0 when idle, about 1–1.35 while active). */
  level: number;
  /** Seconds the current press has been held. */
  holdTime: number;
  /** Remaining time of the minimum tap pulse. */
  pulseLeft: number;
  /** Held longer than the maximum hold – inactive until released. */
  exhausted: boolean;
  /** Press was refused (no impulses / energy) – inactive until released. */
  blocked: boolean;
}

export type SimStatus = 'flying' | 'delivered' | 'failed';

export interface SimState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  angularVelocity: number;
  damage: number;
  collisions: number;
  impulses: number;
  /** Remaining magnetic energy in seconds of full force (Infinity when unlimited). */
  energy: number;
  attract: ChannelState;
  repel: ChannelState;
  status: SimStatus;
  failReason: FailReason | null;
  /** Time spent resting inside the correct mailbox. */
  deliverHold: number;
  inMailbox: boolean;
  wrongCount: number;
  wrongCooldown: number;
  teleportCooldown: number;
  impactCooldown: number;
  grounded: boolean;
  /** Seconds the parcel has been stuck with no way to move (no impulses / energy left). */
  stuckTime: number;
  distance: number;
}

const channel = (): ChannelState => ({ pressed: false, level: 0, holdTime: 0, pulseLeft: 0, exhausted: false, blocked: false });

export function createSimState(x: number, y: number, energy: number): SimState {
  return {
    t: 0, x, y, vx: 0, vy: 0, angle: 0, angularVelocity: 0, damage: 0, collisions: 0, impulses: 0,
    energy, attract: channel(), repel: channel(), status: 'flying', failReason: null,
    deliverHold: 0, inMailbox: false, wrongCount: 0, wrongCooldown: 0, teleportCooldown: 0,
    impactCooldown: 0, grounded: false, stuckTime: 0, distance: 0,
  };
}

function copyChannel(dst: ChannelState, src: ChannelState): void {
  dst.pressed = src.pressed;
  dst.level = src.level;
  dst.holdTime = src.holdTime;
  dst.pulseLeft = src.pulseLeft;
  dst.exhausted = src.exhausted;
  dst.blocked = src.blocked;
}

/** Copies every field without allocating. */
export function copySimState(dst: SimState, src: SimState): SimState {
  dst.t = src.t;
  dst.x = src.x;
  dst.y = src.y;
  dst.vx = src.vx;
  dst.vy = src.vy;
  dst.angle = src.angle;
  dst.angularVelocity = src.angularVelocity;
  dst.damage = src.damage;
  dst.collisions = src.collisions;
  dst.impulses = src.impulses;
  dst.energy = src.energy;
  copyChannel(dst.attract, src.attract);
  copyChannel(dst.repel, src.repel);
  dst.status = src.status;
  dst.failReason = src.failReason;
  dst.deliverHold = src.deliverHold;
  dst.inMailbox = src.inMailbox;
  dst.wrongCount = src.wrongCount;
  dst.wrongCooldown = src.wrongCooldown;
  dst.teleportCooldown = src.teleportCooldown;
  dst.impactCooldown = src.impactCooldown;
  dst.grounded = src.grounded;
  dst.stuckTime = src.stuckTime;
  dst.distance = src.distance;
  return dst;
}

export function cloneSimState(src: SimState): SimState {
  return copySimState(createSimState(0, 0, 0), src);
}

export function speedOf(state: SimState): number {
  return Math.hypot(state.vx, state.vy);
}
