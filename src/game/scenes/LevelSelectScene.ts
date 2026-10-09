import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { GameContext } from '../GameContext';
import { LEVELS, LEVELS_PER_WORLD, WORLDS } from '../levels/LevelData';
import type { LevelDefinition } from '../levels/LevelDefinition';
import { levelLabel } from '../levels/LevelManager';
import { isLevelUnlocked, isWorldUnlocked, nextPlayableLevel, worldLockReason, worldStars } from '../progression/ProgressionManager';
import type { LevelRecord } from '../progression/SaveManager';
import type { Focusable } from '../ui/FocusManager';
import { drawIcon, starPoints } from '../ui/Icons';
import { addText } from '../ui/Typography';
import { COLORS } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import { announce, BaseScene } from './BaseScene';

/** One level tile: number, stars (filled / hollow), best score and best impulse count, or a lock. */
class LevelTile extends Phaser.GameObjects.Container implements Focusable {
  private readonly ring: Phaser.GameObjects.Graphics;
  readonly accessibleName: string;

  constructor(
    scene: LevelSelectScene,
    x: number,
    y: number,
    private readonly tileW: number,
    private readonly tileH: number,
    readonly level: LevelDefinition,
    readonly unlocked: boolean,
    record: LevelRecord | undefined,
    current: boolean,
    accent: number,
    private readonly onPick: () => void,
  ) {
    super(scene, x, y);
    const w = tileW;
    const h = tileH;
    this.accessibleName = `Level ${levelLabel(level)}`;
    const g = scene.add.graphics();
    const fill = !unlocked ? 0xd8dee8 : current ? accent : 0xffffff;
    g.fillStyle(COLORS.ink, 0.16);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 22);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    if (record?.completed) {
      // Completion tick in the corner (shape, not colour, shows the status).
      g.fillStyle(COLORS.good, 1);
      g.fillCircle(w / 2 - 14, -h / 2 + 14, 11);
      g.lineStyle(3, 0xffffff, 1);
      g.lineBetween(w / 2 - 19, -h / 2 + 14, w / 2 - 15, -h / 2 + 18);
      g.lineBetween(w / 2 - 15, -h / 2 + 18, w / 2 - 8, -h / 2 + 9);
    }
    this.add(g);
    const textColor = current ? '#ffffff' : COLORS.inkText;
    if (unlocked) {
      this.add(addText(scene, 0, -h / 2 + 28, String((level.index % LEVELS_PER_WORLD) + 1), { size: 34, weight: '700', color: textColor }));
      const stars = record?.stars ?? 0;
      const sg = scene.add.graphics();
      for (let i = 0; i < 3; i++) {
        const pts = starPoints((i - 1) * 22, -h / 2 + 62, 9);
        if (i < stars) {
          sg.fillStyle(COLORS.star, 1);
          sg.fillPoints(pts, true);
          sg.lineStyle(2, 0x9a6a10, 1);
          sg.strokePoints(pts, true, true);
        } else {
          sg.lineStyle(2, current ? 0xffffff : 0x9aa6ba, 1);
          sg.strokePoints(pts, true, true);
        }
      }
      this.add(sg);
      if (record?.completed) {
        this.add(addText(scene, 0, -h / 2 + 88, `${record.bestScore}`, { size: 18, weight: '700', color: textColor }));
        this.add(addText(scene, 0, -h / 2 + 108, `${record.bestImpulses} imp.`, { size: 15, weight: '600', color: current ? '#ffffff' : COLORS.muted }));
      }
    } else {
      const lock = scene.add.graphics();
      drawIcon(lock, 'lock', 0, 0, 36, 0x8793a8);
      this.add(lock);
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
    this.ring.strokeRoundedRect(-this.tileW / 2 - 7, -this.tileH / 2 - 7, this.tileW + 14, this.tileH + 14, 28);
  }

  activate(): void {
    AudioManager.unlock();
    Haptics.play('tap');
    if (!this.unlocked) {
      AudioManager.toggle(false);
      announce(`Level ${levelLabel(this.level)} is locked.`);
      this.scene.tweens.add({ targets: this, angle: 5, duration: 60, yoyo: true, repeat: 2 });
      return;
    }
    AudioManager.button();
    this.onPick();
  }
}

/** All 30 levels, one row per world. */
export class LevelSelectScene extends BaseScene {
  private focusWorld = -1;

  constructor() {
    super('LevelSelect');
  }

  init(data: { world?: number }): void {
    this.focusWorld = data?.world ?? -1;
  }

  create(): void {
    this.setupScene('Level select');
    const save = GameContext.save;
    const g = this.add.graphics();
    g.fillGradientStyle(0xd9ecff, 0xd9ecff, 0xfff1e2, 0xfff1e2, 1);
    g.fillRect(0, 0, this.W, this.H);
    const top = this.addHeader('Levels', () => this.go('WorldSelect'));
    const next = nextPlayableLevel(save);
    if (this.focusWorld < 0) this.focusWorld = Math.floor(next / LEVELS_PER_WORLD);
    const areaTop = top + 4;
    const rowH = (this.H - this.safeBottom - 14 - areaTop) / WORLDS.length;
    const tileH = Math.min(124, rowH - 44);
    const tileW = 118;
    const gap = (this.W - 40 - tileW * LEVELS_PER_WORLD) / (LEVELS_PER_WORLD - 1);
    let target: LevelTile | null = null;
    WORLDS.forEach((world, w) => {
      const y0 = areaTop + w * rowH;
      const band = this.add.graphics();
      band.fillStyle(world.theme.skyTop, w === this.focusWorld ? 0.8 : 0.45);
      band.fillRoundedRect(10, y0 + 2, this.W - 20, rowH - 6, 24);
      addText(this, 26, y0 + 22, `${w + 1}. ${world.name}`, { size: 24, weight: '700', origin: [0, 0.5] });
      const icons = this.add.graphics();
      if (isWorldUnlocked(save, w)) {
        drawIcon(icons, 'star', this.W - 130, y0 + 22, 22, COLORS.star);
        addText(this, this.W - 114, y0 + 22, `${worldStars(save, w)} / 15`, { size: 22, weight: '600', color: COLORS.muted, origin: [0, 0.5] });
      } else {
        drawIcon(icons, 'lock', this.W - 36, y0 + 22, 22, 0x6b7890);
        addText(this, this.W - 56, y0 + 22, worldLockReason(save, w) ?? '', { size: 18, weight: '600', color: COLORS.muted, origin: [1, 0.5] });
      }
      for (let i = 0; i < LEVELS_PER_WORLD; i++) {
        const index = w * LEVELS_PER_WORLD + i;
        const level = LEVELS[index];
        const record = save.levels[level.id];
        const tile = new LevelTile(
          this,
          20 + tileW / 2 + i * (tileW + gap),
          y0 + 40 + tileH / 2,
          tileW,
          tileH,
          level,
          isLevelUnlocked(save, index),
          record,
          index === next && !record?.completed,
          world.theme.accent,
          () => this.go('Gameplay', { mode: 'campaign', index }),
        );
        if (w === this.focusWorld && (target === null || index === next)) target = tile;
      }
    });
    if (target && this.input.keyboard) {
      const t = target;
      this.input.keyboard.once('keydown', () => {
        if (!this.focus.hasModal) this.focus.focus(t);
      });
    }
  }
}
