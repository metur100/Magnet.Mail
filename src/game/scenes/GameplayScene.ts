import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { GameContext } from '../GameContext';
import { LevelRunner, type LevelResult } from '../gameplay/LevelRunner';
import { Solver } from '../gameplay/Solver';
import { LEVELS } from '../levels/LevelData';
import type { LevelDefinition } from '../levels/LevelDefinition';
import { fitArena, getWorld, levelLabel } from '../levels/LevelManager';
import { createEvents, EV } from '../physics/PhysicsWorld';
import { getMailboxSkin, getParcelSkin } from '../progression/Cosmetics';
import { dateKey, generateDailyLevel } from '../progression/DailyChallenge';
import { isLevelUnlocked, recordDailyResult, recordLevelResult, type RecordOutcome } from '../progression/ProgressionManager';
import { ArenaView } from '../rendering/ArenaView';
import { ensureFxTextures } from '../rendering/Textures';
import { Button } from '../ui/Button';
import { ControlPad } from '../ui/ControlPad';
import { drawIcon } from '../ui/Icons';
import { Modal } from '../ui/Modal';
import { SettingsPanel } from '../ui/SettingsPanel';
import { addText } from '../ui/Typography';
import { COLORS, CONTROLS_HEIGHT, HUD_TOP } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import { formatTime } from '../utils/MathUtils';
import { announce, BaseScene } from './BaseScene';
import type { ResultData } from './ResultScene';

export type GameplayData =
  | { mode: 'campaign'; index: number; hint?: boolean }
  | { mode: 'daily'; key: string; variant?: string; hint?: boolean };

export class GameplayScene extends BaseScene {
  private params!: GameplayData;
  private level!: LevelDefinition;
  private runner!: LevelRunner;
  private view!: ArenaView;
  private pad!: ControlPad;
  private hud!: Phaser.GameObjects.Container;
  private timerText!: Phaser.GameObjects.Text;
  private impulseText!: Phaser.GameObjects.Text;
  private startPrompt!: Phaser.GameObjects.Container;
  private started = false;
  private paused = false;
  private ended = false;
  private modal: Modal | SettingsPanel | null = null;
  private lastToast = 0;
  private lowTimeWarned = false;
  private readonly events$ = createEvents();
  private readonly onBlur = () => this.pause();

  constructor() {
    super('Gameplay');
  }

  init(data: GameplayData): void {
    this.params = data ?? { mode: 'campaign', index: 0 };
  }

  create(): void {
    const p = this.params;
    this.level = p.mode === 'campaign' ? LEVELS[Phaser.Math.Clamp(p.index, 0, LEVELS.length - 1)] : generateDailyLevel(p.key, p.variant);
    const title = p.mode === 'daily' ? `Daily · ${this.level.name}` : `${levelLabel(this.level)} · ${this.level.name}`;
    this.setupScene(`${title}. Press ATTRACT or REPEL to start.`);
    this.started = false;
    this.paused = false;
    this.ended = false;
    this.modal = null;
    this.lowTimeWarned = false;
    ensureFxTextures(this);

    const world = getWorld(this.level.theme ?? this.level.world);
    this.addScenery(world);
    this.runner = new LevelRunner(this.level);
    const top = this.safeTop + HUD_TOP;
    const bottom = this.H - this.safeBottom - CONTROLS_HEIGHT - (this.level.energy !== undefined ? 40 : 0);
    const save = GameContext.save;
    this.view = new ArenaView(
      this,
      this.runner,
      world,
      getParcelSkin(save.selectedParcel),
      getMailboxSkin(save.selectedMailbox),
      fitArena(this.W, top, bottom),
      () => GameContext.reducedMotion,
    );
    this.pad = new ControlPad(this, this.W, this.H - this.safeBottom, GameContext.settings.leftHanded, this.level.energy !== undefined);
    this.buildHud(title, world.theme.text);
    this.bindKeys();

    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onBlur);
    this.events.once('shutdown', () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onBlur);
      AudioManager.silenceHum();
      this.view.destroy();
      this.tweens.killAll();
    });

    if (this.level.tutorial) this.toast(this.level.tutorial, 5200);
    if (p.hint) this.planHint();
  }

  // ------------------------------------------------------------------ HUD

  private buildHud(title: string, textColor: string): void {
    const top = this.safeTop;
    const left = GameContext.settings.leftHanded;
    this.hud = this.add.container(0, 0).setDepth(10);
    const band = this.add.graphics();
    band.fillStyle(0xffffff, 0.82);
    band.fillRoundedRect(196, top + 12, this.W - 392, 100, 28);
    this.hud.add(band);

    // Pause and restart sit on the thumb-free side (right side in left-handed mode).
    const bx1 = left ? this.W - 60 : 60;
    const bx2 = left ? this.W - 148 : 148;
    this.hud.add(new Button(this, { x: bx1, y: top + 62, width: 80, height: 80, icon: 'pause', variant: 'secondary', onClick: () => this.pause(), focus: this.focus }));
    this.hud.add(new Button(this, { x: bx2, y: top + 62, width: 80, height: 80, icon: 'retry', variant: 'secondary', onClick: () => this.restart(), focus: this.focus }));

    this.hud.add(addText(this, this.W / 2, top + 36, title, { size: 24, weight: '600', wrapWidth: this.W - 420 }));
    const icons = this.add.graphics();
    drawIcon(icons, 'clock', this.W / 2 - 92, top + 80, 28, COLORS.ink);
    drawIcon(icons, 'bolt', this.W / 2 + 34, top + 80, 28, COLORS.special);
    this.hud.add(icons);
    this.timerText = addText(this, this.W / 2 - 72, top + 80, formatTime(this.level.timeLimit), { size: 32, weight: '700', origin: [0, 0.5] });
    this.impulseText = addText(this, this.W / 2 + 54, top + 80, '', { size: 32, weight: '700', origin: [0, 0.5] });
    this.hud.add([this.timerText, this.impulseText]);
    const sideX = left ? 60 : this.W - 60;
    this.hud.add(addText(this, sideX, top + 54, this.params.mode === 'daily' ? 'DAILY' : `${this.level.world + 1}-${(this.level.index % 5) + 1}`, { size: 30, weight: '700', color: textColor }));
    this.hud.add(addText(this, sideX, top + 86, `par ${this.level.par}`, { size: 20, weight: '600', color: textColor }));
    this.updateHud();

    // "Press to start" prompt over the course.
    const prompt = addText(this, this.W / 2, 0, 'Press ATTRACT or REPEL to start', { size: 28, weight: '700', color: COLORS.inkText });
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(this.W / 2 - prompt.width / 2 - 24, -prompt.height / 2 - 14, prompt.width + 48, prompt.height + 28, 24);
    const rect = this.view.screenRect();
    this.startPrompt = this.add.container(0, rect.y + rect.height * 0.12, [bg, prompt]).setDepth(15);
    if (!GameContext.reducedMotion) this.tweens.add({ targets: this.startPrompt, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
  }

  private updateHud(): void {
    const s = this.runner.state;
    const left = this.level.timeLimit - s.t;
    this.timerText.setText(formatTime(Math.max(0, left)));
    const low = left <= 10;
    this.timerText.setColor(low ? COLORS.badText : COLORS.inkText);
    if (low && !this.lowTimeWarned && this.started) {
      this.lowTimeWarned = true;
      AudioManager.warning();
      announce('Ten seconds left');
    }
    const limit = this.level.impulseLimit;
    this.impulseText.setText(limit !== undefined ? `${s.impulses}/${limit}` : `${s.impulses}`);
    this.impulseText.setColor(limit !== undefined && s.impulses >= limit ? COLORS.badText : COLORS.inkText);
  }

  private toast(text: string, duration: number, color: string = COLORS.inkText): void {
    const rect = this.view.screenRect();
    const y = rect.y + 46;
    const label = addText(this, this.W / 2, y, text, { size: 25, weight: '600', color, wrapWidth: this.W - 120 });
    const pill = this.add.graphics();
    pill.fillStyle(0xffffff, 0.94);
    pill.fillRoundedRect(this.W / 2 - label.width / 2 - 24, y - label.height / 2 - 12, label.width + 48, label.height + 24, 24);
    const toast = this.add.container(0, 0, [pill, label]).setDepth(20).setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, duration: 200 });
    this.tweens.add({ targets: toast, alpha: 0, delay: duration, duration: 350, onComplete: () => toast.destroy() });
    announce(text);
  }

  private bindKeys(): void {
    this.focus.arrowsNavigate = false;
    this.focus.onBack = () => this.pause();
    const kb = this.input.keyboard;
    if (!kb) return;
    const attract = (down: boolean) => () => this.pad.attract.setKey(down);
    const repel = (down: boolean) => () => this.pad.repel.setKey(down);
    for (const key of ['A', 'LEFT', 'Z']) {
      kb.on(`keydown-${key}`, attract(true));
      kb.on(`keyup-${key}`, attract(false));
    }
    for (const key of ['D', 'RIGHT', 'X']) {
      kb.on(`keydown-${key}`, repel(true));
      kb.on(`keyup-${key}`, repel(false));
    }
    kb.on('keydown-P', () => (this.paused ? this.resume() : this.pause()));
    kb.on('keydown-R', () => {
      if (!this.paused) this.restart();
    });
  }

  // ------------------------------------------------------------------ hint

  /** Plans a route with the solver and shows it as a dotted green path with press markers. */
  private planHint(): void {
    this.toast('Planning a delivery route…', 1600);
    this.time.delayedCall(80, () => {
      if (!this.scene.isActive()) return;
      const result = new Solver(this.level).solve({ budgetMs: 2500, beamWidth: 90 });
      this.view.showRoute(result.path, result.presses, COLORS.route, true);
      this.toast(
        result.success ? 'Follow the green route: blue dots = ATTRACT, red dots = REPEL.' : 'Partial route: it shows how to get started.',
        4200,
      );
    });
  }

  // ------------------------------------------------------------------ loop

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const runner = this.runner;
    const pad = this.pad;
    if (!this.paused && !this.ended) {
      runner.input.attract = pad.attract.pressed;
      runner.input.repel = pad.repel.pressed;
      if (!this.started && (runner.input.attract || runner.input.repel)) {
        this.started = true;
        this.tweens.killTweensOf(this.startPrompt);
        this.startPrompt.destroy();
      }
      if (this.started) runner.update(dt);
      GameContext.governor.record(delta);
    }
    const s = runner.state;
    this.view.sync(this.paused ? 0 : dt);
    pad.update(dt, s.attract.level, s.repel.level, this.level.energy ? s.energy / this.level.energy : 1);
    AudioManager.setHum(this.paused ? 0 : s.attract.level, this.paused ? 0 : s.repel.level);
    if (this.ended) return;
    this.updateHud();

    const ev = runner.takeEvents(this.events$);
    if (ev.flags) this.handleEvents();
    if (runner.finished) this.handleEnd();
  }

  private handleEvents(): void {
    const ev = this.events$;
    this.view.handleEvents(ev);
    if (ev.flags & EV.ATTRACT_PULSE) {
      AudioManager.attractPulse();
      Haptics.play('tap');
    }
    if (ev.flags & EV.REPEL_PULSE) {
      AudioManager.repelPulse();
      Haptics.play('tap');
    }
    if (ev.flags & EV.IMPACT) {
      AudioManager.impact(Math.min(1, ev.impactSpeed / 900));
      if (ev.impactSpeed > 400) Haptics.play('gust');
    }
    if (ev.flags & EV.BOUNCE) AudioManager.boing();
    if (ev.flags & EV.DAMAGE) {
      AudioManager.warning();
      Haptics.play('failure');
      if (this.time.now - this.lastToast > 1500) {
        this.lastToast = this.time.now;
        this.toast('Careful – the parcel is damaged!', 1400, COLORS.badText);
      }
    }
    if (ev.flags & EV.WRONG_MAILBOX) {
      AudioManager.warning();
      Haptics.play('failure');
      this.toast('Wrong address! −80 points', 1600, COLORS.badText);
    }
    if (ev.flags & EV.TELEPORT) AudioManager.teleport();
    if (ev.flags & EV.ENTER_MAILBOX) AudioManager.mailboxOpen();
    if (ev.flags & EV.BLOCKED && this.time.now - this.lastToast > 1500) {
      this.lastToast = this.time.now;
      this.toast(this.runner.state.energy <= 0 ? 'Out of magnetic energy!' : 'No impulses left!', 1400, COLORS.badText);
    }
  }

  // ------------------------------------------------------------------ pause / restart

  pause(): void {
    if (this.paused || this.ended || !this.scene.isActive()) return;
    this.paused = true;
    this.runner.paused = true;
    this.pad.setEnabled(false);
    AudioManager.silenceHum();
    this.openPauseMenu();
    announce('Paused');
  }

  private openPauseMenu(): void {
    this.modal = new Modal(
      this,
      this.focus,
      {
        title: 'Paused',
        message: `${this.level.name} · ${formatTime(this.runner.timeLeft)} left · ${this.runner.state.impulses} impulses`,
        actions: [
          { label: 'Resume', icon: 'play', variant: 'primary', onClick: () => this.resume() },
          { label: 'Restart', icon: 'retry', onClick: () => this.restart() },
          { label: 'Settings', icon: 'gear', onClick: () => this.openSettings() },
          {
            label: this.params.mode === 'daily' ? 'Exit to menu' : 'Exit to level select',
            icon: 'levels',
            onClick: () => this.exit(),
          },
        ],
        onDismiss: () => this.resume(),
      },
      { width: this.W, height: this.H },
    );
  }

  private openSettings(): void {
    (this.modal as Modal | null)?.close();
    this.modal = new SettingsPanel(this, this.focus, { width: this.W, height: this.H }, () => {
      this.pad.setLeftHanded(GameContext.settings.leftHanded);
      this.openPauseMenu();
    });
  }

  resume(): void {
    if (!this.paused) return;
    if (this.modal instanceof Modal) this.modal.close();
    this.modal = null;
    this.paused = false;
    this.runner.paused = false;
    this.pad.setEnabled(true);
    announce('Resumed');
  }

  private restart(): void {
    this.scene.stop('Result');
    this.scene.restart({ ...this.params, hint: false });
  }

  private exit(): void {
    this.scene.stop('Result');
    if (this.params.mode === 'daily') this.go('Menu');
    else this.go('LevelSelect', { world: this.level.world });
  }

  // ------------------------------------------------------------------ end of level

  private handleEnd(): void {
    if (this.ended) return;
    this.ended = true;
    const result = this.runner.getResult() as LevelResult;
    this.pad.setEnabled(false);
    AudioManager.silenceHum();
    const outcome = this.record(result);
    const reduced = GameContext.reducedMotion;
    if (result.success) {
      AudioManager.delivered(result.breakdown.stars === 3);
      Haptics.play('success');
      if (result.breakdown.stars === 3) this.time.delayedCall(300, () => Haptics.play('success'));
      // Replay: the route the parcel actually flew, drawn in green with a ghost parcel.
      this.view.showRoute(this.runner.path.slice(), [], COLORS.route, true);
      announce(`Delivered! ${result.breakdown.stars} stars.`);
      this.tweens.add({ targets: this.hud, alpha: 0.3, duration: 400 });
      this.time.delayedCall(reduced ? 500 : 1900, () => this.showResult(result, outcome));
    } else {
      AudioManager.failure();
      Haptics.play('failure');
      announce(`Delivery failed. ${result.failMessage ?? ''}`);
      this.time.delayedCall(reduced ? 300 : 900, () => this.showResult(result, outcome));
    }
  }

  private record(result: LevelResult): RecordOutcome {
    if (this.params.mode === 'daily') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const outcome = recordDailyResult(GameContext.save, this.params.key, result, dateKey(yesterday));
      GameContext.update(outcome.save);
      return outcome;
    }
    const outcome = recordLevelResult(GameContext.save, result, this.runner.state.t);
    GameContext.update(outcome.save);
    return outcome;
  }

  private showResult(result: LevelResult, outcome: RecordOutcome): void {
    const p = this.params;
    const index = p.mode === 'campaign' ? p.index : -1;
    const save = GameContext.save;
    const payload: ResultData = {
      result,
      outcome,
      title: p.mode === 'daily' ? `Daily · ${this.level.name}` : `${levelLabel(this.level)} · ${this.level.name}`,
      parcel: this.level.parcel,
      daily: p.mode === 'daily' ? p.key : null,
      bestScore: p.mode === 'daily' ? (save.daily.best[p.key]?.score ?? 0) : (save.levels[this.level.id]?.bestScore ?? 0),
      canNext: p.mode === 'campaign' && index + 1 < LEVELS.length && isLevelUnlocked(save, index + 1),
      actions: {
        retry: () => this.restart(),
        next: () => {
          this.scene.stop('Result');
          this.scene.restart({ mode: 'campaign', index: index + 1 });
        },
        exit: () => this.exit(),
        hint: () => {
          this.scene.stop('Result');
          this.scene.restart({ ...p, hint: true });
        },
      },
    };
    this.scene.launch('Result', payload);
  }
}
