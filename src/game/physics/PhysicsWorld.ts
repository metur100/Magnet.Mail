import type { LevelDefinition, MailboxDef } from '../levels/LevelDefinition';
import { moverProgress, trainPose, type ObstacleDef } from '../levels/ObstacleDefinitions';
import { ARENA_HEIGHT, ARENA_WIDTH } from '../utils/Constants';
import { circleVsBox, circleVsCapsule, circleVsCircle, createContact, pointInBox, segmentHitsBox } from './CollisionSystem';
import { magneticAcceleration, updateChannel } from './MagneticField';
import { PARCEL_TYPES, type FailReason, type ParcelType, type SimState } from './ParcelBody';

export const DEFAULT_GRAVITY = 620;
/** Below this speed a parcel inside the right mailbox counts as resting. */
export const SAFE_DELIVERY_SPEED = 170;
/** Seconds the parcel must rest inside the mailbox. */
export const DELIVERY_HOLD = 0.35;
/** Impacts faster than this count as a collision. */
export const COLLISION_SPEED = 140;
/** A train / car hitting the parcel faster than this destroys it. */
export const VEHICLE_KILL_SPEED = 160;
export const MAGNET_RADIUS = 30;
export const MAILBOX_W = 120;
export const MAILBOX_H = 100;
/** Velocity damping (1/s) inside the correct mailbox – it "catches" the parcel. */
export const MAILBOX_CATCH = 6;
/** Within this distance an active attractor damps the parcel (it "snaps" to the magnet). */
export const SNAP_RADIUS = 100;
export const SNAP_DAMPING = 14;

export interface StepInput {
  attract: boolean;
  repel: boolean;
}

/** Bit flags describing what happened during a step (for sound, haptics and effects). */
export const EV = {
  IMPACT: 1,
  ATTRACT_PULSE: 2,
  REPEL_PULSE: 4,
  WRONG_MAILBOX: 8,
  TELEPORT: 16,
  ENTER_MAILBOX: 32,
  DELIVERED: 64,
  FAILED: 128,
  BOUNCE: 256,
  DAMAGE: 512,
  BLOCKED: 1024,
} as const;

export interface StepEvents {
  flags: number;
  impactSpeed: number;
  impactX: number;
  impactY: number;
}

export function createEvents(): StepEvents {
  return { flags: 0, impactSpeed: 0, impactX: 0, impactY: 0 };
}

type ColliderKind = 'wall' | 'magnet' | 'bumper' | 'spikes' | 'mailbox' | 'conveyor' | 'oneway' | 'platform' | 'train' | 'rotor' | 'floater';

/** Runtime collider; positions of moving ones are refreshed from the clock every step. */
export interface Collider {
  kind: ColliderKind;
  shape: 'box' | 'circle' | 'capsule';
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  cos: number;
  sin: number;
  r: number;
  /** Capsule end points. */
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** Surface velocity (moving obstacles). */
  vx: number;
  vy: number;
  /** Angular speed for rotors. */
  omega: number;
  bounce: number;
  friction: number;
  beltSpeed: number;
  allowX: number;
  allowY: number;
  active: boolean;
  /** Index into the level's obstacle list (−1 for magnets / mailboxes). */
  source: number;
  def: ObstacleDef | null;
}

export interface Zone {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  cos: number;
  sin: number;
  fx: number;
  fy: number;
}

export interface MailboxZone {
  def: MailboxDef;
  correct: boolean;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function makeCollider(kind: ColliderKind, shape: Collider['shape'], source: number, def: ObstacleDef | null): Collider {
  return {
    kind, shape, cx: 0, cy: 0, hw: 0, hh: 0, cos: 1, sin: 0, r: 0, ax: 0, ay: 0, bx: 0, by: 0,
    vx: 0, vy: 0, omega: 0, bounce: 1, friction: 1, beltSpeed: 0, allowX: 0, allowY: 0, active: true, source, def,
  };
}

function box(c: Collider, x: number, y: number, w: number, h: number, angle = 0): Collider {
  c.cx = x;
  c.cy = y;
  c.hw = w / 2;
  c.hh = h / 2;
  c.cos = Math.cos(angle);
  c.sin = Math.sin(angle);
  return c;
}

/**
 * Deterministic parcel physics for one level. All world state that changes over time is in the
 * SimState passed to `step`; the world itself only caches geometry.
 */
export class PhysicsWorld {
  readonly parcel: ParcelType;
  readonly colliders: Collider[] = [];
  readonly barriers: Collider[] = [];
  readonly winds: Zone[] = [];
  readonly gravityZones: Zone[] = [];
  readonly teleporters: { ax: number; ay: number; bx: number; by: number; r: number }[] = [];
  readonly mailboxes: MailboxZone[] = [];
  readonly gravity: number;
  private readonly accel = new Float64Array(2);
  private readonly contact = createContact();
  private readonly progress = { s: 0, ds: 0 };
  private readonly train = { x: 0, vx: 0 };

  constructor(readonly level: LevelDefinition) {
    this.parcel = { ...PARCEL_TYPES[level.parcel], ...level.parcelOverrides };
    this.gravity = level.gravity ?? DEFAULT_GRAVITY;

    // Magnets are solid (slightly bouncy) so the parcel can rest against them.
    for (const m of [level.attractor, level.repeller]) {
      const c = makeCollider('magnet', 'circle', -1, null);
      c.cx = m.x;
      c.cy = m.y;
      c.r = MAGNET_RADIUS;
      c.bounce = 0.6;
      this.colliders.push(c);
    }

    level.obstacles.forEach((o, i) => this.addObstacle(o, i));
    this.addMailbox(level.mailbox, true);
    for (const d of level.decoys ?? []) this.addMailbox(d, false);
    this.updateMovers(0);
  }

  private addObstacle(o: ObstacleDef, i: number): void {
    switch (o.type) {
      case 'wall':
        this.colliders.push(box(makeCollider('wall', 'box', i, o), o.x, o.y, o.w, o.h, o.angle));
        break;
      case 'bumper': {
        const c = makeCollider('bumper', 'circle', i, o);
        c.cx = o.x;
        c.cy = o.y;
        c.r = o.r;
        c.bounce = 1.9;
        c.friction = 0.3;
        this.colliders.push(c);
        break;
      }
      case 'spikes':
        this.colliders.push(box(makeCollider('spikes', 'box', i, o), o.x, o.y, o.w, o.h, o.angle));
        break;
      case 'platform':
        this.colliders.push(box(makeCollider('platform', 'box', i, o), o.x, o.y, o.w, o.h));
        break;
      case 'rotor': {
        const c = makeCollider('rotor', 'capsule', i, o);
        c.r = (o.thickness ?? 22) / 2;
        c.omega = o.speed;
        c.bounce = 1.2;
        this.colliders.push(c);
        break;
      }
      case 'conveyor': {
        const c = box(makeCollider('conveyor', 'box', i, o), o.x, o.y, o.w, o.h ?? 24);
        c.beltSpeed = o.speed;
        c.friction = 1.6;
        this.colliders.push(c);
        break;
      }
      case 'oneway': {
        const c = box(makeCollider('oneway', 'box', i, o), o.x, o.y, o.w, o.h);
        const len = Math.hypot(o.allowX, o.allowY) || 1;
        c.allowX = o.allowX / len;
        c.allowY = o.allowY / len;
        this.colliders.push(c);
        break;
      }
      case 'barrier':
        this.barriers.push(box(makeCollider('wall', 'box', i, o), o.x, o.y, o.w, o.h, o.angle));
        break;
      case 'train': {
        const c = box(makeCollider('train', 'box', i, o), o.from, o.y, o.w, o.h);
        this.colliders.push(c);
        break;
      }
      case 'wind':
        this.winds.push({ cx: o.x, cy: o.y, hw: o.w / 2, hh: o.h / 2, cos: 1, sin: 0, fx: o.fx, fy: o.fy });
        break;
      case 'gravity':
        this.gravityZones.push({ cx: o.x, cy: o.y, hw: o.w / 2, hh: o.h / 2, cos: 1, sin: 0, fx: o.gx, fy: o.gy });
        break;
      case 'teleporter':
        this.teleporters.push({ ax: o.ax, ay: o.ay, bx: o.bx, by: o.by, r: o.r ?? 34 });
        break;
      case 'floater': {
        const c = makeCollider('floater', 'circle', i, o);
        c.r = o.r;
        c.bounce = 1.4;
        this.colliders.push(c);
        break;
      }
    }
  }

  private addMailbox(def: MailboxDef, correct: boolean): void {
    const w = def.w ?? MAILBOX_W;
    const h = def.h ?? MAILBOX_H;
    const wall = 12;
    // Open-topped box: floor plus two side walls.
    const floor = box(makeCollider('mailbox', 'box', -1, null), def.x, def.y + 10, w + wall * 2, 20);
    const left = box(makeCollider('mailbox', 'box', -1, null), def.x - w / 2 - wall / 2, def.y - h * 0.3, wall, h * 0.6);
    const right = box(makeCollider('mailbox', 'box', -1, null), def.x + w / 2 + wall / 2, def.y - h * 0.3, wall, h * 0.6);
    for (const c of [floor, left, right]) {
      c.bounce = 0.3;
      c.friction = 2;
      this.colliders.push(c);
    }
    this.mailboxes.push({ def, correct, left: def.x - w / 2, right: def.x + w / 2, top: def.y - h, bottom: def.y });
  }

  /** Moves every time-driven obstacle to its pose at time t. */
  updateMovers(t: number): void {
    for (const c of this.colliders) {
      const o = c.def;
      if (!o) continue;
      if (o.type === 'platform') {
        moverProgress(t, o.period, o.phase ?? 0, o.motion ?? 'sine', this.progress);
        c.cx = o.x + o.dx * this.progress.s;
        c.cy = o.y + o.dy * this.progress.s;
        c.vx = o.dx * this.progress.ds;
        c.vy = o.dy * this.progress.ds;
      } else if (o.type === 'rotor') {
        const a = (o.angle ?? 0) + o.speed * t;
        const hx = (Math.cos(a) * o.length) / 2;
        const hy = (Math.sin(a) * o.length) / 2;
        c.cx = o.x;
        c.cy = o.y;
        c.ax = o.x - hx;
        c.ay = o.y - hy;
        c.bx = o.x + hx;
        c.by = o.y + hy;
      } else if (o.type === 'train') {
        c.active = trainPose(o, t, this.train);
        c.cx = this.train.x;
        c.vx = c.active ? this.train.vx : 0;
      } else if (o.type === 'floater') {
        const w = (2 * Math.PI) / o.period;
        const ph = (o.phase ?? 0) * 2 * Math.PI;
        const sn = Math.sin(w * t + ph);
        const cs = Math.cos(w * t + ph);
        c.cx = o.x + o.dx * sn;
        c.cy = o.y + o.dy * sn;
        c.vx = o.dx * w * cs;
        c.vy = o.dy * w * cs;
      }
    }
  }

  /** Is the magnetic field from (sx, sy) blocked by a barrier on its way to the parcel? */
  fieldBlocked(px: number, py: number, sx: number, sy: number): boolean {
    for (const b of this.barriers) {
      if (segmentHitsBox(px, py, sx, sy, b.cx, b.cy, b.hw, b.hh, b.cos, b.sin)) return true;
    }
    return false;
  }

  impulsesLeft(s: SimState): number {
    return this.level.impulseLimit === undefined ? Infinity : Math.max(0, this.level.impulseLimit - s.impulses);
  }

  /** Advances the simulation by dt seconds. */
  step(s: SimState, input: StepInput, dt: number, ev: StepEvents): void {
    ev.flags = 0;
    ev.impactSpeed = 0;
    if (s.status !== 'flying') return;
    const level = this.level;
    const parcel = this.parcel;

    // ---- Controls (impulses, energy)
    if (updateChannel(s.attract, input.attract, dt, { impulsesLeft: this.impulsesLeft(s), energy: s.energy })) {
      s.impulses++;
      ev.flags |= EV.ATTRACT_PULSE;
    } else if (input.attract && s.attract.blocked) ev.flags |= EV.BLOCKED;
    if (updateChannel(s.repel, input.repel, dt, { impulsesLeft: this.impulsesLeft(s), energy: s.energy })) {
      s.impulses++;
      ev.flags |= EV.REPEL_PULSE;
    } else if (input.repel && s.repel.blocked) ev.flags |= EV.BLOCKED;
    if (Number.isFinite(s.energy)) s.energy = Math.max(0, s.energy - (s.attract.level + s.repel.level) * dt);

    // ---- Forces
    let ax = 0;
    let ay = this.gravity;
    for (const z of this.gravityZones) {
      if (pointInBox(s.x, s.y, z.cx, z.cy, z.hw, z.hh, z.cos, z.sin)) {
        ax = z.fx;
        ay = z.fy;
        break;
      }
    }
    const a = this.accel;
    const att = level.attractor;
    const rep = level.repeller;
    const pull = s.attract.level + parcel.passivePull;
    if (pull > 0 && s.energy > 0 && !this.fieldBlocked(s.x, s.y, att.x, att.y)) {
      magneticAcceleration(s.x, s.y, att.x, att.y, 1, pull, level.magnetStrength, parcel.susceptibility, parcel.mass, a);
      ax += a[0];
      ay += a[1];
    }
    if (s.repel.level > 0 && s.energy > 0 && !this.fieldBlocked(s.x, s.y, rep.x, rep.y)) {
      magneticAcceleration(s.x, s.y, rep.x, rep.y, -1, s.repel.level, level.magnetStrength, parcel.susceptibility, parcel.mass, a);
      ax += a[0];
      ay += a[1];
    }
    for (const w of this.winds) {
      if (pointInBox(s.x, s.y, w.cx, w.cy, w.hw, w.hh, w.cos, w.sin)) {
        // Light parcels are pushed more by air.
        ax += w.fx / Math.sqrt(parcel.mass);
        ay += w.fy / Math.sqrt(parcel.mass);
      }
    }
    if (level.storm) {
      // Magnetic storm: a rotating disturbance that pulses on and off.
      const k = level.storm;
      const pulse = Math.max(0, Math.sin((s.t * 2 * Math.PI) / k.period));
      const angle = s.t * 1.3;
      const m = (k.strength * pulse * pulse * parcel.susceptibility) / parcel.mass;
      ax += Math.cos(angle) * m;
      ay += Math.sin(angle) * m;
    }

    // ---- Integrate
    s.vx += ax * dt;
    s.vy += ay * dt;
    // Near-field snap: an active attractor holds the parcel steady instead of letting it orbit.
    if (s.attract.level > 0.05) {
      const d = Math.hypot(att.x - s.x, att.y - s.y);
      if (d < SNAP_RADIUS) {
        const snap = Math.exp(-SNAP_DAMPING * Math.min(1, s.attract.level) * (1 - d / SNAP_RADIUS) * dt);
        s.vx *= snap;
        s.vy *= snap;
      }
    }
    const drag = Math.exp(-parcel.airDrag * dt);
    s.vx *= drag;
    s.vy *= drag;
    let speed = Math.hypot(s.vx, s.vy);
    if (speed > parcel.maxSpeed) {
      s.vx *= parcel.maxSpeed / speed;
      s.vy *= parcel.maxSpeed / speed;
      speed = parcel.maxSpeed;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.distance += speed * dt;
    s.t += dt;
    this.updateMovers(s.t);

    // ---- Collisions
    s.grounded = false;
    if (s.impactCooldown > 0) s.impactCooldown -= dt;
    let rolling = false;
    for (const c of this.colliders) {
      if (!c.active) continue;
      const hit =
        c.shape === 'box'
          ? circleVsBox(s.x, s.y, parcel.radius, c.cx, c.cy, c.hw, c.hh, c.cos, c.sin, this.contact)
          : c.shape === 'circle'
            ? circleVsCircle(s.x, s.y, parcel.radius, c.cx, c.cy, c.r, this.contact)
            : circleVsCapsule(s.x, s.y, parcel.radius, c.ax, c.ay, c.bx, c.by, c.r, this.contact);
      if (!hit) continue;
      const n = this.contact;
      if (c.kind === 'oneway' && s.vx * c.allowX + s.vy * c.allowY > 0) continue;

      // Surface velocity at the contact point.
      let svx = c.vx;
      let svy = c.vy;
      if (c.kind === 'rotor') {
        svx = -c.omega * (n.py - c.cy);
        svy = c.omega * (n.px - c.cx);
      }

      if (c.kind === 'spikes') return this.fail(s, 'spikes', ev);
      const relVx = s.vx - svx;
      const relVy = s.vy - svy;
      const vn = relVx * n.nx + relVy * n.ny;
      if (c.kind === 'train') {
        const vehicleSpeed = Math.abs(c.vx * n.nx);
        if (vehicleSpeed > VEHICLE_KILL_SPEED || -vn > VEHICLE_KILL_SPEED * 2) {
          return this.fail(s, (c.def as Extract<ObstacleDef, { type: 'train' }>).kind === 'car' ? 'car' : 'train', ev);
        }
      }

      // Push out of the obstacle.
      s.x += n.nx * n.depth;
      s.y += n.ny * n.depth;
      if (n.ny < -0.55) s.grounded = true;

      if (vn < 0) {
        const impact = -vn;
        // Magnets catch the parcel: no bounce, no damage, not counted as a collision.
        const caught = c.kind === 'magnet';
        const e = impact < 60 || caught ? 0 : Math.min(0.95, parcel.restitution * c.bounce);
        // Normal response.
        let rvx = relVx - (1 + e) * vn * n.nx;
        let rvy = relVy - (1 + e) * vn * n.ny;
        // Tangential friction (and conveyor drive).
        const tx = -n.ny;
        const ty = n.nx;
        let vt = rvx * tx + rvy * ty;
        const vnAfter = rvx * n.nx + rvy * n.ny;
        if (c.kind === 'conveyor') {
          const belt = c.beltSpeed * (tx >= 0 ? 1 : -1);
          vt += (belt - vt) * 0.06;
        } else {
          vt *= 1 - Math.min(0.9, parcel.friction * c.friction);
        }
        rvx = vnAfter * n.nx + vt * tx;
        rvy = vnAfter * n.ny + vt * ty;
        s.vx = svx + rvx;
        s.vy = svy + rvy;
        // Roll on the surface.
        s.angularVelocity = (vt / parcel.radius) * 0.6;
        rolling = true;

        if (!caught && impact > COLLISION_SPEED && s.impactCooldown <= 0) {
          s.collisions++;
          s.impactCooldown = 0.12;
          ev.flags |= EV.IMPACT;
          if (c.kind === 'bumper' || c.kind === 'floater' || c.kind === 'rotor') ev.flags |= EV.BOUNCE;
          if (impact > ev.impactSpeed) {
            ev.impactSpeed = impact;
            ev.impactX = n.px;
            ev.impactY = n.py;
          }
          if (impact > parcel.impactTolerance) {
            s.damage += (impact - parcel.impactTolerance) * parcel.fragility;
            ev.flags |= EV.DAMAGE;
          }
        }
      }
    }
    if (!rolling) s.angularVelocity *= Math.exp(-0.6 * dt);
    s.angle += s.angularVelocity * dt;

    // ---- Teleporters
    if (s.teleportCooldown > 0) s.teleportCooldown -= dt;
    else {
      for (const tp of this.teleporters) {
        const inA = (s.x - tp.ax) ** 2 + (s.y - tp.ay) ** 2 < tp.r * tp.r;
        const inB = (s.x - tp.bx) ** 2 + (s.y - tp.by) ** 2 < tp.r * tp.r;
        if (inA || inB) {
          s.x = inA ? tp.bx : tp.ax;
          s.y = inA ? tp.by : tp.ay;
          s.teleportCooldown = 0.7;
          ev.flags |= EV.TELEPORT;
          break;
        }
      }
    }

    // ---- Mailboxes
    if (s.wrongCooldown > 0) s.wrongCooldown -= dt;
    let inCorrect = false;
    for (const m of this.mailboxes) {
      const inside = s.x > m.left && s.x < m.right && s.y > m.top && s.y < m.bottom;
      if (!inside) continue;
      if (m.correct) {
        inCorrect = true;
        if (!s.inMailbox) ev.flags |= EV.ENTER_MAILBOX;
        // The mailbox catches the parcel: damp it and nudge it to the middle so it settles inside.
        const damp = Math.exp(-MAILBOX_CATCH * dt);
        s.vx = s.vx * damp + (m.def.x - s.x) * 3 * dt;
        if (s.vy < 0) s.vy *= damp;
      } else if (s.wrongCooldown <= 0) {
        s.wrongCount++;
        s.wrongCooldown = 0.8;
        ev.flags |= EV.WRONG_MAILBOX;
        if (level.wrongFails) return this.fail(s, 'wrong', ev);
        // Spring the parcel back out of the wrong box.
        const side = s.x >= m.def.x ? 1 : -1;
        s.vx = side * 260;
        s.vy = -560;
      }
    }
    s.inMailbox = inCorrect;
    if (inCorrect && Math.hypot(s.vx, s.vy) < SAFE_DELIVERY_SPEED) {
      s.deliverHold += dt;
      if (s.deliverHold >= DELIVERY_HOLD) {
        s.status = 'delivered';
        s.vx = 0;
        s.vy = 0;
        ev.flags |= EV.DELIVERED;
        return;
      }
    } else {
      s.deliverHold = 0;
    }

    // ---- Tutorial goal area
    const goal = level.goalZone;
    if (goal && Math.abs(s.x - goal.x) < goal.w / 2 && Math.abs(s.y - goal.y) < goal.h / 2) {
      s.status = 'delivered';
      ev.flags |= EV.DELIVERED;
      return;
    }

    // ---- Failure rules
    if (s.damage >= 100) return this.fail(s, 'broken', ev);
    if (level.maxCollisions !== undefined && s.collisions > level.maxCollisions) return this.fail(s, 'collisions', ev);
    if (s.y > ARENA_HEIGHT + 120 || s.x < -120 || s.x > ARENA_WIDTH + 120 || s.y < -500) return this.fail(s, 'out', ev);
    if (s.t >= level.timeLimit) return this.fail(s, 'time', ev);
    const noImpulses = this.impulsesLeft(s) <= 0;
    const noEnergy = s.energy <= 0;
    if ((noImpulses || noEnergy) && s.attract.level === 0 && s.repel.level === 0 && Math.hypot(s.vx, s.vy) < 25) {
      s.stuckTime += dt;
      if (s.stuckTime > 1.5) return this.fail(s, noEnergy ? 'energy' : 'impulses', ev);
    } else {
      s.stuckTime = 0;
    }
  }

  private fail(s: SimState, reason: FailReason, ev: StepEvents): void {
    s.status = 'failed';
    s.failReason = reason;
    ev.flags |= EV.FAILED;
  }
}
