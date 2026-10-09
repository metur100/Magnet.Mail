import Phaser from 'phaser';

import type { MailboxDef } from '../levels/LevelDefinition';
import { MAILBOX_H, MAILBOX_W } from '../physics/PhysicsWorld';
import type { MailboxSkin } from '../progression/Cosmetics';
import { COLORS } from '../utils/Constants';

/**
 * Mailbox: an open-topped box with a hinged lid and a flag.
 * - correct mailbox: skin colours, yellow goal glow, "deliver here" arrow and destination symbol
 * - wrong mailbox: grey with a crossed-out sign – different icon, not only a different colour
 * The back is drawn behind the parcel and the front walls in front of it.
 */
export class Mailbox {
  readonly back: Phaser.GameObjects.Graphics;
  readonly front: Phaser.GameObjects.Graphics;
  private readonly lid: Phaser.GameObjects.Graphics;
  private readonly flag: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly w: number;
  private readonly h: number;
  private lidAngle = 0;
  private lidTarget = 0;
  private flagRaise = 0;
  private flagTarget = 0;
  private time = 0;
  private warn = 0;

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    readonly def: MailboxDef,
    readonly correct: boolean,
    private readonly skin: MailboxSkin,
    private readonly symbol: number,
  ) {
    this.w = def.w ?? MAILBOX_W;
    this.h = def.h ?? MAILBOX_H;
    this.glow = scene.add.graphics();
    this.back = scene.add.graphics();
    this.flag = scene.add.graphics();
    this.front = scene.add.graphics();
    this.lid = scene.add.graphics();
    container.add([this.glow, this.back, this.flag]);
    this.drawBack();
    this.drawFront();
    this.drawFlag();
    this.drawLid();
  }

  /** Adds the front parts (call after the parcel was added so they overlap it). */
  addFront(container: Phaser.GameObjects.Container): void {
    container.add([this.front, this.lid]);
  }

  private colors(): { body: number; trim: number } {
    return this.correct ? { body: this.skin.body, trim: this.skin.trim } : { body: 0xa7adb8, trim: 0x6b7280 };
  }

  private drawBack(): void {
    const { x, y } = this.def;
    const { w, h } = this;
    const g = this.back;
    const c = this.colors();
    g.clear();
    // Post or base.
    g.fillStyle(c.trim, 1);
    g.fillRect(x - 8, y + 20, 16, 20);
    // Back panel and dark inside.
    g.fillStyle(c.body, 1);
    g.fillRoundedRect(x - w / 2 - 12, y - h, w + 24, h + 20, 14);
    g.fillStyle(0x000000, 0.28);
    g.fillRoundedRect(x - w / 2, y - h + 10, w, h - 10, 10);
    // Destination symbol on the back wall.
    if (this.correct) this.drawSymbol(g, x, y - h * 0.62, 0xffffff, 0.85);
    else {
      g.lineStyle(6, 0xffffff, 0.85);
      g.lineBetween(x - 14, y - h * 0.62 - 14, x + 14, y - h * 0.62 + 14);
      g.lineBetween(x + 14, y - h * 0.62 - 14, x - 14, y - h * 0.62 + 14);
    }
  }

  /** Small destination symbols: house, office, station, factory, plane, planet. */
  private drawSymbol(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    switch (this.symbol) {
      case 1:
        g.fillRect(x - 12, y - 14, 24, 28);
        g.fillStyle(this.colors().body, 1);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.fillRect(x - 8 + c * 10, y - 10 + r * 8, 6, 5);
        break;
      case 2:
        g.fillRoundedRect(x - 16, y - 10, 32, 18, 5);
        g.fillCircle(x - 9, y + 10, 4);
        g.fillCircle(x + 9, y + 10, 4);
        break;
      case 3:
        g.fillRect(x - 16, y - 4, 32, 16);
        g.fillTriangle(x - 16, y - 4, x - 6, y - 14, x - 6, y - 4);
        g.fillTriangle(x - 4, y - 4, x + 6, y - 14, x + 6, y - 4);
        g.fillRect(x + 8, y - 16, 6, 14);
        break;
      case 4:
        g.fillTriangle(x - 18, y + 2, x + 18, y - 4, x + 18, y + 4);
        g.fillTriangle(x - 2, y - 2, x + 6, y - 16, x + 10, y - 2);
        g.fillTriangle(x - 2, y + 2, x + 6, y + 16, x + 10, y + 2);
        break;
      case 5:
        g.fillCircle(x, y, 11);
        g.lineStyle(3, color, alpha);
        g.strokeEllipse(x, y, 38, 12);
        break;
      default:
        g.fillTriangle(x - 16, y - 2, x + 16, y - 2, x, y - 16);
        g.fillRect(x - 11, y - 2, 22, 16);
    }
  }

  private drawFront(): void {
    const { x, y } = this.def;
    const { w, h } = this;
    const g = this.front;
    const c = this.colors();
    g.clear();
    // Side walls and front lip (in front of the parcel).
    g.fillStyle(c.body, 1);
    g.fillRoundedRect(x - w / 2 - 14, y - h * 0.6, 16, h * 0.6 + 18, 6);
    g.fillRoundedRect(x + w / 2 - 2, y - h * 0.6, 16, h * 0.6 + 18, 6);
    g.fillRoundedRect(x - w / 2 - 14, y - 4, w + 28, 24, 8);
    g.lineStyle(3, c.trim, 1);
    g.strokeRoundedRect(x - w / 2 - 14, y - 4, w + 28, 24, 8);
    // Address label.
    g.fillStyle(0xffffff, 0.9);
    g.fillRoundedRect(x - 26, y, 52, 14, 4);
    g.fillStyle(c.trim, 1);
    g.fillRect(x - 20, y + 4, 26, 3);
    g.fillRect(x - 20, y + 9, 18, 2);
  }

  private drawLid(): void {
    const { x, y } = this.def;
    const { w, h } = this;
    const g = this.lid;
    const c = this.colors();
    g.clear();
    // The lid hinges at the back-left corner and swings up when open.
    const hx = x - w / 2 - 12;
    const hy = y - h;
    const a = -this.lidAngle * 1.9;
    const len = w + 24;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const thick = 12;
    g.fillStyle(c.trim, 1);
    g.fillPoints(
      [
        { x: hx, y: hy },
        { x: hx + cos * len, y: hy + sin * len },
        { x: hx + cos * len + sin * thick, y: hy + sin * len - cos * thick },
        { x: hx + sin * thick, y: hy - cos * thick },
      ],
      true,
    );
  }

  private drawFlag(): void {
    const { x, y } = this.def;
    const { w, h } = this;
    const g = this.flag;
    g.clear();
    if (!this.correct) return;
    const px = x + w / 2 + 18;
    const base = y - h * 0.2;
    const top = base - 30 - this.flagRaise * 46;
    g.fillStyle(0x6b7280, 1);
    g.fillRect(px, top, 5, base - top);
    g.fillStyle(this.skin.flag, 1);
    g.fillRect(px + 5, top, 26, 16);
  }

  private drawGlow(): void {
    const g = this.glow;
    g.clear();
    const { x, y } = this.def;
    const { w, h } = this;
    if (this.correct) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 3);
      g.fillStyle(COLORS.goal, 0.16 + pulse * 0.14);
      g.fillRoundedRect(x - w / 2 - 26, y - h - 18, w + 52, h + 46, 24);
      // "Deliver here" arrow above the opening.
      const ay = y - h - 36 - pulse * 8;
      g.fillStyle(COLORS.goal, 1);
      g.fillTriangle(x - 16, ay, x + 16, ay, x, ay + 18);
      g.fillRect(x - 6, ay - 18, 12, 18);
      g.lineStyle(2.5, COLORS.ink, 0.6);
      g.strokeTriangle(x - 16, ay, x + 16, ay, x, ay + 18);
    }
    if (this.warn > 0) {
      g.fillStyle(COLORS.danger, this.warn * 0.5);
      g.fillRoundedRect(x - w / 2 - 26, y - h - 18, w + 52, h + 46, 24);
    }
  }

  /** Opens the lid when the parcel is close. */
  setOpen(open: boolean): void {
    this.lidTarget = open ? 1 : 0;
  }

  /** Delivery: close the lid and raise the flag. */
  deliver(): void {
    this.lidTarget = 0;
    this.flagTarget = 1;
  }

  flashWarning(): void {
    this.warn = 1;
  }

  update(dt: number, reducedMotion: boolean): void {
    this.time += reducedMotion ? 0 : dt;
    const k = reducedMotion ? 1 : Math.min(1, dt * 10);
    const lidBefore = this.lidAngle;
    const flagBefore = this.flagRaise;
    this.lidAngle += (this.lidTarget - this.lidAngle) * k;
    this.flagRaise += (this.flagTarget - this.flagRaise) * Math.min(1, dt * (reducedMotion ? 60 : 5));
    if (Math.abs(lidBefore - this.lidAngle) > 0.001) this.drawLid();
    if (Math.abs(flagBefore - this.flagRaise) > 0.001) this.drawFlag();
    this.warn = Math.max(0, this.warn - dt * 1.6);
    this.drawGlow();
  }
}
