import type Phaser from 'phaser';

import type { WorldTheme } from '../levels/LevelDefinition';
import type { ObstacleDef } from '../levels/ObstacleDefinitions';
import { COLORS } from '../utils/Constants';

type Def<T extends ObstacleDef['type']> = Extract<ObstacleDef, { type: T }>;

/** Rotated rectangle outline points. */
function boxPoints(x: number, y: number, w: number, h: number, angle = 0): Phaser.Types.Math.Vector2Like[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ].map(([px, py]) => ({ x: x + px * c - py * s, y: y + px * s + py * c }));
}

/** Draws every non-moving obstacle once. Animated details are drawn by `drawAnimated` each frame. */
export function drawStaticObstacles(g: Phaser.GameObjects.Graphics, obstacles: readonly ObstacleDef[], theme: WorldTheme): void {
  for (const o of obstacles) {
    switch (o.type) {
      case 'wall':
        drawWall(g, o, theme);
        break;
      case 'bumper':
        g.fillStyle(0x000000, 0.12);
        g.fillCircle(o.x + 2, o.y + 5, o.r);
        g.fillStyle(0xff9f43, 1);
        g.fillCircle(o.x, o.y, o.r);
        g.fillStyle(0xffd08a, 1);
        g.fillCircle(o.x, o.y, o.r * 0.62);
        g.lineStyle(4, 0xc7621b, 1);
        g.strokeCircle(o.x, o.y, o.r);
        g.fillStyle(0xffffff, 0.6);
        g.fillCircle(o.x - o.r * 0.3, o.y - o.r * 0.35, o.r * 0.18);
        break;
      case 'spikes':
        drawSpikes(g, o);
        break;
      case 'conveyor':
        drawConveyorBody(g, o);
        break;
      case 'oneway': {
        g.fillStyle(COLORS.route, 0.5);
        g.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        g.lineStyle(3, COLORS.route, 1);
        g.strokeRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
        // Chevrons show the allowed direction.
        const len = Math.hypot(o.allowX, o.allowY) || 1;
        const ux = o.allowX / len;
        const uy = o.allowY / len;
        g.lineStyle(4, 0xffffff, 1);
        g.lineBetween(o.x - uy * 10 - ux * 6, o.y + ux * 10 - uy * 6, o.x + ux * 6, o.y + uy * 6);
        g.lineBetween(o.x + uy * 10 - ux * 6, o.y - ux * 10 - uy * 6, o.x + ux * 6, o.y + uy * 6);
        break;
      }
      case 'gravity':
        g.fillStyle(COLORS.special, 0.12);
        g.fillRoundedRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 20);
        g.lineStyle(3, COLORS.special, 0.5);
        g.strokeRoundedRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 20);
        break;
      default:
        break;
    }
  }
}

function drawWall(g: Phaser.GameObjects.Graphics, o: Def<'wall'>, theme: WorldTheme): void {
  const pts = boxPoints(o.x, o.y, o.w, o.h, o.angle);
  const style = o.style ?? 'wall';
  if (style === 'building') {
    g.fillStyle(theme.wall, 1);
    g.fillPoints(pts, true);
    g.lineStyle(3, theme.wallEdge, 1);
    g.strokePoints(pts, true, true);
    // Windows.
    g.fillStyle(theme.wallEdge, 0.35);
    const cols = Math.max(1, Math.floor((o.w - 20) / 44));
    const rows = Math.max(1, Math.floor((o.h - 30) / 56));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = o.x - o.w / 2 + 20 + c * ((o.w - 40) / Math.max(1, cols - 1 || 1));
        const wy = o.y - o.h / 2 + 24 + r * 56;
        if (wy + 26 > o.y + o.h / 2 - 8) continue;
        g.fillRoundedRect(wx - 11 + (cols === 1 ? o.w / 2 - 20 : 0), wy, 22, 26, 4);
      }
    }
    g.fillStyle(theme.wallEdge, 1);
    g.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, 6);
    return;
  }
  if (style === 'pipe') {
    g.fillStyle(0x8e9aab, 1);
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(o.x - o.w / 2 + 4, o.y - o.h / 2, Math.max(3, o.w * 0.2), o.h);
    g.lineStyle(3, 0x5c6778, 1);
    g.strokePoints(pts, true, true);
    return;
  }
  if (style === 'crate') {
    g.fillStyle(0xc9935a, 1);
    g.fillPoints(pts, true);
    g.lineStyle(3, 0x7a5228, 1);
    g.strokePoints(pts, true, true);
    for (let yy = o.y - o.h / 2 + 22; yy < o.y + o.h / 2; yy += 22) g.lineBetween(o.x - o.w / 2, yy, o.x + o.w / 2, yy);
    return;
  }
  g.fillStyle(theme.ground, 1);
  g.fillPoints(pts, true);
  g.fillStyle(0xffffff, 0.18);
  g.fillPoints(boxPoints(o.x, o.y - o.h / 2 + 4, o.w, 8, o.angle), true);
  g.lineStyle(3, darken(theme.ground), 1);
  g.strokePoints(pts, true, true);
}

function darken(color: number): number {
  const r = ((color >> 16) & 255) * 0.7;
  const g = ((color >> 8) & 255) * 0.7;
  const b = (color & 255) * 0.7;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function drawSpikes(g: Phaser.GameObjects.Graphics, o: Def<'spikes'>): void {
  const angle = o.angle ?? 0;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const toWorld = (px: number, py: number) => ({ x: o.x + px * c - py * s, y: o.y + px * s + py * c });
  // Base plate.
  g.fillStyle(0x5c6370, 1);
  // Local (0, h/4) in world space.
  g.fillPoints(boxPoints(o.x - o.h * 0.25 * s, o.y + o.h * 0.25 * c, o.w, o.h / 2, angle), true);
  // Teeth in danger orange with a dark outline.
  const count = Math.max(2, Math.round(o.w / 22));
  const tw = o.w / count;
  for (let i = 0; i < count; i++) {
    const x0 = -o.w / 2 + i * tw;
    const a = toWorld(x0, o.h / 2 - o.h * 0.5);
    const b = toWorld(x0 + tw, o.h / 2 - o.h * 0.5);
    const tip = toWorld(x0 + tw / 2, -o.h / 2 - 6);
    g.fillStyle(COLORS.danger, 1);
    g.fillTriangle(a.x, a.y, b.x, b.y, tip.x, tip.y);
    g.lineStyle(2, 0x7a3a0a, 1);
    g.strokeTriangle(a.x, a.y, b.x, b.y, tip.x, tip.y);
  }
}

function drawConveyorBody(g: Phaser.GameObjects.Graphics, o: Def<'conveyor'>): void {
  const h = o.h ?? 24;
  g.fillStyle(o.kind === 'luggage' ? 0x2f3a48 : 0x3b3f46, 1);
  g.fillRoundedRect(o.x - o.w / 2, o.y - h / 2, o.w, h, h / 2);
  g.fillStyle(0x9aa3ad, 1);
  g.fillCircle(o.x - o.w / 2 + h / 2, o.y, h * 0.32);
  g.fillCircle(o.x + o.w / 2 - h / 2, o.y, h * 0.32);
}

/** Per-frame details: conveyor chevrons, barrier shimmer, wind streaks, teleporter swirls. */
export function drawAnimated(g: Phaser.GameObjects.Graphics, obstacles: readonly ObstacleDef[], time: number): void {
  g.clear();
  for (const o of obstacles) {
    switch (o.type) {
      case 'conveyor': {
        const h = o.h ?? 24;
        const dir = Math.sign(o.speed) || 1;
        const spacing = 28;
        const offset = ((time * o.speed) % spacing + spacing) % spacing;
        g.lineStyle(3, o.kind === 'luggage' ? 0x18a7a0 : COLORS.goal, 0.9);
        for (let x = o.x - o.w / 2 + h * 0.8 + offset; x < o.x + o.w / 2 - h * 0.8; x += spacing) {
          g.lineBetween(x - dir * 5, o.y - h * 0.25, x + dir * 3, o.y);
          g.lineBetween(x + dir * 3, o.y, x - dir * 5, o.y + h * 0.25);
        }
        break;
      }
      case 'barrier': {
        const pts = boxPoints(o.x, o.y, o.w, o.h, o.angle);
        g.fillStyle(COLORS.special, 0.28 + 0.1 * Math.sin(time * 4));
        g.fillPoints(pts, true);
        g.lineStyle(3, COLORS.special, 0.9);
        g.strokePoints(pts, true, true);
        // Zig-zag "field blocked" lines.
        g.lineStyle(2, 0xffffff, 0.7);
        const step = 26;
        for (let yy = -o.h / 2 + ((time * 40) % step); yy < o.h / 2 - 6; yy += step) {
          g.lineBetween(o.x - o.w / 2 + 3, o.y + yy, o.x + o.w / 2 - 3, o.y + yy + 8);
        }
        break;
      }
      case 'wind': {
        g.fillStyle(0xffffff, 0.08);
        g.fillRoundedRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 18);
        const len = Math.hypot(o.fx, o.fy) || 1;
        const ux = o.fx / len;
        const uy = o.fy / len;
        g.lineStyle(3, 0xffffff, 0.55);
        for (let i = 0; i < 9; i++) {
          const px = o.x - o.w / 2 + ((i * 0.37 + 0.1) % 1) * o.w;
          const py = o.y - o.h / 2 + ((i * 0.61 + 0.2) % 1) * o.h;
          const phase = ((time * 1.4 + i / 9) % 1) - 0.5;
          const x = Math.min(o.x + o.w / 2 - 6, Math.max(o.x - o.w / 2 + 6, px + ux * phase * o.w));
          const y = Math.min(o.y + o.h / 2 - 6, Math.max(o.y - o.h / 2 + 6, py + uy * phase * o.h));
          g.lineBetween(x, y, x + ux * 26, y + uy * 26);
        }
        break;
      }
      case 'teleporter':
        for (const [x, y] of [
          [o.ax, o.ay],
          [o.bx, o.by],
        ]) {
          const r = o.r ?? 34;
          g.fillStyle(COLORS.special, 0.25);
          g.fillCircle(x, y, r);
          for (let k = 0; k < 3; k++) {
            g.lineStyle(3, k === 1 ? 0xffffff : COLORS.special, 0.9);
            g.beginPath();
            const a = time * 3 + (k * Math.PI * 2) / 3;
            g.arc(x, y, r * (0.45 + k * 0.2), a, a + Math.PI * 1.2, false);
            g.strokePath();
          }
        }
        break;
      case 'gravity': {
        // Downward chevrons drifting inside heavy-gravity zones.
        const dir = Math.sign(o.gy) || 1;
        g.lineStyle(3, COLORS.special, 0.55);
        for (let i = 0; i < 6; i++) {
          const px = o.x - o.w / 2 + 24 + ((i * 0.41) % 1) * (o.w - 48);
          const py = o.y - o.h / 2 + ((((time * 0.6 + i / 6) % 1) + 1) % 1) * o.h;
          g.lineBetween(px - 10, py - dir * 8, px, py);
          g.lineBetween(px, py, px + 10, py - dir * 8);
        }
        break;
      }
      default:
        break;
    }
  }
}
