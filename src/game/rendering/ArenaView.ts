import Phaser from 'phaser';

import { Magnet } from '../entities/Magnet';
import { Mailbox } from '../entities/Mailbox';
import { drawMovingObstacles } from '../entities/MovingObstacle';
import { Parcel } from '../entities/Parcel';
import { drawAnimated, drawStaticObstacles } from '../entities/StaticObstacle';
import { drawRails } from '../entities/Train';
import type { LevelRunner } from '../gameplay/LevelRunner';
import type { WorldDefinition } from '../levels/LevelDefinition';
import { EV, type StepEvents } from '../physics/PhysicsWorld';
import type { MailboxSkin, ParcelSkin } from '../progression/Cosmetics';
import { ARENA_HEIGHT, ARENA_WIDTH, COLORS } from '../utils/Constants';
import { Rng } from '../utils/MathUtils';
import { FxPool } from './FxPool';
import { FX } from './Textures';

export interface ArenaLayout {
  x: number;
  y: number;
  scale: number;
}

const CONFETTI = [0xff5d8f, 0xffc83d, 0x3ec7e0, 0x7a6cf0, 0x5fd38d, 0xff8a3d];

/**
 * Everything drawn inside the course: obstacles, magnets and their fields, mailboxes, the parcel,
 * trails, route previews and effects. The whole arena (720 × 960 units) is one scaled container.
 */
export class ArenaView {
  readonly container: Phaser.GameObjects.Container;
  readonly parcel: Parcel;
  readonly attractor: Magnet;
  readonly repeller: Magnet;
  readonly mailboxes: Mailbox[] = [];
  private readonly animated: Phaser.GameObjects.Graphics;
  private readonly moving: Phaser.GameObjects.Graphics;
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly route: Phaser.GameObjects.Graphics;
  private readonly fx: FxPool;
  private readonly rng = new Rng(5);
  private time = 0;
  private routePath: number[] | null = null;
  private routePresses: number[] = [];
  private routeColor: number = COLORS.route;
  private routeProgress = 1;
  private shake = 0;

  constructor(
    scene: Phaser.Scene,
    readonly runner: LevelRunner,
    world: WorldDefinition,
    parcelSkin: ParcelSkin,
    mailboxSkin: MailboxSkin,
    layout: ArenaLayout,
    private readonly reducedMotion: () => boolean,
  ) {
    const level = runner.level;
    this.container = scene.add.container(layout.x, layout.y).setScale(layout.scale);

    const rails = scene.add.graphics();
    for (const o of level.obstacles) if (o.type === 'train') drawRails(rails, o.y + o.h / 2, ARENA_WIDTH);
    const statics = scene.add.graphics();
    drawStaticObstacles(statics, level.obstacles, world.theme);
    this.animated = scene.add.graphics();
    this.route = scene.add.graphics();
    this.container.add([rails, statics, this.animated, this.route]);

    const symbol = world.id;
    this.mailboxes.push(new Mailbox(scene, this.container, level.mailbox, true, mailboxSkin, symbol));
    for (const d of level.decoys ?? []) this.mailboxes.push(new Mailbox(scene, this.container, d, false, mailboxSkin, (symbol + 2) % 6));

    const fieldLayer = scene.add.container(0, 0);
    const magnetLayer = scene.add.container(0, 0);
    this.container.add(fieldLayer);
    this.attractor = new Magnet(scene, fieldLayer, magnetLayer, level.attractor, 'attract');
    this.repeller = new Magnet(scene, fieldLayer, magnetLayer, level.repeller, 'repel');

    this.moving = scene.add.graphics();
    this.trail = scene.add.graphics();
    this.container.add([this.moving, this.trail, magnetLayer]);

    this.parcel = new Parcel(scene, level.parcel, parcelSkin, runner.world.parcel.radius);
    this.container.add([this.parcel.shadowObject, this.parcel]);
    for (const m of this.mailboxes) m.addFront(this.container);

    this.fx = new FxPool(scene, this.container, 140);
    this.setLayout(layout);
    this.sync(0);
  }

  /** Convert screen (design) coordinates to arena coordinates. */
  get layout(): ArenaLayout {
    return { x: this.container.x, y: this.container.y, scale: this.container.scaleX };
  }

  sync(dt: number): void {
    const reduced = this.reducedMotion();
    this.time += dt;
    const s = this.runner.state;
    this.parcel.sync(s.x, s.y, s.angle, s.damage);
    this.parcel.shadowObject.setPosition(s.x, s.y + this.runner.world.parcel.radius + 6).setVisible(!s.grounded);

    const world = this.runner.world;
    const level = this.runner.level;
    this.attractor.update(dt, s.attract.level, s.x, s.y, world.fieldBlocked(s.x, s.y, level.attractor.x, level.attractor.y), reduced);
    this.repeller.update(dt, s.repel.level, s.x, s.y, world.fieldBlocked(s.x, s.y, level.repeller.x, level.repeller.y), reduced);
    drawMovingObstacles(this.moving, world.colliders, s.t);
    drawAnimated(this.animated, level.obstacles, reduced ? 0 : this.time);

    // Open the right mailbox's lid when the parcel comes close.
    for (const m of this.mailboxes) {
      if (m.correct && s.status === 'flying') {
        const near = Math.abs(s.x - m.def.x) < 150 && s.y < m.def.y + 10 && s.y > m.def.y - 260;
        m.setOpen(near);
      }
      m.update(dt, reduced);
    }

    this.drawTrail();
    this.drawRoute(dt);
    this.fx.update(dt);

    // Screen shake decays quickly.
    if (this.shake > 0 && !reduced) {
      this.shake = Math.max(0, this.shake - dt * 3);
      const k = this.shake * 6;
      this.container.setPosition(this.baseX + this.rng.range(-k, k), this.baseY + this.rng.range(-k, k));
    } else {
      this.container.setPosition(this.baseX, this.baseY);
    }
  }

  private baseX = 0;
  private baseY = 0;

  setLayout(layout: ArenaLayout): void {
    this.baseX = layout.x;
    this.baseY = layout.y;
    this.container.setPosition(layout.x, layout.y).setScale(layout.scale);
  }

  /** A short fading trail behind the parcel. */
  private drawTrail(): void {
    const g = this.trail;
    g.clear();
    const path = this.runner.path;
    const n = path.length / 2;
    const count = Math.min(n, 14);
    if (count < 2 || this.runner.state.status !== 'flying') return;
    for (let i = n - count + 1; i < n; i++) {
      const k = (i - (n - count)) / count;
      g.lineStyle(this.runner.world.parcel.radius * 0.9 * k, 0xffffff, 0.25 * k);
      g.lineBetween(path[(i - 1) * 2], path[(i - 1) * 2 + 1], path[i * 2], path[i * 2 + 1]);
    }
  }

  /**
   * Shows a dotted route (hint preview or success replay). Press markers are [x, y, action] triples
   * (1/3 = attract, 2/4 = repel). `animate` draws the route progressively.
   */
  showRoute(path: number[], presses: number[], color: number, animate: boolean): void {
    this.routePath = path;
    this.routePresses = presses;
    this.routeColor = color;
    this.routeProgress = animate && !this.reducedMotion() ? 0 : 1;
  }

  clearRoute(): void {
    this.routePath = null;
  }

  private drawRoute(dt: number): void {
    const g = this.route;
    g.clear();
    const path = this.routePath;
    if (!path || path.length < 4) return;
    this.routeProgress = Math.min(1, this.routeProgress + dt * 0.7);
    const n = path.length / 2;
    const upto = Math.max(1, Math.floor(n * this.routeProgress));
    g.fillStyle(this.routeColor, 0.85);
    const stride = n > 120 ? 3 : 1;
    for (let i = 0; i < upto; i += stride) g.fillCircle(path[i * 2], path[i * 2 + 1], 5);
    if (this.routeProgress < 1) {
      // Ghost parcel travelling along the route.
      const x = path[(upto - 1) * 2];
      const y = path[(upto - 1) * 2 + 1];
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(x, y, this.runner.world.parcel.radius);
      g.lineStyle(3, this.routeColor, 1);
      g.strokeCircle(x, y, this.runner.world.parcel.radius);
    }
    for (let i = 0; i < this.routePresses.length; i += 3) {
      const action = this.routePresses[i + 2];
      const attract = action === 1 || action === 3;
      const x = this.routePresses[i];
      const y = this.routePresses[i + 1];
      g.fillStyle(attract ? COLORS.attract : COLORS.repel, 1);
      g.fillCircle(x, y, 13);
      g.lineStyle(3, 0xffffff, 1);
      g.strokeCircle(x, y, 13);
      // + for attract, − for repel.
      g.fillStyle(0xffffff, 1);
      g.fillRect(x - 6, y - 1.5, 12, 3);
      if (attract) g.fillRect(x - 1.5, y - 6, 3, 12);
    }
  }

  /** Effects for the events of one frame. */
  handleEvents(ev: StepEvents): void {
    const s = this.runner.state;
    const reduced = this.reducedMotion();
    const lots = reduced ? 0.3 : 1;
    if (ev.flags & EV.ATTRACT_PULSE) this.fx.spawn(FX.ring, undefined, s.x, s.y, { life: 0.4, scale: 1.4, scaleTo: 0.3, tint: COLORS.attract, alpha: 0.9 });
    if (ev.flags & EV.REPEL_PULSE) {
      const r = this.runner.level.repeller;
      this.fx.spawn(FX.ring, undefined, r.x, r.y, { life: 0.45, scale: 0.6, scaleTo: 2.2, tint: COLORS.repel, alpha: 0.9 });
    }
    if (ev.flags & EV.IMPACT) {
      const strength = Math.min(1, ev.impactSpeed / 900);
      for (let i = 0; i < Math.round((3 + strength * 8) * lots); i++) {
        this.fx.spawn(FX.dot, undefined, ev.impactX, ev.impactY, {
          vx: this.rng.range(-220, 220) * strength,
          vy: this.rng.range(-260, -40) * strength,
          life: 0.35,
          scale: 0.5,
          scaleTo: 0.1,
          tint: ev.flags & EV.DAMAGE ? COLORS.danger : 0xffffff,
          drag: 2,
        });
      }
      if (strength > 0.5) this.shake = Math.max(this.shake, strength * 0.6);
    }
    if (ev.flags & EV.BOUNCE) this.fx.spawn(FX.ring, undefined, ev.impactX, ev.impactY, { life: 0.3, scale: 0.4, scaleTo: 1.4, tint: COLORS.danger });
    if (ev.flags & EV.WRONG_MAILBOX) {
      for (const m of this.mailboxes) if (!m.correct) m.flashWarning();
      this.shake = Math.max(this.shake, 0.4);
    }
    if (ev.flags & EV.TELEPORT) {
      for (let i = 0; i < Math.round(14 * lots); i++) {
        this.fx.spawn(FX.spark, undefined, s.x, s.y, {
          vx: this.rng.range(-200, 200),
          vy: this.rng.range(-200, 200),
          life: 0.5,
          scale: 0.35,
          scaleTo: 0,
          tint: COLORS.special,
          additive: true,
        });
      }
    }
    if (ev.flags & EV.DELIVERED) this.celebrate();
    if (ev.flags & EV.FAILED) this.breakApart();
  }

  /** Mailbox closes, flag rises, magnetic burst and confetti. */
  celebrate(): void {
    const m = this.mailboxes.find((b) => b.correct);
    const s = this.runner.state;
    m?.deliver();
    this.parcel.setVisible(this.runner.level.goalZone !== undefined);
    const reduced = this.reducedMotion();
    this.fx.spawn(FX.ring, undefined, s.x, s.y, { life: 0.7, scale: 0.4, scaleTo: 4, tint: COLORS.special, alpha: 0.9 });
    this.fx.spawn(FX.ring, undefined, s.x, s.y, { life: 0.9, scale: 0.3, scaleTo: 3, tint: COLORS.goal, alpha: 0.9 });
    const count = reduced ? 16 : 60;
    for (let i = 0; i < count; i++) {
      this.fx.spawn(FX.square, undefined, s.x, s.y - 30, {
        vx: this.rng.range(-380, 380),
        vy: this.rng.range(-720, -200),
        life: this.rng.range(0.9, 1.6),
        scale: this.rng.range(0.6, 1.1),
        tint: this.rng.pick(CONFETTI),
        spin: this.rng.range(-12, 12),
        drag: 1.2,
      });
    }
  }

  private breakApart(): void {
    const s = this.runner.state;
    this.parcel.setVisible(false);
    this.shake = 0.8;
    for (let i = 0; i < 16; i++) {
      this.fx.spawn(FX.square, undefined, s.x, s.y, {
        vx: this.rng.range(-320, 320),
        vy: this.rng.range(-420, -60),
        life: 1,
        scale: this.rng.range(0.8, 1.6),
        tint: i % 2 ? this.parcel.skin.body : COLORS.danger,
        spin: this.rng.range(-10, 10),
        drag: 0.8,
      });
    }
  }

  /** Arena bounds in screen coordinates. */
  screenRect(): Phaser.Geom.Rectangle {
    const l = this.layout;
    return new Phaser.Geom.Rectangle(l.x, l.y, ARENA_WIDTH * l.scale, ARENA_HEIGHT * l.scale);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
