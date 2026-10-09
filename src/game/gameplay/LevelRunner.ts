import type { LevelDefinition } from '../levels/LevelDefinition';
import { createSimState, FAIL_MESSAGES, type FailReason, type SimState } from '../physics/ParcelBody';
import { createEvents, PhysicsWorld, type StepEvents, type StepInput } from '../physics/PhysicsWorld';
import { PHYSICS_STEP } from '../utils/Constants';
import { calculateScore, type ScoreBreakdown } from './Scoring';

export interface LevelResult {
  levelId: string;
  success: boolean;
  failReason: FailReason | null;
  failMessage: string | null;
  breakdown: ScoreBreakdown;
  impulses: number;
  collisions: number;
  damage: number;
  timeLeft: number;
  timeLimit: number;
  wrongMailboxes: number;
  distance: number;
}

/** Path samples kept for the success replay (x, y pairs at 30 Hz). */
const PATH_SAMPLE = 1 / 30;
const MAX_PATH = 30 * 180;

/**
 * Engine-independent level session: owns the physics world and state, collects the events of each
 * frame for effects and builds the result. Used by the gameplay scene, the tutorial and tests.
 */
export class LevelRunner {
  readonly world: PhysicsWorld;
  readonly state: SimState;
  readonly input: StepInput = { attract: false, repel: false };
  /** Events accumulated since the last `takeEvents()`. */
  readonly frameEvents: StepEvents = createEvents();
  readonly path: number[] = [];
  paused = false;
  private readonly stepEvents: StepEvents = createEvents();
  private accumulator = 0;
  private pathTimer = 0;
  private result: LevelResult | null = null;

  constructor(readonly level: LevelDefinition) {
    this.world = new PhysicsWorld(level);
    this.state = createSimState(level.start.x, level.start.y, level.energy ?? Infinity);
    this.path.push(this.state.x, this.state.y);
  }

  get finished(): boolean {
    return this.state.status !== 'flying';
  }

  get timeLeft(): number {
    return Math.max(0, this.level.timeLimit - this.state.t);
  }

  get impulsesLeft(): number {
    return this.world.impulsesLeft(this.state);
  }

  /** Advances by real elapsed time using fixed physics steps. */
  update(dt: number, maxSteps = 8): void {
    if (this.paused || this.finished) return;
    this.accumulator += Math.min(dt, 0.1);
    let steps = 0;
    while (this.accumulator >= PHYSICS_STEP && steps < maxSteps) {
      this.stepOnce();
      this.accumulator -= PHYSICS_STEP;
      steps++;
      if (this.finished) break;
    }
    if (steps === maxSteps) this.accumulator = 0;
  }

  stepOnce(): void {
    this.world.step(this.state, this.input, PHYSICS_STEP, this.stepEvents);
    const ev = this.stepEvents;
    this.frameEvents.flags |= ev.flags;
    if (ev.impactSpeed > this.frameEvents.impactSpeed) {
      this.frameEvents.impactSpeed = ev.impactSpeed;
      this.frameEvents.impactX = ev.impactX;
      this.frameEvents.impactY = ev.impactY;
    }
    this.pathTimer += PHYSICS_STEP;
    if (this.pathTimer >= PATH_SAMPLE && this.path.length < MAX_PATH * 2) {
      this.pathTimer = 0;
      this.path.push(this.state.x, this.state.y);
    }
  }

  /** Returns this frame's accumulated events and clears them. */
  takeEvents(out: StepEvents): StepEvents {
    out.flags = this.frameEvents.flags;
    out.impactSpeed = this.frameEvents.impactSpeed;
    out.impactX = this.frameEvents.impactX;
    out.impactY = this.frameEvents.impactY;
    this.frameEvents.flags = 0;
    this.frameEvents.impactSpeed = 0;
    return out;
  }

  getResult(): LevelResult | null {
    if (!this.finished) return null;
    if (this.result) return this.result;
    const s = this.state;
    const success = s.status === 'delivered';
    const breakdown = calculateScore({
      delivered: success,
      impulses: s.impulses,
      par: this.level.par,
      collisions: s.collisions,
      damage: s.damage,
      timeLeft: this.timeLeft,
      timeLimit: this.level.timeLimit,
      wrongMailboxes: s.wrongCount,
    });
    this.result = {
      levelId: this.level.id,
      success,
      failReason: s.failReason,
      failMessage: s.failReason ? FAIL_MESSAGES[s.failReason] : null,
      breakdown,
      impulses: s.impulses,
      collisions: s.collisions,
      damage: s.damage,
      timeLeft: this.timeLeft,
      timeLimit: this.level.timeLimit,
      wrongMailboxes: s.wrongCount,
      distance: s.distance,
    };
    return this.result;
  }
}
