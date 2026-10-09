import type Phaser from 'phaser';

import { COLORS } from '../utils/Constants';

/** Draws a train (or a car) centred at (x, y) driving in direction `dir` (+1 right, −1 left). */
export function drawVehicle(g: Phaser.GameObjects.Graphics, kind: 'train' | 'car', x: number, y: number, w: number, h: number, dir: number, time: number): void {
  if (kind === 'car') {
    const body = 0x2f7ff0;
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(x, y + h / 2 + 2, w * 0.9, 10);
    g.fillStyle(body, 1);
    g.fillRoundedRect(x - w / 2, y - h * 0.15, w, h * 0.55, 10);
    g.fillRoundedRect(x - w * 0.3, y - h / 2, w * 0.6, h * 0.45, 10);
    g.fillStyle(0xcfe8ff, 1);
    g.fillRoundedRect(x - w * 0.24, y - h / 2 + 5, w * 0.2, h * 0.3, 4);
    g.fillRoundedRect(x + w * 0.04, y - h / 2 + 5, w * 0.2, h * 0.3, 4);
    // Headlight glow at the front (danger colour).
    g.fillStyle(COLORS.goal, 1);
    g.fillCircle(x + (dir * w) / 2 - dir * 6, y + 2, 5);
    g.fillStyle(0x24324a, 1);
    for (const wx of [x - w * 0.3, x + w * 0.3]) {
      g.fillCircle(wx, y + h * 0.4, 11);
      g.fillStyle(0xb8c0cc, 1);
      g.fillCircle(wx, y + h * 0.4, 4);
      g.fillStyle(0x24324a, 1);
    }
    return;
  }
  // Train: locomotive + carriage with windows and rolling wheels.
  g.fillStyle(0x000000, 0.18);
  g.fillRect(x - w / 2, y + h / 2 - 2, w, 6);
  g.fillStyle(0xd94b3b, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h * 0.82, 10);
  g.fillStyle(0xffffff, 0.9);
  g.fillRect(x - w / 2, y - h / 2 + h * 0.5, w, 6);
  g.fillStyle(0xcfe8ff, 1);
  const windows = Math.floor((w - 40) / 46);
  for (let i = 0; i < windows; i++) g.fillRoundedRect(x - w / 2 + 22 + i * 46, y - h / 2 + 8, 30, h * 0.3, 4);
  // Nose with danger stripes.
  const nose = x + (dir * w) / 2;
  g.fillStyle(COLORS.danger, 1);
  g.fillTriangle(nose, y - h / 2 + 4, nose, y + h * 0.3, nose + dir * 18, y + h * 0.3);
  g.fillStyle(COLORS.goal, 1);
  g.fillCircle(nose - dir * 10, y + h * 0.1, 5);
  g.fillStyle(0x24324a, 1);
  const spin = time * 12;
  for (let wx = x - w / 2 + 26; wx < x + w / 2 - 10; wx += 52) {
    g.fillCircle(wx, y + h * 0.36, 10);
    g.lineStyle(2, 0xb8c0cc, 1);
    g.lineBetween(wx, y + h * 0.36, wx + Math.cos(spin) * 8, y + h * 0.36 + Math.sin(spin) * 8);
  }
}

/** Rails under a train track. */
export function drawRails(g: Phaser.GameObjects.Graphics, y: number, width: number): void {
  g.fillStyle(0x6b5a4a, 1);
  for (let x = 10; x < width; x += 34) g.fillRect(x, y - 4, 16, 8);
  g.fillStyle(0x9aa3ad, 1);
  g.fillRect(0, y - 6, width, 4);
}
