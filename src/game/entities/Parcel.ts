import Phaser from 'phaser';

import { PARCEL_TYPES, type ParcelTypeId } from '../physics/ParcelBody';
import type { ParcelSkin } from '../progression/Cosmetics';
import { COLORS } from '../utils/Constants';

/**
 * Draws a parcel: each physics type has its own silhouette (envelope, box, crate, glass, bouncy,
 * magnetic); the selected collection skin supplies colours and pattern.
 */
export function drawParcel(g: Phaser.GameObjects.Graphics, type: ParcelTypeId, skin: ParcelSkin, radius: number, damage = 0): void {
  g.clear();
  const s = radius;
  const outline = COLORS.ink;
  switch (type) {
    case 'envelope': {
      const w = s * 2.3;
      const h = s * 1.55;
      g.fillStyle(skin.body, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      g.lineStyle(3, outline, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
      g.lineStyle(2.5, skin.accent, 1);
      g.beginPath();
      g.moveTo(-w / 2 + 3, -h / 2 + 3);
      g.lineTo(0, h * 0.12);
      g.lineTo(w / 2 - 3, -h / 2 + 3);
      g.strokePath();
      if (skin.pattern === 'stripes') {
        for (let i = 0; i < 6; i++) {
          g.fillStyle(i % 2 ? skin.detail : skin.accent, 1);
          g.fillRect(-w / 2 + 4 + i * (w - 8) / 6, h / 2 - 7, (w - 8) / 6, 4);
        }
      }
      g.fillStyle(skin.detail, 1);
      g.fillRect(w / 2 - 15, -h / 2 + 6, 9, 11);
      break;
    }
    case 'crate': {
      const w = s * 1.9;
      g.fillStyle(0x000000, 0.12);
      g.fillRoundedRect(-w / 2 + 2, -w / 2 + 4, w, w, 6);
      g.fillStyle(0xb98a52, 1);
      g.fillRoundedRect(-w / 2, -w / 2, w, w, 6);
      g.lineStyle(3, 0x6e4b25, 1);
      g.strokeRoundedRect(-w / 2, -w / 2, w, w, 6);
      g.lineStyle(4, 0x8a6235, 1);
      g.lineBetween(-w / 2 + 4, -w / 2 + 4, w / 2 - 4, w / 2 - 4);
      g.lineBetween(-w / 2 + 4, -w / 6, w / 2 - 4, -w / 6);
      g.lineBetween(-w / 2 + 4, w / 6, w / 2 - 4, w / 6);
      g.fillStyle(skin.accent, 1);
      g.fillRect(-w / 2 + 3, -4, w - 6, 8);
      break;
    }
    case 'glass': {
      const w = s * 1.85;
      g.fillStyle(0xd9f3ff, 0.95);
      g.fillRoundedRect(-w / 2, -w / 2, w, w, 8);
      g.lineStyle(3, 0x4f8fb8, 1);
      g.strokeRoundedRect(-w / 2, -w / 2, w, w, 8);
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(-w / 2 + 6, -w / 2 + 5, 5, w - 12);
      // Wine-glass "fragile" symbol.
      g.lineStyle(3, skin.accent, 1);
      g.strokeCircle(0, -4, 7);
      g.lineBetween(0, 3, 0, 11);
      g.lineBetween(-6, 11, 6, 11);
      break;
    }
    case 'bouncy': {
      const r = s;
      g.fillStyle(skin.body, 1);
      g.fillCircle(0, 0, r);
      g.lineStyle(3, outline, 1);
      g.strokeCircle(0, 0, r);
      g.lineStyle(3, skin.accent, 1);
      for (const k of [-0.45, 0, 0.45]) g.lineBetween(-r * 0.8, k * r, r * 0.8, k * r);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(-r * 0.35, -r * 0.4, r * 0.22);
      break;
    }
    case 'magnetic': {
      const w = s * 1.9;
      g.fillStyle(COLORS.special, 0.25);
      g.fillCircle(0, 0, w * 0.75);
      g.fillStyle(skin.body, 1);
      g.fillRoundedRect(-w / 2, -w / 2, w, w, 8);
      g.lineStyle(3, outline, 1);
      g.strokeRoundedRect(-w / 2, -w / 2, w, w, 8);
      // Mini horseshoe symbol (blue and red tips).
      g.lineStyle(6, 0x8e8e9e, 1);
      g.beginPath();
      g.arc(0, -2, 9, Math.PI, 0, false);
      g.strokePath();
      g.fillStyle(COLORS.repel, 1);
      g.fillRect(-12, -2, 6, 9);
      g.fillStyle(COLORS.attract, 1);
      g.fillRect(6, -2, 6, 9);
      break;
    }
    default: {
      // Standard box with the skin's pattern.
      const w = s * 1.9;
      g.fillStyle(0x000000, 0.12);
      g.fillRoundedRect(-w / 2 + 2, -w / 2 + 4, w, w, 7);
      g.fillStyle(skin.body, 1);
      g.fillRoundedRect(-w / 2, -w / 2, w, w, 7);
      g.lineStyle(3, outline, 1);
      g.strokeRoundedRect(-w / 2, -w / 2, w, w, 7);
      drawPattern(g, skin, w);
    }
  }
  if (damage > 15) {
    // Cracks show how close the parcel is to breaking.
    g.lineStyle(2, 0x3a2a2a, Math.min(1, damage / 60));
    g.beginPath();
    g.moveTo(-s * 0.5, -s * 0.6);
    g.lineTo(-s * 0.1, -s * 0.1);
    g.lineTo(-s * 0.35, s * 0.25);
    if (damage > 50) {
      g.moveTo(-s * 0.1, -s * 0.1);
      g.lineTo(s * 0.45, s * 0.05);
      g.lineTo(s * 0.3, s * 0.55);
    }
    g.strokePath();
  }
}

function drawPattern(g: Phaser.GameObjects.Graphics, skin: ParcelSkin, w: number): void {
  const h = w / 2;
  switch (skin.pattern) {
    case 'ribbon':
      g.fillStyle(skin.accent, 1);
      g.fillRect(-5, -h + 2, 10, w - 4);
      g.fillRect(-h + 2, -5, w - 4, 10);
      g.fillStyle(skin.detail, 1);
      g.fillEllipse(-7, -h, 14, 9);
      g.fillEllipse(7, -h, 14, 9);
      break;
    case 'dots':
      g.fillStyle(skin.accent, 1);
      for (const [x, y] of [[-h * 0.5, -h * 0.5], [h * 0.4, -h * 0.4], [0, 0], [-h * 0.45, h * 0.45], [h * 0.5, h * 0.5]]) g.fillCircle(x, y, 4);
      g.fillStyle(skin.detail, 1);
      g.fillRect(-h + 3, -3, w - 6, 6);
      break;
    case 'stripes':
      for (let i = 0; i < 4; i++) {
        g.fillStyle(i % 2 ? skin.accent : skin.detail, 1);
        g.fillRect(-h + 3, -h + 3 + i * ((w - 6) / 4), w - 6, (w - 6) / 8);
      }
      break;
    case 'neon':
      g.lineStyle(3, skin.accent, 1);
      g.strokeRoundedRect(-h + 5, -h + 5, w - 10, w - 10, 5);
      g.fillStyle(skin.detail, 1);
      g.fillCircle(0, 0, 5);
      break;
    case 'pizza':
      g.fillStyle(skin.accent, 1);
      g.fillTriangle(-8, -6, 10, -2, -2, 10);
      g.fillStyle(skin.detail, 1);
      g.fillCircle(-1, 0, 2.5);
      break;
    case 'aurora':
      g.fillStyle(skin.accent, 0.9);
      g.fillRect(-h + 3, -6, w - 6, 5);
      g.fillStyle(skin.detail, 0.9);
      g.fillRect(-h + 3, 2, w - 6, 5);
      break;
    case 'stamp':
      g.fillStyle(skin.accent, 1);
      g.fillRect(-h + 3, -4, w - 6, 8);
      g.fillStyle(skin.detail, 1);
      g.fillRect(h - 14, -h + 5, 9, 11);
      break;
    default:
      // Parcel tape.
      g.fillStyle(skin.accent, 0.9);
      g.fillRect(-6, -h + 2, 12, w - 4);
  }
}

/** A parcel game object that follows the simulation state. */
export class Parcel extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private lastDamageStep = -1;

  constructor(
    scene: Phaser.Scene,
    readonly parcelType: ParcelTypeId,
    readonly skin: ParcelSkin,
    readonly radius = PARCEL_TYPES[parcelType].radius,
  ) {
    super(scene, 0, 0);
    this.shadow = scene.add.ellipse(0, radius + 4, radius * 1.6, 8, 0x000000, 0.15);
    this.art = scene.add.graphics();
    drawParcel(this.art, parcelType, skin, radius);
    this.add([this.art]);
    scene.add.existing(this);
  }

  get shadowObject(): Phaser.GameObjects.Ellipse {
    return this.shadow;
  }

  sync(x: number, y: number, angle: number, damage: number): void {
    this.setPosition(x, y);
    this.art.setRotation(angle);
    const step = Math.floor(damage / 20);
    if (step !== this.lastDamageStep) {
      this.lastDamageStep = step;
      drawParcel(this.art, this.parcelType, this.skin, this.radius, damage);
    }
  }
}
