import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { GameContext } from '../GameContext';
import { LevelRunner } from '../gameplay/LevelRunner';
import { WORLDS } from '../levels/LevelData';
import { fitArena } from '../levels/LevelManager';
import { TUTORIAL_STEPS } from '../levels/TutorialData';
import { createEvents, EV } from '../physics/PhysicsWorld';
import { getMailboxSkin, getParcelSkin } from '../progression/Cosmetics';
import { ArenaView } from '../rendering/ArenaView';
import { ensureFxTextures } from '../rendering/Textures';
import { Button } from '../ui/Button';
import { ControlPad } from '../ui/ControlPad';
import { Modal } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { addText } from '../ui/Typography';
import { COLORS, CONTROLS_HEIGHT, HUD_TOP } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import { announce, BaseScene } from './BaseScene';

/**
 * Playable tutorial: five tiny levels, each teaching one idea. Failing a step simply resets it.
 * Controls that a step does not use are dimmed and disabled.
 */
export class TutorialScene extends BaseScene {
  private step = 0;
  private runner!: LevelRunner;
  private view: ArenaView | null = null;
  private pad!: ControlPad;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private counter!: Phaser.GameObjects.Text;
  private progress!: ProgressBar;
  private goalMarker!: Phaser.GameObjects.Graphics;
  private transitioning = false;
  private time0 = 0;
  private readonly ev = createEvents();

  constructor() {
    super('Tutorial');
  }

  create(): void {
    this.setupScene('Tutorial');
    ensureFxTextures(this);
    this.step = 0;
    this.view = null;
    this.transitioning = false;
    this.addScenery(WORLDS[0]);

    const top = this.safeTop + 14;
    const card = this.add.graphics().setDepth(10);
    card.fillStyle(0xffffff, 0.95);
    card.fillRoundedRect(16, top, this.W - 32, 150, 28);
    this.counter = addText(this, 44, top + 30, '', { size: 21, weight: '700', color: COLORS.muted, origin: [0, 0.5] }).setDepth(11);
    this.title = addText(this, 44, top + 66, '', { size: 32, weight: '700', origin: [0, 0.5] }).setDepth(11);
    this.body = addText(this, 44, top + 112, '', { size: 22, weight: '500', color: COLORS.muted, origin: [0, 0.5], wrapWidth: this.W - 200 }).setDepth(11);
    this.progress = new ProgressBar(this, this.W / 2, top + 150, { width: this.W - 80, height: 10, fill: COLORS.good, trackAlpha: 0 }).setDepth(11);
    new Button(this, { x: this.W - 96, y: top + 40, width: 132, height: 72, label: 'Skip', variant: 'ghost', fontSize: 24, onClick: () => this.finish(true), focus: this.focus }).setDepth(12);
    this.focus.onBack = () => this.finish(true);
    this.focus.arrowsNavigate = false;

    this.pad = new ControlPad(this, this.W, this.H - this.safeBottom, GameContext.settings.leftHanded, false);
    for (const o of this.pad.objects()) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(12);
    this.goalMarker = this.add.graphics().setDepth(9);
    const kb = this.input.keyboard;
    if (kb) {
      for (const k of ['A', 'LEFT', 'Z']) {
        kb.on(`keydown-${k}`, () => this.pad.attract.setKey(true));
        kb.on(`keyup-${k}`, () => this.pad.attract.setKey(false));
      }
      for (const k of ['D', 'RIGHT', 'X']) {
        kb.on(`keydown-${k}`, () => this.pad.repel.setKey(true));
        kb.on(`keyup-${k}`, () => this.pad.repel.setKey(false));
      }
    }
    this.events.once('shutdown', () => {
      AudioManager.silenceHum();
      this.view?.destroy();
    });
    this.loadStep();
  }

  private loadStep(): void {
    const step = TUTORIAL_STEPS[this.step];
    this.view?.destroy();
    this.runner = new LevelRunner(step.level);
    const top = this.safeTop + HUD_TOP + 30;
    const bottom = this.H - this.safeBottom - CONTROLS_HEIGHT;
    this.view = new ArenaView(
      this,
      this.runner,
      WORLDS[0],
      getParcelSkin(GameContext.save.selectedParcel),
      getMailboxSkin(GameContext.save.selectedMailbox),
      fitArena(this.W, top, bottom),
      () => GameContext.reducedMotion,
    );
    this.view.container.setDepth(1);
    this.pad.setEnabled(true);
    this.pad.setAllowed(step.attract, step.repel);
    this.counter.setText(`Step ${this.step + 1} of ${TUTORIAL_STEPS.length}`);
    this.title.setText(step.title);
    this.body.setText(step.body);
    this.progress.setValue(this.step / TUTORIAL_STEPS.length);
    this.transitioning = false;
    announce(`${step.title}. ${step.body}`);
  }

  override update(_time: number, delta: number): void {
    if (!this.view) return;
    const dt = delta / 1000;
    this.time0 += dt;
    const runner = this.runner;
    if (!this.transitioning) {
      runner.input.attract = this.pad.attract.pressed;
      runner.input.repel = this.pad.repel.pressed;
      runner.update(dt);
    }
    const s = runner.state;
    this.view.sync(dt);
    this.pad.update(dt, s.attract.level, s.repel.level, 1);
    AudioManager.setHum(s.attract.level, s.repel.level);
    this.progress.tick(dt);
    this.drawGoal();

    const ev = runner.takeEvents(this.ev);
    if (ev.flags) {
      this.view.handleEvents(ev);
      if (ev.flags & EV.ATTRACT_PULSE) AudioManager.attractPulse();
      if (ev.flags & EV.REPEL_PULSE) AudioManager.repelPulse();
      if (ev.flags & EV.IMPACT) AudioManager.impact(Math.min(1, ev.impactSpeed / 900));
      if (ev.flags & EV.ENTER_MAILBOX) AudioManager.mailboxOpen();
    }
    if (runner.finished && !this.transitioning) this.stepFinished();
  }

  /** Pulsing yellow target for steps that use a goal area. */
  private drawGoal(): void {
    const g = this.goalMarker;
    g.clear();
    const zone = this.runner.level.goalZone;
    if (!zone || !this.view) return;
    const l = this.view.layout;
    const pulse = GameContext.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(this.time0 * 4);
    g.lineStyle(5, COLORS.goal, 0.6 + 0.4 * pulse);
    g.strokeRoundedRect(l.x + (zone.x - zone.w / 2) * l.scale, l.y + (zone.y - zone.h / 2) * l.scale, zone.w * l.scale, zone.h * l.scale, 24);
    g.fillStyle(COLORS.goal, 0.12 + 0.1 * pulse);
    g.fillRoundedRect(l.x + (zone.x - zone.w / 2) * l.scale, l.y + (zone.y - zone.h / 2) * l.scale, zone.w * l.scale, zone.h * l.scale, 24);
  }

  private stepFinished(): void {
    this.transitioning = true;
    this.pad.setEnabled(false);
    AudioManager.silenceHum();
    const s = this.runner.state;
    if (s.status === 'delivered') {
      AudioManager.delivered(false);
      Haptics.play('success');
      this.flash('Great!', COLORS.goodText);
      this.time.delayedCall(GameContext.reducedMotion ? 400 : 1200, () => {
        this.step++;
        if (this.step >= TUTORIAL_STEPS.length) this.finish(false);
        else this.loadStep();
      });
    } else {
      AudioManager.failure();
      Haptics.play('failure');
      this.flash(s.failReason === 'impulses' ? 'Too many impulses – try again!' : 'Oops – try again!', COLORS.badText);
      this.time.delayedCall(1200, () => this.loadStep());
    }
  }

  private flash(text: string, color: string): void {
    const label = addText(this, this.W / 2, this.H * 0.45, text, { size: 48, weight: '700', color, stroke: '#ffffff', strokeThickness: 8 }).setDepth(30);
    this.tweens.add({ targets: label, alpha: 0, y: label.y - 60, delay: 700, duration: 500, onComplete: () => label.destroy() });
    announce(text);
  }

  private finish(skipped: boolean): void {
    if (!GameContext.save.tutorialDone) GameContext.update({ ...GameContext.save, tutorialDone: true });
    if (skipped) {
      this.go('Menu');
      return;
    }
    this.progress.setValue(1);
    new Modal(
      this,
      this.focus,
      {
        title: 'You are a Magnet Mail courier!',
        message: 'Deliver every parcel gently. Fewer impulses, fewer bumps and more time left earn more stars.',
        actions: [
          { label: 'Start Level 1', icon: 'play', variant: 'primary', onClick: () => this.go('Gameplay', { mode: 'campaign', index: 0 }) },
          { label: 'Main menu', icon: 'home', onClick: () => this.go('Menu') },
        ],
        onDismiss: () => this.go('Menu'),
      },
      { width: this.W, height: this.H },
    );
  }
}
