import type Phaser from 'phaser';

import type { Collider } from '../physics/PhysicsWorld';
import { COLORS } from '../utils/Constants';
import { drawElevator } from './Elevator';
import { drawVehicle } from './Train';

/** Draws every moving obstacle at its current pose (platforms, gates, doors, rotors, floaters, trains). */
export function drawMovingObstacles(g: Phaser.GameObjects.Graphics, colliders: readonly Collider[], time: number): void {
  g.clear();
  for (const c of colliders) {
    const o = c.def;
    if (!o) continue;
    switch (o.type) {
      case 'platform': {
        const w = c.hw * 2;
        const h = c.hh * 2;
        if (o.kind === 'elevator') {
          drawElevator(g, c.cx, c.cy, w, h, Math.min(o.y, o.y + o.dy), Math.max(o.y, o.y + o.dy));
        } else if (o.kind === 'gate' || o.kind === 'door') {
          // Railway gate / timed door: striped barrier sliding on its track.
          g.fillStyle(0x24324a, 0.1);
          g.fillRect(o.x - 4, Math.min(o.y, o.y + o.dy) - c.hh, 8, Math.abs(o.dy) + h);
          g.fillStyle(0xffffff, 1);
          g.fillRoundedRect(c.cx - w / 2, c.cy - h / 2, w, h, 6);
          g.fillStyle(o.kind === 'gate' ? COLORS.repel : COLORS.danger, 1);
          for (let y = c.cy - h / 2 + 4; y < c.cy + h / 2 - 8; y += 28) g.fillRect(c.cx - w / 2, y, w, 14);
          g.lineStyle(3, 0x24324a, 1);
          g.strokeRoundedRect(c.cx - w / 2, c.cy - h / 2, w, h, 6);
        } else {
          g.fillStyle(o.kind === 'cart' ? 0x18a7a0 : 0x4f8fd8, 1);
          g.fillRoundedRect(c.cx - w / 2, c.cy - h / 2, w, h, 8);
          g.lineStyle(3, 0x24324a, 1);
          g.strokeRoundedRect(c.cx - w / 2, c.cy - h / 2, w, h, 8);
          g.fillStyle(0xffffff, 0.35);
          g.fillRect(c.cx - w / 2 + 6, c.cy - h / 2 + 3, w - 12, 4);
        }
        break;
      }
      case 'rotor': {
        // Hub plus a toothed bar.
        g.lineStyle(c.r * 2 + 4, 0x24324a, 1);
        g.lineBetween(c.ax, c.ay, c.bx, c.by);
        g.lineStyle(c.r * 2, 0x9aa3ad, 1);
        g.lineBetween(c.ax, c.ay, c.bx, c.by);
        g.fillStyle(COLORS.danger, 1);
        g.fillCircle(c.ax, c.ay, c.r);
        g.fillCircle(c.bx, c.by, c.r);
        g.fillStyle(0x24324a, 1);
        g.fillCircle(c.cx, c.cy, c.r + 6);
        g.fillStyle(0xd7dde6, 1);
        g.fillCircle(c.cx, c.cy, c.r * 0.5);
        break;
      }
      case 'floater': {
        g.fillStyle(0x000000, 0.18);
        g.fillCircle(c.cx + 3, c.cy + 5, c.r);
        g.fillStyle(0x8a8fb3, 1);
        g.fillCircle(c.cx, c.cy, c.r);
        g.fillStyle(0x6b7099, 1);
        g.fillCircle(c.cx - c.r * 0.3, c.cy + c.r * 0.2, c.r * 0.28);
        g.fillCircle(c.cx + c.r * 0.35, c.cy - c.r * 0.3, c.r * 0.18);
        g.lineStyle(3, 0x3c4170, 1);
        g.strokeCircle(c.cx, c.cy, c.r);
        break;
      }
      case 'train':
        if (c.active) drawVehicle(g, o.kind ?? 'train', c.cx, c.cy, c.hw * 2, c.hh * 2, Math.sign(o.to - o.from) || 1, time);
        break;
      default:
        break;
    }
  }
}
