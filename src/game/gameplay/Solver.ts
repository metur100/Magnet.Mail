import type { LevelDefinition } from '../levels/LevelDefinition';
import { cloneSimState, copySimState, createSimState, type SimState } from '../physics/ParcelBody';
import { createEvents, PhysicsWorld, type StepInput } from '../physics/PhysicsWorld';
import { ARENA_HEIGHT, ARENA_WIDTH, PHYSICS_STEP } from '../utils/Constants';

/**
 * Beam-search route planner. Because the simulation is deterministic and the whole world state is a
 * SimState, we can try sequences of control actions and keep the most promising ones.
 *
 * Used for the "Retry with hint" route preview and by `npm run solve:levels`, which proves every
 * level can be completed and suggests par impulse counts.
 */
export const Action = {
  None: 0,
  TapAttract: 1,
  TapRepel: 2,
  HoldAttract: 3,
  HoldRepel: 4,
} as const;
export type Action = (typeof Action)[keyof typeof Action];

const ACTIONS: Action[] = [Action.None, Action.TapAttract, Action.TapRepel, Action.HoldAttract, Action.HoldRepel];

export interface SolveOptions {
  beamWidth?: number;
  /** Seconds between decisions. */
  decision?: number;
  /** Stop searching after this much wall time (ms). */
  budgetMs?: number;
  /** Start from this state instead of the level start. */
  from?: SimState;
  /** Restrict the controls (tutorial steps that only enable one magnet). */
  actions?: Action[];
}

export interface SolveResult {
  success: boolean;
  actions: Action[];
  impulses: number;
  time: number;
  collisions: number;
  /** Route samples (x, y pairs) of the best attempt. */
  path: number[];
  /** Where each press happens along the route: [x, y, action] triples. */
  presses: number[];
  explored: number;
}

interface Node {
  state: SimState;
  actions: Action[];
  cost: number;
}

/** Geodesic distance (in cells) from every cell to the mailbox, ignoring moving obstacles. */
function distanceField(world: PhysicsWorld, cell: number): { field: Float32Array; cols: number; rows: number } {
  const cols = Math.ceil(ARENA_WIDTH / cell);
  const rows = Math.ceil(ARENA_HEIGHT / cell);
  const blocked = new Uint8Array(cols * rows);
  const r = world.parcel.radius * 0.8;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col + 0.5) * cell;
      const y = (row + 0.5) * cell;
      for (const c of world.colliders) {
        if (c.def && (c.kind === 'platform' || c.kind === 'train' || c.kind === 'rotor' || c.kind === 'floater' || c.kind === 'oneway')) continue;
        if (c.shape === 'box') {
          const dx = x - c.cx;
          const dy = y - c.cy;
          const lx = Math.abs(dx * c.cos + dy * c.sin);
          const ly = Math.abs(-dx * c.sin + dy * c.cos);
          if (lx < c.hw + r && ly < c.hh + r) blocked[row * cols + col] = 1;
        } else if (c.shape === 'circle' && (x - c.cx) ** 2 + (y - c.cy) ** 2 < (c.r + r) ** 2) {
          blocked[row * cols + col] = 1;
        }
      }
    }
  }
  const field = new Float32Array(cols * rows).fill(1e6);
  const goal = world.level.goalZone ?? { x: world.level.mailbox.x, y: world.level.mailbox.y - world.parcel.radius - 4 };
  const gc = Math.min(cols - 1, Math.max(0, Math.floor(goal.x / cell)));
  const gr = Math.min(rows - 1, Math.max(0, Math.floor(goal.y / cell)));
  const queue = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;
  field[gr * cols + gc] = 0;
  queue[tail++] = gr * cols + gc;
  while (head < tail) {
    const k = queue[head++];
    const col = k % cols;
    const row = (k - col) / cols;
    for (const [dc, dr, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [-1, 1, 1.41], [1, -1, 1.41], [-1, -1, 1.41]]) {
      const c2 = col + dc;
      const r2 = row + dr;
      if (c2 < 0 || r2 < 0 || c2 >= cols || r2 >= rows) continue;
      const k2 = r2 * cols + c2;
      if (blocked[k2] && !(k2 === gr * cols + gc)) continue;
      const nd = field[k] + w;
      if (nd < field[k2]) {
        field[k2] = nd;
        queue[tail++] = k2;
        if (tail >= queue.length) tail = queue.length - 1;
      }
    }
  }
  return { field, cols, rows };
}

export class Solver {
  private readonly world: PhysicsWorld;
  private readonly cell = 20;
  private readonly field: Float32Array;
  private readonly cols: number;
  private readonly rows: number;
  private readonly events = createEvents();
  private readonly input: StepInput = { attract: false, repel: false };

  constructor(readonly level: LevelDefinition) {
    this.world = new PhysicsWorld(level);
    const df = distanceField(this.world, this.cell);
    this.field = df.field;
    this.cols = df.cols;
    this.rows = df.rows;
  }

  private distance(x: number, y: number): number {
    const col = Math.floor(x / this.cell);
    const row = Math.floor(y / this.cell);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return 2000;
    let best = this.field[row * this.cols + col];
    if (best >= 1e6) {
      // Inside an inflated wall cell: use the best neighbour.
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const c = col + dc;
          const r = row + dr;
          if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) continue;
          best = Math.min(best, this.field[r * this.cols + c] + 2);
        }
      }
    }
    return best >= 1e6 ? 2000 : best * this.cell;
  }

  private cost(s: SimState): number {
    const d = this.distance(s.x, s.y);
    const speed = Math.hypot(s.vx, s.vy);
    // Close to the goal, prefer slow parcels (they can settle in the mailbox).
    const settle = d < 160 ? speed * 0.35 : 0;
    return d + settle + s.impulses * 18 + s.collisions * 6 + s.damage * 2;
  }

  /** Simulates one decision interval with an action. Returns false if the parcel failed. */
  private simulate(s: SimState, action: Action, previous: Action, decision: number): boolean {
    const steps = Math.round(decision / PHYSICS_STEP);
    for (let i = 0; i < steps; i++) {
      // Step 0 is released so a new press is always detected (a tap after a hold, two taps in a row).
      const keepHolding = i > 0 || action === previous;
      this.input.attract = (action === Action.HoldAttract && keepHolding) || (action === Action.TapAttract && i === 1);
      this.input.repel = (action === Action.HoldRepel && keepHolding) || (action === Action.TapRepel && i === 1);
      this.world.step(s, this.input, PHYSICS_STEP, this.events);
      if (s.status === 'failed') return false;
      if (s.status === 'delivered') return true;
    }
    return true;
  }

  solve(options: SolveOptions = {}): SolveResult {
    const beamWidth = options.beamWidth ?? 140;
    const decision = options.decision ?? 0.25;
    const deadline = performance.now() + (options.budgetMs ?? 30000);
    const start = options.from
      ? cloneSimState(options.from)
      : createSimState(this.level.start.x, this.level.start.y, this.level.energy ?? Infinity);
    let beam: Node[] = [{ state: start, actions: [], cost: this.cost(start) }];
    let best: Node = beam[0];
    let explored = 0;
    const maxDecisions = Math.ceil((this.level.timeLimit - start.t) / decision);
    const allowed = options.actions ?? ACTIONS;

    for (let depth = 0; depth < maxDecisions; depth++) {
      const next: Node[] = [];
      const seen = new Set<string>();
      for (const node of beam) {
        const previous = node.actions.length ? node.actions[node.actions.length - 1] : Action.None;
        for (const action of allowed) {
          const s = copySimState(createSimState(0, 0, 0), node.state);
          const alive = this.simulate(s, action, previous, decision);
          explored++;
          if (!alive) continue;
          const actions = node.actions.concat(action);
          if (s.status === 'delivered') return this.finish(start, actions, decision, explored);
          const key = `${Math.round(s.x / 12)},${Math.round(s.y / 12)},${Math.round(s.vx / 70)},${Math.round(s.vy / 70)},${s.attract.level > 0.05 ? 1 : 0}${s.repel.level > 0.05 ? 1 : 0}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const cost = this.cost(s);
          next.push({ state: s, actions, cost });
        }
      }
      if (next.length === 0) break;
      next.sort((a, b) => a.cost - b.cost);
      beam = next.slice(0, beamWidth);
      if (beam[0].cost < best.cost) best = beam[0];
      if (performance.now() > deadline) break;
    }
    const result = this.replay(start, best.actions, decision);
    return { ...result, success: false, explored };
  }

  private finish(start: SimState, actions: Action[], decision: number, explored: number): SolveResult {
    return { ...this.replay(start, actions, decision), success: true, explored };
  }

  /** Re-runs an action list to record its path and press positions. */
  replay(start: SimState, actions: Action[], decision: number): Omit<SolveResult, 'explored'> {
    const s = cloneSimState(start);
    const path: number[] = [s.x, s.y];
    const presses: number[] = [];
    let previous: Action = Action.None;
    for (const action of actions) {
      const before = s.impulses;
      const bx = s.x;
      const by = s.y;
      this.simulate(s, action, previous, decision);
      if (s.impulses > before) presses.push(bx, by, action);
      path.push(s.x, s.y);
      previous = action;
      if (s.status !== 'flying') break;
    }
    return { success: s.status === 'delivered', actions, impulses: s.impulses, time: s.t, collisions: s.collisions, path, presses };
  }
}
