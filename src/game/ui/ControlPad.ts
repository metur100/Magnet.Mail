import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { COLORS } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import { ProgressBar } from './ProgressBar';
import { addText } from './Typography';

export type Pole = 'attract' | 'repel';

/**
 * A large hold-button for one magnet. Supports multi-touch (both buttons at once), mouse and keyboard.
 * Pressed state is the union of all pointers on it plus the keyboard key.
 */
export class HoldButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Graphics;
  private readonly pointers = new Set<number>();
  private key = false;
  private level = 0;
  private lastPressed = false;
  enabled = true;
  readonly accessibleName: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly bw: number,
    private readonly bh: number,
    readonly pole: Pole,
  ) {
    super(scene, x, y);
    const w = bw;
    const h = bh;
    this.accessibleName = pole === 'attract' ? 'ATTRACT' : 'REPEL';
    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    const label = addText(scene, 0, h * 0.2, this.accessibleName, { size: 36, weight: '700', color: '#ffffff' });
    const sub = addText(scene, 0, h * 0.2 + 32, pole === 'attract' ? 'pull to blue' : 'push from red', { size: 19, weight: '600', color: '#ffffff' });
    sub.setAlpha(0.85);
    this.add([this.bg, this.icon, label, sub]);
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    this.on('pointerdown', (p: Phaser.Input.Pointer) => {
      AudioManager.unlock();
      this.pointers.add(p.id);
    });
    const release = (p: Phaser.Input.Pointer) => this.pointers.delete(p.id);
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    this.once('destroy', () => {
      scene.input.off('pointerup', release);
      scene.input.off('pointerupoutside', release);
    });
    this.redraw();
    scene.add.existing(this);
  }

  get pressed(): boolean {
    return this.enabled && (this.pointers.size > 0 || this.key);
  }

  setKey(down: boolean): void {
    this.key = down;
  }

  releaseAll(): void {
    this.pointers.clear();
    this.key = false;
  }

  /** Called every frame with the live field level for the glow. */
  tick(level: number): void {
    const pressed = this.pressed;
    if (pressed && !this.lastPressed) Haptics.play('tap');
    if (pressed !== this.lastPressed || Math.abs(level - this.level) > 0.02) {
      this.lastPressed = pressed;
      this.level = level;
      this.redraw();
    }
  }

  private redraw(): void {
    const { bw: w, bh: h } = this;
    const pressed = this.pressed;
    const color = this.pole === 'attract' ? COLORS.attract : COLORS.repel;
    const dark = this.pole === 'attract' ? COLORS.attractDark : COLORS.repelDark;
    const g = this.bg;
    g.clear();
    if (this.level > 0.02) {
      g.fillStyle(color, 0.25 * Math.min(1, this.level));
      g.fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 40);
    }
    const depth = pressed ? 2 : 9;
    g.fillStyle(dark, this.enabled ? 1 : 0.5);
    g.fillRoundedRect(-w / 2, -h / 2 + depth, w, h, 34);
    g.fillStyle(color, this.enabled ? 1 : 0.5);
    g.fillRoundedRect(-w / 2, -h / 2 + (pressed ? 7 : 0), w, h, 34);
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(-w / 2 + 8, -h / 2 + 6 + (pressed ? 7 : 0), w - 16, h * 0.3, 26);

    // Horseshoe icon with arrows: inward for attract, outward for repel.
    const ic = this.icon;
    ic.clear();
    const cy = -h * 0.16 + (pressed ? 7 : 0);
    ic.lineStyle(12, 0xffffff, 1);
    ic.beginPath();
    ic.arc(0, cy - 6, 24, Math.PI, 0, false);
    ic.strokePath();
    ic.fillStyle(0xffffff, 1);
    ic.fillRect(-30, cy - 6, 12, 22);
    ic.fillRect(18, cy - 6, 12, 22);
    ic.fillStyle(dark, 1);
    ic.fillRect(-30, cy + 8, 12, 8);
    ic.fillRect(18, cy + 8, 12, 8);
    ic.lineStyle(5, 0xffffff, 1);
    for (const side of [-1, 1]) {
      const x0 = side * 62;
      if (this.pole === 'attract') {
        ic.lineBetween(x0, cy, side * 42, cy);
        ic.lineBetween(side * 42, cy, side * 50, cy - 8);
        ic.lineBetween(side * 42, cy, side * 50, cy + 8);
      } else {
        ic.lineBetween(side * 42, cy, x0, cy);
        ic.lineBetween(x0, cy, x0 - side * 8, cy - 8);
        ic.lineBetween(x0, cy, x0 - side * 8, cy + 8);
      }
    }
  }
}

/** The two magnet controls plus the energy meter. Left-handed mode swaps the sides. */
export class ControlPad {
  readonly attract: HoldButton;
  readonly repel: HoldButton;
  readonly energy: ProgressBar;
  private readonly energyLabel: Phaser.GameObjects.Text;
  private readonly leftX: number;
  private readonly rightX: number;

  constructor(scene: Phaser.Scene, width: number, bottom: number, leftHanded: boolean, showEnergy: boolean) {
    const bw = (width - 72) / 2;
    const bh = 168;
    const y = bottom - bh / 2 - 18;
    const leftX = 24 + bw / 2;
    const rightX = width - 24 - bw / 2;
    this.leftX = leftX;
    this.rightX = rightX;
    // Default: ATTRACT left (blue), REPEL right (red). Left-handed swaps them.
    this.attract = new HoldButton(scene, leftHanded ? rightX : leftX, y, bw, bh, 'attract');
    this.repel = new HoldButton(scene, leftHanded ? leftX : rightX, y, bw, bh, 'repel');
    this.energy = new ProgressBar(scene, width / 2, y - bh / 2 - 26, { width: width * 0.5, height: 14, fill: COLORS.special, trackAlpha: 0.6 });
    this.energyLabel = addText(scene, width / 2, y - bh / 2 - 48, 'Magnetic energy', { size: 18, weight: '600', color: COLORS.inkText });
    this.energy.setVisible(showEnergy);
    this.energyLabel.setVisible(showEnergy);
    this.energy.setValue(1, true);
  }

  objects(): Phaser.GameObjects.GameObject[] {
    return [this.attract, this.repel, this.energy, this.energyLabel];
  }

  update(dt: number, attractLevel: number, repelLevel: number, energyRatio: number): void {
    this.attract.tick(attractLevel);
    this.repel.tick(repelLevel);
    this.energy.setValue(energyRatio);
    this.energy.tick(dt);
  }

  /** Swap sides for left-handed play (takes effect immediately). */
  setLeftHanded(leftHanded: boolean): void {
    this.attract.setX(leftHanded ? this.rightX : this.leftX);
    this.repel.setX(leftHanded ? this.leftX : this.rightX);
  }

  /** Enable each magnet separately (tutorial steps). */
  setAllowed(attract: boolean, repel: boolean): void {
    this.attract.enabled = attract;
    this.repel.enabled = repel;
    this.attract.setAlpha(attract ? 1 : 0.35);
    this.repel.setAlpha(repel ? 1 : 0.35);
  }

  setEnabled(enabled: boolean): void {
    this.attract.enabled = enabled;
    this.repel.enabled = enabled;
    if (!enabled) {
      this.attract.releaseAll();
      this.repel.releaseAll();
    }
  }
}
