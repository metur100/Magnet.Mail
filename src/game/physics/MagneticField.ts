import type { ChannelState } from './ParcelBody';

/**
 * Magnetic force
 * ==============
 *
 *   acceleration = BASE · fieldStrength · controlLevel · susceptibility · falloff(d) / mass
 *   falloff(d)   = 1 / (1 + (d / FALLOFF_DISTANCE)²)
 *
 * - attract: towards the attractor source, repel: away from the repeller source
 * - the result is capped at MAX_MAGNETIC_ACCEL, so a parcel can never become uncontrollable
 * - falloff is smooth at d = 0 (no singularity) and halves the force at FALLOFF_DISTANCE
 */
export const BASE_FIELD = 2400;
export const FALLOFF_DISTANCE = 420;
export const MAX_MAGNETIC_ACCEL = 2800;

/** Control dynamics. */
export const TAP_PULSE = 0.22; // a tap keeps the field on at least this long
export const TAP_BOOST = 1.35; // impulse multiplier during the tap pulse
export const HOLD_GROWTH = 0.3; // +30 % strength after holding for HOLD_GROWTH_TIME
export const HOLD_GROWTH_TIME = 1.5;
export const MAX_HOLD = 2.5; // holding longer than this switches the field off until released
export const RISE_TIME = 0.03;
export const DECAY_TIME = 0.12;

export function distanceFalloff(d: number): number {
  const k = d / FALLOFF_DISTANCE;
  return 1 / (1 + k * k);
}

/**
 * Writes the magnetic acceleration on a parcel at (px, py) into out[0], out[1] and returns its size.
 * `direction` is +1 for attraction (towards the source) and −1 for repulsion.
 */
export function magneticAcceleration(
  px: number,
  py: number,
  sx: number,
  sy: number,
  direction: 1 | -1,
  controlLevel: number,
  fieldStrength: number,
  susceptibility: number,
  mass: number,
  out: Float64Array | number[],
): number {
  out[0] = 0;
  out[1] = 0;
  if (controlLevel <= 0 || fieldStrength <= 0) return 0;
  const dx = sx - px;
  const dy = sy - py;
  const d = Math.hypot(dx, dy);
  if (d < 1e-3) return 0;
  const raw = (BASE_FIELD * fieldStrength * controlLevel * susceptibility * distanceFalloff(d)) / mass;
  const a = Math.min(raw, MAX_MAGNETIC_ACCEL);
  out[0] = (direction * dx * a) / d;
  out[1] = (direction * dy * a) / d;
  return a;
}

export interface ChannelLimits {
  /** Impulses still available (Infinity when unlimited). */
  impulsesLeft: number;
  /** Energy left (Infinity when unlimited). */
  energy: number;
}

/**
 * Advances one control channel. Returns true when this step started a new impulse (a press).
 *
 * - press: counts one impulse and starts a pulse of at least TAP_PULSE seconds at TAP_BOOST
 * - hold: the level grows by HOLD_GROWTH over HOLD_GROWTH_TIME, up to MAX_HOLD seconds
 * - release: the level decays exponentially (DECAY_TIME)
 */
export function updateChannel(ch: ChannelState, pressed: boolean, dt: number, limits: ChannelLimits): boolean {
  let started = false;
  if (pressed && !ch.pressed) {
    if (limits.impulsesLeft <= 0 || limits.energy <= 0) {
      ch.blocked = true;
    } else {
      started = true;
      ch.blocked = false;
      ch.exhausted = false;
      ch.holdTime = 0;
      ch.pulseLeft = TAP_PULSE;
    }
  }
  if (!pressed) {
    ch.blocked = false;
    ch.exhausted = false;
  }
  ch.pressed = pressed;

  const holding = pressed && !ch.blocked && !ch.exhausted;
  if (holding) {
    ch.holdTime += dt;
    if (ch.holdTime > MAX_HOLD) ch.exhausted = true;
  }
  if (ch.pulseLeft > 0) ch.pulseLeft = Math.max(0, ch.pulseLeft - dt);

  const active = (holding && !ch.exhausted) || ch.pulseLeft > 0;
  let target = 0;
  if (active && limits.energy > 0) {
    const growth = 1 + HOLD_GROWTH * Math.min(ch.holdTime / HOLD_GROWTH_TIME, 1);
    const boost = ch.pulseLeft > 0 ? TAP_BOOST : 1;
    target = growth * boost;
  }
  const tau = target > ch.level ? RISE_TIME : DECAY_TIME;
  ch.level += (target - ch.level) * (1 - Math.exp(-dt / tau));
  if (ch.level < 0.005 && target === 0) ch.level = 0;
  return started;
}
