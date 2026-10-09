import type Phaser from 'phaser';

import { COLORS } from '../utils/Constants';

/** Elevator platform with cables up to its highest point and a guide shaft. */
export function drawElevator(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, topY: number, bottomY: number): void {
  // Shaft guides.
  g.fillStyle(0x24324a, 0.12);
  g.fillRect(x - w / 2 - 6, topY - 40, 6, bottomY - topY + 60);
  g.fillRect(x + w / 2, topY - 40, 6, bottomY - topY + 60);
  // Cables.
  g.lineStyle(2, 0x5c6370, 1);
  g.lineBetween(x - w / 3, topY - 40, x - w / 3, y - h / 2);
  g.lineBetween(x + w / 3, topY - 40, x + w / 3, y - h / 2);
  // Car floor with hazard stripes.
  g.fillStyle(0x4a5262, 1);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  for (let sx = x - w / 2 + 6; sx < x + w / 2 - 12; sx += 22) {
    g.fillStyle(COLORS.goal, 1);
    g.fillTriangle(sx, y + h / 2 - 3, sx + 10, y - h / 2 + 3, sx + 16, y - h / 2 + 3);
  }
  g.lineStyle(3, 0x24324a, 1);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
}
