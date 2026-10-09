import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { GameContext } from '../GameContext';
import type { Settings } from '../progression/SaveManager';
import { COLORS } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import type { Focusable, FocusManager } from './FocusManager';
import { drawIcon, type IconName } from './Icons';
import { addText } from './Typography';

/** Settings row with an ON/OFF switch. State is shown by text and knob position, not by colour alone. */
export class ToggleRow extends Phaser.GameObjects.Container implements Focusable {
  private readonly switchGraphics: Phaser.GameObjects.Graphics;
  private readonly stateText: Phaser.GameObjects.Text;
  private readonly ring: Phaser.GameObjects.Graphics;
  readonly accessibleName: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly rowW: number,
    icon: IconName,
    label: string,
    description: string,
    private readonly key: keyof Settings,
    focus: FocusManager | null,
    private readonly onChange?: (value: boolean) => void,
  ) {
    super(scene, x, y);
    this.accessibleName = label;
    const w = rowW;
    const h = 104;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.ink, 0.12);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 28);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
    drawIcon(g, icon, -w / 2 + 50, 0, 38, COLORS.ink);
    this.add(g);
    this.add(addText(scene, -w / 2 + 92, -15, label, { size: 29, weight: '700', origin: [0, 0.5] }));
    this.add(addText(scene, -w / 2 + 92, 19, description, { size: 19, weight: '500', color: COLORS.muted, origin: [0, 0.5] }));
    this.switchGraphics = scene.add.graphics();
    this.stateText = addText(scene, w / 2 - 70, 0, '', { size: 22, weight: '700' });
    this.ring = scene.add.graphics();
    this.add([this.switchGraphics, this.stateText, this.ring]);
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    if (this.input) this.input.cursor = 'pointer';
    this.on('pointerup', () => this.activate());
    this.draw();
    scene.add.existing(this);
    focus?.add(this);
    this.once('destroy', () => focus?.remove(this));
  }

  private get value(): boolean {
    return GameContext.settings[this.key];
  }

  private draw(): void {
    const on = this.value;
    const g = this.switchGraphics;
    const cx = this.rowW / 2 - 70;
    g.clear();
    g.fillStyle(on ? COLORS.good : 0xc3cad6, 1);
    g.fillRoundedRect(cx - 52, -24, 104, 48, 24);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(on ? cx + 28 : cx - 28, 0, 19);
    this.stateText.setText(on ? 'ON' : 'OFF');
    this.stateText.setX(on ? cx - 16 : cx + 18);
    this.stateText.setColor(on ? '#ffffff' : COLORS.inkText);
  }

  get focusable(): boolean {
    return this.visible;
  }

  setFocused(focused: boolean): void {
    this.ring.clear();
    if (!focused) return;
    this.ring.lineStyle(6, COLORS.ink, 0.9);
    this.ring.strokeRoundedRect(-this.rowW / 2 - 8, -60, this.rowW + 16, 120, 34);
  }

  activate(): void {
    AudioManager.unlock();
    const next = !this.value;
    GameContext.updateSettings({ [this.key]: next });
    AudioManager.toggle(next);
    if (this.key === 'vibration' && next) Haptics.play('success');
    this.draw();
    this.onChange?.(next);
    const region = document.getElementById('sr-status');
    if (region) region.textContent = `${this.accessibleName} ${next ? 'on' : 'off'}`;
  }
}

export const SETTING_ROWS: [IconName, string, string, keyof Settings][] = [
  ['sound', 'Sound', 'Magnet hum, bumps and chimes', 'sound'],
  ['music', 'Music', 'Bouncy background music', 'music'],
  ['vibrate', 'Vibration', 'Haptics on supported phones', 'vibration'],
  ['motion', 'Reduced motion', 'Fewer animations and shakes', 'reducedMotion'],
  ['hand', 'Left-handed controls', 'Swap ATTRACT and REPEL sides', 'leftHanded'],
];
