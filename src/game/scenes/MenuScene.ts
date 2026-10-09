import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { drawVehicle } from '../entities/Train';
import { GameContext } from '../GameContext';
import { MagnetDemo } from '../gameplay/MagnetDemo';
import { LEVELS } from '../levels/LevelData';
import { getWorld, levelLabel } from '../levels/LevelManager';
import { dateKey, generateDailyLevel } from '../progression/DailyChallenge';
import { nextPlayableLevel } from '../progression/ProgressionManager';
import { Button } from '../ui/Button';
import { drawIcon } from '../ui/Icons';
import { drawLogo } from '../ui/Logo';
import { addText } from '../ui/Typography';
import { COLORS } from '../utils/Constants';
import { BaseScene } from './BaseScene';

/** Main menu with an animated city: cars drive past and a parcel swings between two magnets. */
export class MenuScene extends BaseScene {
  private demo!: MagnetDemo;
  private traffic!: Phaser.GameObjects.Graphics;
  private clock = 0;
  /** Street line below the buttons (hidden when the screen is too short). */
  private trafficY = 0;

  constructor() {
    super('Menu');
  }

  create(): void {
    this.setupScene('Main menu');
    const save = GameContext.save;
    this.addScenery(getWorld(1), 0.12);
    this.traffic = this.add.graphics();
    this.clock = 0;

    const top = this.safeTop;
    const logoY = top + Math.max(190, this.H * 0.16);
    drawLogo(this, this.W / 2 + 30, logoY, 0.92);
    addText(this, this.W / 2, logoY + 196, 'Deliver parcels with magnetic force', { size: 26, weight: '600', color: '#3a2a4a' });
    this.demo = new MagnetDemo(this, this.W / 2, logoY + 300, 200);

    const firstTime = !save.tutorialDone;
    const nextIndex = nextPlayableLevel(save);
    const next = LEVELS[nextIndex];
    const y0 = Math.max(logoY + 420, this.H * 0.5);
    new Button(this, {
      x: this.W / 2,
      y: y0,
      width: 580,
      height: 124,
      label: firstTime ? 'Play' : 'Continue',
      subLabel: firstTime ? 'Start with a quick tutorial' : `Level ${levelLabel(next)} · ${next.name}`,
      icon: 'play',
      fontSize: 42,
      onClick: () => (firstTime ? this.go('Tutorial') : this.go('Gameplay', { mode: 'campaign', index: nextIndex })),
      focus: this.focus,
    });

    const key = dateKey();
    const daily = generateDailyLevel(key);
    const best = save.daily.best[key];
    new Button(this, {
      x: this.W / 2,
      y: y0 + 136,
      width: 580,
      height: 100,
      label: 'Daily Delivery',
      subLabel: best ? `Today's best: ${best.score} · ${best.attempts} tries` : daily.name,
      icon: 'calendar',
      variant: 'success',
      fontSize: 32,
      onClick: () => this.go('Gameplay', { mode: 'daily', key }),
      focus: this.focus,
    });

    const grid: [string, 'globe' | 'levels' | 'parcel' | 'mailbox' | 'gear' | 'magnet', () => void][] = [
      ['Worlds', 'globe', () => this.go('WorldSelect')],
      ['Levels', 'levels', () => this.go('LevelSelect')],
      ['Parcels', 'parcel', () => this.go('Collection', { tab: 'parcels' })],
      ['Mailboxes', 'mailbox', () => this.go('Collection', { tab: 'mailboxes' })],
      ['Settings', 'gear', () => this.go('Settings')],
      ['Tutorial', 'magnet', () => this.go('Tutorial')],
    ];
    grid.forEach(([label, icon, onClick], i) => {
      new Button(this, {
        x: this.W / 2 + (i % 2 === 0 ? -146 : 146),
        y: y0 + 254 + Math.floor(i / 2) * 104,
        width: 280,
        height: 88,
        label,
        icon,
        variant: 'secondary',
        fontSize: 28,
        onClick,
        focus: this.focus,
      });
    });

    const footerY = this.H - this.safeBottom - 40;
    this.trafficY = y0 + 254 + 2 * 104 + 44 + 34;
    if (this.trafficY > footerY - 40) this.trafficY = 0;
    const g = this.add.graphics();
    drawIcon(g, 'star', this.W / 2 - 150, footerY, 26, COLORS.star);
    addText(this, this.W / 2 - 130, footerY, `${save.totalStars} / ${LEVELS.length * 3}`, { size: 24, weight: '700', origin: [0, 0.5] });
    addText(this, this.W / 2 + 90, footerY, 'Made by Medin Turkes', { size: 20, weight: '500', color: COLORS.muted });
    this.focus.onBack = null;
    this.input.once('pointerdown', () => AudioManager.unlock());
  }

  override update(_time: number, delta: number): void {
    const reduced = GameContext.reducedMotion;
    this.clock += (delta / 1000) * (reduced ? 0.2 : 1);
    this.demo.update(delta);
    // Cars driving along the street at the bottom.
    const g = this.traffic;
    g.clear();
    if (!this.trafficY) return;
    const y = this.trafficY;
    g.fillStyle(0x6d6f80, 0.5);
    g.fillRect(0, y + 26, this.W, 10);
    for (let i = 0; i < 3; i++) {
      const dir = i % 2 ? -1 : 1;
      const x = (((this.clock * (140 + i * 40) + i * 300) % (this.W + 300)) + this.W + 300) % (this.W + 300) - 150;
      drawVehicle(g, 'car', dir > 0 ? x : this.W - x, y, 110, 48, dir, this.clock);
    }
  }
}
