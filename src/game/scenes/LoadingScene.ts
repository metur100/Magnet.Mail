import { MagnetDemo } from '../gameplay/MagnetDemo';
import { WORLDS } from '../levels/LevelData';
import { sceneryTexture } from '../rendering/Scenery';
import { drawLogo } from '../ui/Logo';
import { ProgressBar } from '../ui/ProgressBar';
import { addText } from '../ui/Typography';
import { COLORS, FONT_FAMILY } from '../utils/Constants';
import { BaseScene } from './BaseScene';

/** Loading screen: logo, an animated parcel between two magnets and a real progress bar. */
export class LoadingScene extends BaseScene {
  private demo!: MagnetDemo;
  private bar!: ProgressBar;
  private tasks: (() => Promise<void> | void)[] = [];
  private done = 0;
  private busy = false;
  private minUntil = 0;

  constructor() {
    super('Loading');
  }

  create(): void {
    this.setupScene('Loading Magnet Mail');
    const g = this.add.graphics();
    g.fillGradientStyle(0xd9ecff, 0xd9ecff, 0xfff1e2, 0xfff1e2, 1);
    g.fillRect(0, 0, this.W, this.H);
    drawLogo(this, this.W / 2, this.H * 0.3, 1);
    this.demo = new MagnetDemo(this, this.W / 2, this.H * 0.56, 220);
    this.bar = new ProgressBar(this, this.W / 2, this.H * 0.72, { width: 420, height: 22, fill: COLORS.attract, trackAlpha: 0.8 });
    addText(this, this.W / 2, this.H * 0.72 + 50, 'Charging the magnets…', { size: 26, weight: '500', color: COLORS.muted });
    this.tasks = [() => this.loadFonts(), ...WORLDS.map((w) => () => void sceneryTexture(this, w, this.W, this.H, Math.min(this.k, 1.5)))];
    this.done = 0;
    this.busy = false;
    this.minUntil = this.time.now + 900;
  }

  private async loadFonts(): Promise<void> {
    if (!document.fonts) return;
    try {
      await Promise.race([
        Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 32px ${FONT_FAMILY}`))),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      /* fallback font is fine */
    }
  }

  override update(_time: number, delta: number): void {
    this.demo.update(delta);
    this.bar.tick(delta / 1000);
    if (this.busy) return;
    if (this.done < this.tasks.length) {
      this.busy = true;
      Promise.resolve(this.tasks[this.done]()).finally(() => {
        this.done++;
        this.bar.setValue(this.done / this.tasks.length);
        this.busy = false;
      });
      return;
    }
    if (this.time.now >= this.minUntil) {
      this.busy = true;
      this.go('Menu');
    }
  }
}
