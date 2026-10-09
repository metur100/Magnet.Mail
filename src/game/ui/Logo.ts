import type Phaser from 'phaser';

import { GameContext } from '../GameContext';
import { COLORS } from '../utils/Constants';
import { addText } from './Typography';

/** "Magnet Mail" wordmark: a horseshoe magnet pulling an envelope, with blue/red field arcs. */
export function drawLogo(scene: Phaser.Scene, x: number, y: number, scale: number): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const art = scene.add.graphics();
  // Field arcs.
  for (let i = 0; i < 3; i++) {
    art.lineStyle(6, i % 2 ? COLORS.repel : COLORS.attract, 0.85);
    art.beginPath();
    art.arc(-150, -110, 46 + i * 18, -0.9, 0.9, false);
    art.strokePath();
  }
  // Horseshoe.
  art.lineStyle(22, COLORS.repel, 1);
  art.beginPath();
  art.arc(-210, -110, 40, Math.PI / 2, Math.PI * 1.5, false);
  art.strokePath();
  art.fillStyle(0xd7dde6, 1);
  art.fillRect(-212, -161, 26, 22);
  art.fillRect(-212, -81, 26, 22);
  // Envelope being pulled.
  const env = scene.add.graphics();
  env.fillStyle(0xfff4dc, 1);
  env.fillRoundedRect(-34, -24, 68, 48, 6);
  env.lineStyle(4, COLORS.ink, 1);
  env.strokeRoundedRect(-34, -24, 68, 48, 6);
  env.lineStyle(3, COLORS.repel, 1);
  env.beginPath();
  env.moveTo(-30, -20);
  env.lineTo(0, 4);
  env.lineTo(30, -20);
  env.strokePath();
  env.setPosition(-60, -110);
  container.add([art, env]);
  const title = addText(scene, 0, 0, 'Magnet', { size: 100, weight: '700', color: '#2f7ff0', shadow: true });
  const title2 = addText(scene, 0, 92, 'Mail', { size: 100, weight: '700', color: '#ec4b4b', shadow: true });
  container.add([title, title2]);
  container.setScale(scale);
  if (!GameContext.reducedMotion) {
    scene.tweens.add({ targets: env, x: -100, angle: -8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return container;
}
