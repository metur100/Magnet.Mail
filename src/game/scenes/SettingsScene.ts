import { GameContext } from '../GameContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SETTING_ROWS, ToggleRow } from '../ui/Toggle';
import { addText } from '../ui/Typography';
import { COLORS } from '../utils/Constants';
import { announce, BaseScene } from './BaseScene';

export class SettingsScene extends BaseScene {
  constructor() {
    super('Settings');
  }

  create(): void {
    this.setupScene('Settings');
    const g = this.add.graphics();
    g.fillGradientStyle(0xd9ecff, 0xd9ecff, 0xfff1e2, 0xfff1e2, 1);
    g.fillRect(0, 0, this.W, this.H);
    const top = this.addHeader('Settings', () => this.go('Menu'));
    let y = top + 50;
    for (const [icon, label, description, key] of SETTING_ROWS) {
      new ToggleRow(this, this.W / 2, y, this.W - 60, icon, label, description, key, this.focus);
      y += 120;
    }
    y += 20;
    new Button(this, { x: this.W / 2, y, width: this.W - 60, height: 92, label: 'Replay tutorial', icon: 'magnet', variant: 'secondary', fontSize: 30, onClick: () => this.go('Tutorial'), focus: this.focus });
    y += 114;
    new Button(this, { x: this.W / 2, y, width: this.W - 60, height: 92, label: 'Reset progress', icon: 'trash', variant: 'danger', fontSize: 30, onClick: () => this.confirmReset(), focus: this.focus });
    const s = GameContext.save.stats;
    addText(this, this.W / 2, this.H - this.safeBottom - 86, `${s.deliveries} ${s.deliveries === 1 ? 'delivery' : 'deliveries'} · ${s.impulses} impulses · ${Math.round(s.playSeconds / 60)} min played`, { size: 21, weight: '500', color: COLORS.muted });
    addText(this, this.W / 2, this.H - this.safeBottom - 48, 'Magnet Mail 1.0 · Made by Medin Turkes', { size: 21, weight: '500', color: COLORS.muted });
  }

  private confirmReset(): void {
    const modal: Modal = new Modal(
      this,
      this.focus,
      {
        title: 'Reset all progress?',
        message: 'Stars, best scores, unlocked worlds, collections and daily records will be deleted. Settings are kept. This cannot be undone.',
        actions: [
          {
            label: 'Yes, reset everything',
            icon: 'trash',
            variant: 'danger',
            onClick: () => {
              GameContext.resetProgress();
              modal.close();
              announce('Progress reset');
              this.go('Menu');
            },
          },
          { label: 'Cancel', icon: 'cross', variant: 'secondary', onClick: () => modal.close() },
        ],
      },
      { width: this.W, height: this.H },
    );
  }
}
