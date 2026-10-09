import { AudioManager } from '../audio/AudioManager';
import { drawParcel } from '../entities/Parcel';
import { GameContext } from '../GameContext';
import type { LevelResult } from '../gameplay/LevelRunner';
import { WORLDS } from '../levels/LevelData';
import { PARCEL_TYPES, type ParcelTypeId } from '../physics/ParcelBody';
import { getMailboxSkin, getParcelSkin, MAILBOX_SKINS, PARCEL_SKINS } from '../progression/Cosmetics';
import type { RecordOutcome } from '../progression/ProgressionManager';
import { Button } from '../ui/Button';
import { StarRating } from '../ui/StarRating';
import { addText } from '../ui/Typography';
import { COLORS } from '../utils/Constants';
import { formatTime } from '../utils/MathUtils';
import { announce, BaseScene } from './BaseScene';

export interface ResultData {
  result: LevelResult;
  outcome: RecordOutcome;
  title: string;
  parcel: ParcelTypeId;
  /** Daily challenge date key, or null for campaign levels. */
  daily: string | null;
  bestScore: number;
  canNext: boolean;
  actions: {
    retry: () => void;
    next: () => void;
    exit: () => void;
    hint: () => void;
  };
}

/** Success / failure overlay shown above the gameplay scene. */
export class ResultScene extends BaseScene {
  private payload!: ResultData;

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.payload = data;
  }

  create(): void {
    this.setupScene();
    this.cameras.main.fadeIn(0);
    this.add.rectangle(0, 0, this.W, this.H, COLORS.ink, 0.35).setOrigin(0);
    this.add.zone(0, 0, this.W, this.H).setOrigin(0).setInteractive();
    if (this.payload.result.success) this.buildSuccess();
    else this.buildFailure();
  }

  private panel(top: number, height: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.ink, 0.15);
    g.fillRoundedRect(20, top + 10, this.W - 40, height, 40);
    g.fillStyle(COLORS.panel, 0.98);
    g.fillRoundedRect(20, top, this.W - 40, height, 40);
  }

  /** Small delivery animation: the parcel drops into a mailbox, the lid closes and the flag rises. */
  private deliveryAnimation(x: number, y: number): void {
    const skin = getMailboxSkin(GameContext.save.selectedMailbox);
    const reduced = GameContext.reducedMotion;
    const box = this.add.graphics();
    box.fillStyle(skin.body, 1);
    box.fillRoundedRect(x - 60, y - 44, 120, 84, 16);
    box.fillStyle(0x000000, 0.25);
    box.fillRoundedRect(x - 48, y - 36, 96, 40, 10);
    box.fillStyle(skin.trim, 1);
    box.fillRect(x - 8, y + 40, 16, 30);
    const parcel = this.add.graphics();
    drawParcel(parcel, this.payload.parcel, getParcelSkin(GameContext.save.selectedParcel), PARCEL_TYPES[this.payload.parcel].radius * 0.9);
    parcel.setPosition(x, reduced ? y - 16 : y - 150);
    const front = this.add.graphics();
    front.fillStyle(skin.body, 1);
    front.fillRoundedRect(x - 60, y - 6, 120, 46, 14);
    front.lineStyle(3, skin.trim, 1);
    front.strokeRoundedRect(x - 60, y - 6, 120, 46, 14);
    const flag = this.add.graphics();
    flag.fillStyle(0x6b7280, 1);
    flag.fillRect(0, -40, 5, 40);
    flag.fillStyle(skin.flag, 1);
    flag.fillRect(5, -40, 24, 15);
    flag.setPosition(x + 66, y + 30);
    if (reduced) {
      flag.setY(y);
      return;
    }
    this.tweens.add({ targets: parcel, y: y - 16, duration: 520, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: flag, y, duration: 400, delay: 520, ease: 'Back.easeOut' });
  }

  private buildSuccess(): void {
    const p = this.payload;
    const r = p.result;
    const top = Math.max(this.safeTop + 30, this.H - this.safeBottom - 1040);
    const height = this.H - this.safeBottom - 20 - top;
    this.panel(top, height);
    const reduced = GameContext.reducedMotion;
    addText(this, this.W / 2, top + 54, r.breakdown.stars === 3 ? 'Perfect delivery!' : 'Delivered!', { size: 46, weight: '700', color: COLORS.goodText });
    addText(this, this.W / 2, top + 100, p.title, { size: 26, weight: '500', color: COLORS.muted });
    this.deliveryAnimation(this.W / 2, top + 220);

    const stars = new StarRating(this, this.W / 2, top + 350, 78, 24);
    stars.setStars(r.breakdown.stars, !reduced, (i) => AudioManager.starPop(i));
    if (reduced) stars.setStars(r.breakdown.stars);

    const scoreText = addText(this, this.W / 2, top + 440, 'Score 0', { size: 42, weight: '700' });
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter,
      v: r.breakdown.score,
      duration: reduced ? 0 : 900,
      delay: reduced ? 0 : 300,
      onUpdate: () => scoreText.setText(`Score ${Math.round(counter.v)}`),
      onComplete: () => scoreText.setText(`Score ${r.breakdown.score}`),
    });
    const bestLine = p.outcome.newBest ? `New best! (was ${p.outcome.previousBest})` : `Best score ${p.bestScore}`;
    addText(this, this.W / 2, top + 486, bestLine, { size: 24, weight: '600', color: p.outcome.newBest ? COLORS.goodText : COLORS.muted });

    const stats = [
      `${r.impulses} impulse${r.impulses === 1 ? '' : 's'}`,
      `${r.collisions} collision${r.collisions === 1 ? '' : 's'}`,
      `${formatTime(r.timeLeft)} left`,
    ].join('  ·  ');
    addText(this, this.W / 2, top + 528, stats, { size: 23, weight: '500', color: COLORS.muted });
    if (r.wrongMailboxes) addText(this, this.W / 2, top + 560, `Wrong mailbox penalty −${r.breakdown.penalty}`, { size: 21, weight: '600', color: COLORS.badText });

    const notes: string[] = [];
    for (const w of p.outcome.worldsUnlocked) notes.push(`New world: ${WORLDS[w].name}!`);
    for (const id of p.outcome.newParcels) notes.push(`New parcel: ${PARCEL_SKINS.find((s) => s.id === id)?.name ?? id}`);
    for (const id of p.outcome.newMailboxes) notes.push(`New mailbox: ${MAILBOX_SKINS.find((s) => s.id === id)?.name ?? id}`);
    let y = top + 600;
    if (notes.length) {
      addText(this, this.W / 2, y, notes.slice(0, 3).join('\n'), { size: 23, weight: '600', color: COLORS.goodText, lineSpacing: 6 });
      y += 34 * Math.min(3, notes.length);
    }
    if (p.daily) this.dailyRecords(y + 10);

    const by = this.H - this.safeBottom - 180;
    new Button(this, { x: this.W / 2 - 160, y: by, width: 260, height: 96, label: 'Retry', icon: 'retry', variant: 'secondary', onClick: p.actions.retry, focus: this.focus });
    const primary = p.canNext
      ? new Button(this, { x: this.W / 2 + 145, y: by, width: 290, height: 96, label: 'Next level', icon: 'next', fontSize: 30, onClick: p.actions.next, focus: this.focus })
      : new Button(this, { x: this.W / 2 + 145, y: by, width: 290, height: 96, label: p.daily ? 'Menu' : 'Levels', icon: p.daily ? 'home' : 'levels', onClick: p.actions.exit, focus: this.focus });
    new Button(this, {
      x: this.W / 2,
      y: by + 108,
      width: 420,
      height: 80,
      label: p.daily ? 'Main menu' : 'Level select',
      icon: p.daily ? 'home' : 'levels',
      variant: 'ghost',
      fontSize: 28,
      onClick: p.actions.exit,
      focus: this.focus,
    });
    this.focus.focus(primary);
    this.focus.onBack = p.actions.exit;
    announce(`Delivered. ${r.breakdown.stars} stars. Score ${r.breakdown.score}. ${notes.join('. ')}`);
  }

  /** Personal "leaderboard": the player's own best daily scores of the last days. */
  private dailyRecords(y: number): number {
    const best = GameContext.save.daily.best;
    const rows = Object.entries(best)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 5);
    if (!rows.length) return y;
    addText(this, this.W / 2, y, `Your daily records · streak ${GameContext.save.daily.streak}`, { size: 22, weight: '700' });
    const ranked = [...rows].sort((a, b) => b[1].score - a[1].score).map(([k]) => k);
    rows.forEach(([key, rec], i) => {
      const today = key === this.payload.daily;
      const line = `#${ranked.indexOf(key) + 1}   ${key}   ${rec.score} pts   ${'★'.repeat(rec.stars)}${'☆'.repeat(3 - rec.stars)}`;
      addText(this, this.W / 2, y + 32 + i * 28, line, { size: 20, weight: today ? '700' : '500', color: today ? COLORS.inkText : COLORS.muted });
    });
    return y + 40 + rows.length * 28;
  }

  private buildFailure(): void {
    const p = this.payload;
    const r = p.result;
    const height = 680;
    const top = Math.max(this.safeTop + 40, (this.H - height) / 2);
    this.panel(top, height);
    // Broken parcel icon.
    const g = this.add.graphics();
    drawParcel(g, p.parcel, getParcelSkin(GameContext.save.selectedParcel), 34, 80);
    g.setPosition(this.W / 2, top + 90).setAngle(-12);
    addText(this, this.W / 2, top + 176, 'Delivery failed', { size: 46, weight: '700', color: COLORS.badText });
    addText(this, this.W / 2, top + 236, r.failMessage ?? 'The parcel did not arrive.', { size: 27, weight: '500', color: COLORS.inkText, wrapWidth: this.W - 140 });
    addText(this, this.W / 2, top + 296, `${r.impulses} impulses · ${r.collisions} collisions · ${formatTime(r.timeLeft)} left`, { size: 22, weight: '500', color: COLORS.muted });

    let y = top + 380;
    const retry = new Button(this, { x: this.W / 2, y, width: 520, height: 96, label: 'Retry', icon: 'retry', onClick: p.actions.retry, focus: this.focus });
    y += 112;
    // Hints are free. MonetizationManager is the integration point for an optional rewarded hint.
    new Button(this, { x: this.W / 2, y, width: 520, height: 90, label: 'Retry with a hint', icon: 'hint', variant: 'success', fontSize: 30, onClick: p.actions.hint, focus: this.focus });
    y += 106;
    new Button(this, {
      x: this.W / 2,
      y,
      width: 520,
      height: 80,
      label: p.daily ? 'Exit to menu' : 'Exit to level select',
      icon: 'levels',
      variant: 'ghost',
      fontSize: 28,
      onClick: p.actions.exit,
      focus: this.focus,
    });
    this.focus.focus(retry);
    this.focus.onBack = p.actions.exit;
    announce(`Delivery failed. ${r.failMessage ?? ''}`);
  }
}

