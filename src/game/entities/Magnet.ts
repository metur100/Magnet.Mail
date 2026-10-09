import Phaser from 'phaser';

import type { MagnetDef } from '../levels/LevelDefinition';
import { MAGNET_RADIUS } from '../physics/PhysicsWorld';
import { COLORS } from '../utils/Constants';

export type MagnetKind = 'attract' | 'repel';

/**
 * Horseshoe magnet source (blue = attractor, red = repeller) plus its live field visualisation:
 * curved, animated field lines between the magnet and the parcel. Attraction lines flow towards the
 * magnet, repulsion lines flow away from it. A purple flicker shows when a barrier blocks the field.
 */
export class Magnet {
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly field: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Graphics;
  private flow = 0;

  constructor(
    scene: Phaser.Scene,
    fieldLayer: Phaser.GameObjects.Container,
    bodyLayer: Phaser.GameObjects.Container,
    readonly def: MagnetDef,
    readonly kind: MagnetKind,
  ) {
    this.field = scene.add.graphics();
    this.body = scene.add.graphics();
    this.label = scene.add.graphics();
    fieldLayer.add(this.field);
    bodyLayer.add([this.body, this.label]);
    this.drawBody(0);
  }

  private get color(): number {
    return this.kind === 'attract' ? COLORS.attract : COLORS.repel;
  }

  private get dark(): number {
    return this.kind === 'attract' ? COLORS.attractDark : COLORS.repelDark;
  }

  /** Horseshoe with silver tips and a +/− symbol (shape, not only colour, tells them apart). */
  private drawBody(level: number): void {
    const g = this.body;
    const { x, y } = this.def;
    const r = MAGNET_RADIUS;
    g.clear();
    if (level > 0) {
      g.fillStyle(this.color, 0.18 + 0.12 * Math.min(1, level));
      g.fillCircle(x, y, r * (1.5 + 0.35 * level));
    }
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(x + 2, y + 4, r);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x, y, r);
    g.lineStyle(3, this.dark, 1);
    g.strokeCircle(x, y, r);
    // Horseshoe: thick arc with two silver pole tips pointing down.
    g.lineStyle(11, this.color, 1);
    g.beginPath();
    g.arc(x, y - 2, r * 0.55, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(this.color, 1);
    g.fillRect(x - r * 0.55 - 5.5, y - 2, 11, r * 0.45);
    g.fillRect(x + r * 0.55 - 5.5, y - 2, 11, r * 0.45);
    g.fillStyle(0xd7dde6, 1);
    g.fillRect(x - r * 0.55 - 5.5, y + r * 0.43 - 2, 11, 7);
    g.fillRect(x + r * 0.55 - 5.5, y + r * 0.43 - 2, 11, 7);
    // Plus (attract) / minus (repel) badge.
    const l = this.label;
    l.clear();
    l.fillStyle(this.dark, 1);
    l.fillCircle(x + r * 0.78, y - r * 0.78, 11);
    l.fillStyle(0xffffff, 1);
    l.fillRect(x + r * 0.78 - 6, y - r * 0.78 - 1.5, 12, 3);
    if (this.kind === 'attract') l.fillRect(x + r * 0.78 - 1.5, y - r * 0.78 - 6, 3, 12);
  }

  /** Redraws field lines for the current field level (0 = off). */
  update(dt: number, level: number, parcelX: number, parcelY: number, blocked: boolean, reducedMotion: boolean): void {
    this.flow = (this.flow + dt * (reducedMotion ? 0 : 1.4)) % 1;
    this.drawBody(level);
    const g = this.field;
    g.clear();
    if (level <= 0.02) return;
    const { x, y } = this.def;
    const dx = parcelX - x;
    const dy = parcelY - y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d;
    const ny = dx / d;
    const alpha = Math.min(1, level) * (blocked ? 0.35 : 0.85);
    const color = blocked ? COLORS.special : this.color;
    const lines = 5;
    for (let i = 0; i < lines; i++) {
      const spread = (i - (lines - 1) / 2) * (d * 0.12 + 14);
      // Quadratic curve bulging sideways, like field lines between two poles.
      const cx = x + dx / 2 + nx * spread;
      const cy = y + dy / 2 + ny * spread;
      const segments = 14;
      for (let k = 0; k < segments; k++) {
        // Dashes travel towards the magnet (attract) or away from it (repel).
        const phase = this.kind === 'attract' ? 1 - this.flow : this.flow;
        const t0 = (k + phase) / segments;
        const t1 = t0 + 0.45 / segments;
        if (t1 > 1) continue;
        const p0x = (1 - t0) ** 2 * x + 2 * (1 - t0) * t0 * cx + t0 * t0 * parcelX;
        const p0y = (1 - t0) ** 2 * y + 2 * (1 - t0) * t0 * cy + t0 * t0 * parcelY;
        const p1x = (1 - t1) ** 2 * x + 2 * (1 - t1) * t1 * cx + t1 * t1 * parcelX;
        const p1y = (1 - t1) ** 2 * y + 2 * (1 - t1) * t1 * cy + t1 * t1 * parcelY;
        g.lineStyle(i === (lines - 1) / 2 ? 5 : 3, color, alpha * (0.5 + 0.5 * Math.sin(t0 * Math.PI)));
        g.lineBetween(p0x, p0y, p1x, p1y);
      }
    }
    // Pulse rings: contracting around the parcel when attracting, expanding from the magnet when repelling.
    const ringT = this.flow;
    if (this.kind === 'attract') {
      g.lineStyle(3, color, alpha * ringT);
      g.strokeCircle(parcelX, parcelY, 50 - ringT * 26);
    } else {
      g.lineStyle(3, color, alpha * (1 - ringT));
      g.strokeCircle(x, y, MAGNET_RADIUS + ringT * 60);
    }
  }
}
