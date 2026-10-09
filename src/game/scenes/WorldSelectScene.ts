import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { drawParcel } from '../entities/Parcel';
import { GameContext } from '../GameContext';
import { LEVELS, LEVELS_PER_WORLD, WORLDS } from '../levels/LevelData';
import type { WorldDefinition } from '../levels/LevelDefinition';
import { PARCEL_TYPES } from '../physics/ParcelBody';
import { getParcelSkin } from '../progression/Cosmetics';
import { isWorldUnlocked, worldLockReason, worldStars } from '../progression/ProgressionManager';
import { fillRoundedGradient } from '../ui/Draw';
import type { Focusable } from '../ui/FocusManager';
import { drawIcon } from '../ui/Icons';
import { addText } from '../ui/Typography';
import { COLORS } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import { announce, BaseScene } from './BaseScene';

/** World card: theme colours, an animated parcel preview of the world's parcel type, stars and lock state. */
class WorldCard extends Phaser.GameObjects.Container implements Focusable {
  private readonly ring: Phaser.GameObjects.Graphics;
  readonly accessibleName: string;

  constructor(
    scene: WorldSelectScene,
    x: number,
    y: number,
    private readonly cardW: number,
    private readonly cardH: number,
    readonly world: WorldDefinition,
    readonly unlocked: boolean,
    private readonly onPick: () => void,
  ) {
    super(scene, x, y);
    const w = cardW;
    const h = cardH;
    this.accessibleName = world.name;
    const t = world.theme;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.ink, 0.15);
    g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 30);
    fillRoundedGradient(g, -w / 2, -h / 2, w, h, 30, t.skyTop, t.skyBottom);
    g.fillStyle(t.ground, 1);
    g.fillRect(-w / 2 + 30, h / 2 - 112, w - 60, 8);
    this.add(g);

    // Parcel preview bobbing above the "ground".
    const parcelType = LEVELS[world.id * LEVELS_PER_WORLD].parcel;
    const parcel = scene.add.graphics();
    drawParcel(parcel, parcelType, getParcelSkin(GameContext.save.selectedParcel), PARCEL_TYPES[parcelType].radius * 1.2);
    parcel.setPosition(0, -h / 2 + 90);
    this.add(parcel);
    if (unlocked && !GameContext.reducedMotion) {
      scene.tweens.add({ targets: parcel, y: -h / 2 + 70, angle: 10, duration: 900 + world.id * 80, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    const label = scene.add.graphics();
    label.fillStyle(0xffffff, 0.93);
    label.fillRoundedRect(-w / 2 + 12, h / 2 - 100, w - 24, 88, 22);
    this.add(label);
    this.add(addText(scene, -w / 2 + 28, h / 2 - 74, `${world.id + 1}. ${world.name}`, { size: 24, weight: '700', origin: [0, 0.5] }));
    const icons = scene.add.graphics();
    drawIcon(icons, 'star', -w / 2 + 40, h / 2 - 36, 24, COLORS.star);
    this.add(icons);
    this.add(addText(scene, -w / 2 + 60, h / 2 - 36, `${worldStars(GameContext.save, world.id)} / 15  ·  ${PARCEL_TYPES[parcelType].name}`, { size: 20, weight: '600', color: COLORS.muted, origin: [0, 0.5] }));

    if (!unlocked) {
      const lock = scene.add.graphics();
      lock.fillStyle(COLORS.ink, 0.55);
      lock.fillRoundedRect(-w / 2, -h / 2, w, h - 106, { tl: 30, tr: 30, bl: 0, br: 0 });
      drawIcon(lock, 'lock', 0, -h / 2 + 56, 50, 0xffffff);
      this.add(lock);
      this.add(addText(scene, 0, -h / 2 + 118, `Locked\n${worldLockReason(GameContext.save, world.id) ?? ''}`, { size: 20, weight: '600', color: '#ffffff', wrapWidth: w - 30 }));
    }
    this.ring = scene.add.graphics();
    this.add(this.ring);
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    if (this.input) this.input.cursor = 'pointer';
    this.on('pointerup', () => this.activate());
    scene.add.existing(this);
    scene.focus.add(this);
  }

  get focusable(): boolean {
    return true;
  }

  setFocused(focused: boolean): void {
    this.ring.clear();
    if (!focused) return;
    this.ring.lineStyle(6, COLORS.ink, 0.9);
    this.ring.strokeRoundedRect(-this.cardW / 2 - 8, -this.cardH / 2 - 8, this.cardW + 16, this.cardH + 16, 36);
  }

  activate(): void {
    AudioManager.unlock();
    Haptics.play('tap');
    if (!this.unlocked) {
      AudioManager.toggle(false);
      announce(`${this.world.name} is locked. ${worldLockReason(GameContext.save, this.world.id) ?? ''}`);
      this.scene.tweens.add({ targets: this, x: this.x + 10, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    AudioManager.button();
    this.onPick();
  }
}

export class WorldSelectScene extends BaseScene {
  constructor() {
    super('WorldSelect');
  }

  create(): void {
    this.setupScene('World select');
    const g = this.add.graphics();
    g.fillGradientStyle(0xd9ecff, 0xd9ecff, 0xfff1e2, 0xfff1e2, 1);
    g.fillRect(0, 0, this.W, this.H);
    const top = this.addHeader('Worlds', () => this.go('Menu'));
    const total = GameContext.save.totalStars;
    addText(this, this.W / 2, top + 4, `${total} ${total === 1 ? 'star' : 'stars'} collected`, { size: 26, weight: '500', color: COLORS.muted });
    const gap = 20;
    const cardW = (this.W - 48 - gap) / 2;
    const areaTop = top + 40;
    const cardH = Math.min(330, (this.H - this.safeBottom - 24 - areaTop - gap * 2) / 3);
    WORLDS.forEach((world, i) => {
      const x = 24 + cardW / 2 + (i % 2) * (cardW + gap);
      const y = areaTop + cardH / 2 + Math.floor(i / 2) * (cardH + gap);
      new WorldCard(this, x, y, cardW, cardH, world, isWorldUnlocked(GameContext.save, world.id), () => this.go('LevelSelect', { world: world.id }));
    });
  }
}
