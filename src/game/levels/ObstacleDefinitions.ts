/**
 * Obstacle data. Rectangles are given by their centre (x, y), width, height and optional rotation
 * (radians) in arena units (720 × 960, y down). Everything that moves is a pure function of time,
 * so the simulation is fully deterministic.
 */

export type MotionMode = 'sine' | 'hold';

export type ObstacleDef =
  /** Solid static block. `style` only changes the look. */
  | { type: 'wall'; x: number; y: number; w: number; h: number; angle?: number; style?: 'wall' | 'building' | 'crate' | 'pipe' }
  /** Soft round bumper – very bouncy. */
  | { type: 'bumper'; x: number; y: number; r: number }
  /** Deadly spikes on the top side of the box (rotate with `angle`). */
  | { type: 'spikes'; x: number; y: number; w: number; h: number; angle?: number }
  /**
   * Block moving between its position and position + (dx, dy).
   * `kind` only changes the look: platform, elevator, sliding gate, timed door, luggage cart.
   */
  | {
      type: 'platform';
      x: number;
      y: number;
      w: number;
      h: number;
      dx: number;
      dy: number;
      period: number;
      phase?: number;
      motion?: MotionMode;
      kind?: 'platform' | 'elevator' | 'gate' | 'door' | 'cart';
    }
  /** Bar rotating around its centre at `speed` rad/s. */
  | { type: 'rotor'; x: number; y: number; length: number; thickness?: number; speed: number; angle?: number }
  /** Belt that carries a resting parcel at `speed` px/s (positive = to the right). */
  | { type: 'conveyor'; x: number; y: number; w: number; h?: number; speed: number; kind?: 'belt' | 'luggage' }
  /** One-way gate: the parcel passes when moving along (allowX, allowY), otherwise it is solid. */
  | { type: 'oneway'; x: number; y: number; w: number; h: number; allowX: number; allowY: number }
  /** Magnetic barrier: the parcel passes through, but magnetic fields cannot cross it. */
  | { type: 'barrier'; x: number; y: number; w: number; h: number; angle?: number }
  /**
   * Train or car crossing horizontally at height y. It drives from `from` to `to` at `speed`, then
   * stays off-screen until the cycle (`period` seconds) repeats.
   */
  | { type: 'train'; y: number; w: number; h: number; from: number; to: number; speed: number; period: number; phase?: number; kind?: 'train' | 'car' }
  /** Airflow / wind zone. */
  | { type: 'wind'; x: number; y: number; w: number; h: number; fx: number; fy: number }
  /** Pair of teleporters: entering one exits the other with the same velocity. */
  | { type: 'teleporter'; ax: number; ay: number; bx: number; by: number; r?: number }
  /** Area with its own gravity vector (low / high / sideways gravity). */
  | { type: 'gravity'; x: number; y: number; w: number; h: number; gx: number; gy: number }
  /** Floating round obstacle drifting on a sine path. */
  | { type: 'floater'; x: number; y: number; r: number; dx: number; dy: number; period: number; phase?: number };

export type ObstacleType = ObstacleDef['type'];

const frac = (v: number) => v - Math.floor(v);
const smooth = (x: number) => x * x * (3 - 2 * x);
const smoothDerivative = (x: number) => 6 * x * (1 - x);

/**
 * Progress (0..1) of a mover and its rate (1/s).
 * - sine: smooth back-and-forth
 * - hold: waits at each end (35 % of the cycle each), then glides across (15 % each way) – doors and gates
 */
export function moverProgress(t: number, period: number, phase: number, motion: MotionMode, out: { s: number; ds: number }): void {
  const u = frac(t / period + phase);
  if (motion === 'sine') {
    out.s = (1 - Math.cos(2 * Math.PI * u)) / 2;
    out.ds = (Math.PI * Math.sin(2 * Math.PI * u)) / period;
    return;
  }
  const move = 0.15;
  if (u < 0.35) {
    out.s = 0;
    out.ds = 0;
  } else if (u < 0.35 + move) {
    const k = (u - 0.35) / move;
    out.s = smooth(k);
    out.ds = smoothDerivative(k) / (move * period);
  } else if (u < 0.85) {
    out.s = 1;
    out.ds = 0;
  } else {
    const k = (u - 0.85) / move;
    out.s = 1 - smooth(k);
    out.ds = -smoothDerivative(k) / (move * period);
  }
}

/** Train position at time t; returns false while it is off-screen. */
export function trainPose(def: Extract<ObstacleDef, { type: 'train' }>, t: number, out: { x: number; vx: number }): boolean {
  const travel = Math.abs(def.to - def.from) / def.speed;
  const inCycle = frac(t / def.period + (def.phase ?? 0)) * def.period;
  if (inCycle > travel) return false;
  const dir = Math.sign(def.to - def.from) || 1;
  out.x = def.from + dir * def.speed * inCycle;
  out.vx = dir * def.speed;
  return true;
}
