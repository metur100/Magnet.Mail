import type Phaser from 'phaser';

import { GameContext } from '../GameContext';
import type { LevelRunner } from '../gameplay/LevelRunner';
import type { BaseScene } from '../scenes/BaseScene';

interface ButtonInfo {
  label: string;
  /** Page (CSS pixel) coordinates of the widget centre. */
  x: number;
  y: number;
  scene: string;
}

/**
 * Automation API for scripts/smoke.mjs (Playwright). It only reads state and reports where widgets
 * are – the smoke test still presses them with real pointer events.
 */
export function installTestHooks(game: Phaser.Game): void {
  const canvasRect = () => game.canvas.getBoundingClientRect();
  const runner = (): LevelRunner | null => {
    if (!game.scene.isActive('Gameplay')) return null;
    return (game.scene.getScene('Gameplay') as unknown as { runner?: LevelRunner }).runner ?? null;
  };
  const hooks = {
    game,
    activeScenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    buttons: (): ButtonInfo[] => {
      const rect = canvasRect();
      const scale = rect.width / GameContext.profile.width;
      const out: ButtonInfo[] = [];
      for (const scene of game.scene.getScenes(true) as BaseScene[]) {
        if (typeof scene.listButtons !== 'function') continue;
        const cam = scene.cameras.main;
        for (const widget of scene.listButtons()) {
          const m = widget.getWorldTransformMatrix();
          const zoom = cam.zoom / GameContext.profile.renderScale;
          const sx = (m.tx - cam.midPoint.x) * zoom + GameContext.profile.width / 2;
          const sy = (m.ty - cam.midPoint.y) * zoom + GameContext.profile.height / 2;
          out.push({ label: widget.accessibleName, x: rect.left + sx * scale, y: rect.top + sy * scale, scene: scene.scene.key });
        }
      }
      return out;
    },
    toPage: (x: number, y: number) => {
      const rect = canvasRect();
      const scale = rect.width / GameContext.profile.width;
      return { x: rect.left + x * scale, y: rect.top + y * scale };
    },
    gameplay: () => {
      const r = runner();
      if (!r) return null;
      const s = r.state;
      return {
        levelId: r.level.id,
        status: s.status,
        failReason: s.failReason,
        x: s.x,
        y: s.y,
        vx: s.vx,
        vy: s.vy,
        t: s.t,
        impulses: s.impulses,
        collisions: s.collisions,
        attract: s.attract.level,
        repel: s.repel.level,
        movers: r.world.colliders.filter((c) => c.def && (c.kind === 'platform' || c.kind === 'train' || c.kind === 'rotor')).map((c) => [c.cx, c.cy]),
      };
    },
    start: (key: string, data?: object) => {
      for (const scene of game.scene.getScenes(true)) if (scene.scene.key !== key) scene.scene.stop();
      game.scene.start(key, data);
    },
    tutorialStep: () => (game.scene.isActive('Tutorial') ? (game.scene.getScene('Tutorial') as unknown as { step: number }).step : -1),
    save: () => GameContext.save,
    profile: () => GameContext.profile,
  };
  (window as unknown as { __MM__: typeof hooks }).__MM__ = hooks;
}
