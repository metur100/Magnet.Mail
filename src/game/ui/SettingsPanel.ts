import Phaser from 'phaser';

import { COLORS } from '../utils/Constants';
import { Button } from './Button';
import type { FocusManager } from './FocusManager';
import { SETTING_ROWS, ToggleRow } from './Toggle';
import { addText } from './Typography';

/** In-game settings dialog (opened from the pause menu). */
export class SettingsPanel extends Phaser.GameObjects.Container {
  private closed = false;

  constructor(
    scene: Phaser.Scene,
    private readonly focus: FocusManager,
    screen: { width: number; height: number },
    private readonly onClose: () => void,
  ) {
    super(scene, 0, 0);
    const dim = scene.add.rectangle(0, 0, screen.width, screen.height, COLORS.ink, 0.55).setOrigin(0).setInteractive();
    this.add(dim);
    focus.pushLayer(() => this.close());
    const w = Math.min(640, screen.width - 40);
    const rowGap = 116;
    const h = 140 + SETTING_ROWS.length * rowGap + 120;
    const top = (screen.height - h) / 2;
    const bg = scene.add.graphics();
    bg.fillStyle(0xf3f6fb, 1);
    bg.fillRoundedRect((screen.width - w) / 2, top, w, h, 34);
    this.add(bg);
    this.add(scene.add.zone(screen.width / 2, top + h / 2, w, h).setInteractive());
    this.add(addText(scene, screen.width / 2, top + 60, 'Settings', { size: 42, weight: '700' }));
    SETTING_ROWS.forEach(([icon, label, description, key], i) => {
      this.add(new ToggleRow(scene, screen.width / 2, top + 150 + i * rowGap, w - 40, icon, label, description, key, focus));
    });
    this.add(
      new Button(scene, {
        x: screen.width / 2,
        y: top + h - 70,
        width: w - 80,
        height: 88,
        label: 'Done',
        icon: 'check',
        onClick: () => this.close(),
        focus,
      }),
    );
    this.setDepth(1100);
    scene.add.existing(this);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.focus.popLayer();
    this.destroy();
    this.onClose();
  }
}
