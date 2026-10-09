import type Phaser from 'phaser';

import type { WorldDefinition } from '../levels/LevelDefinition';
import { Rng } from '../utils/MathUtils';
import { createCanvas, css } from './Textures';

/**
 * Paints a world's backdrop (sky gradient + soft, low-contrast scenery) into a canvas texture so the
 * course in front of it always reads clearly.
 */
export function sceneryTexture(scene: Phaser.Scene, world: WorldDefinition, width: number, height: number, scale: number): string {
  const key = `bg-${world.key}-${width}x${height}@${scale}`;
  if (scene.textures.exists(key)) return key;
  const tex = createCanvas(scene, key, width * scale, height * scale);
  const ctx = tex.getContext();
  ctx.scale(scale, scale);
  paintScenery(ctx, world, width, height);
  tex.refresh();
  return key;
}

export function paintScenery(ctx: CanvasRenderingContext2D, world: WorldDefinition, w: number, h: number): void {
  const t = world.theme;
  const rng = new Rng(world.id * 131 + 7);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, css(t.skyTop));
  sky.addColorStop(1, css(t.skyBottom));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const horizon = h * 0.72;

  const skyline = (base: number, color: number, alpha: number, minH: number, maxH: number, minW: number, maxW: number, windows = false) => {
    let x = -20;
    while (x < w + 20) {
      const bw = rng.range(minW, maxW);
      const bh = rng.range(minH, maxH);
      ctx.fillStyle = css(color, alpha);
      ctx.fillRect(x, base - bh, bw, bh + h);
      if (windows) {
        ctx.fillStyle = css(0xffffff, alpha * 0.35);
        for (let wy = base - bh + 14; wy < base - 12; wy += 22) for (let wx = x + 8; wx < x + bw - 12; wx += 18) ctx.fillRect(wx, wy, 8, 10);
      }
      x += bw + rng.range(4, 18);
    }
  };
  const hills = (base: number, amp: number, color: number, alpha: number) => {
    ctx.fillStyle = css(color, alpha);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, base + Math.sin(x * 0.012 + world.id) * amp + Math.sin(x * 0.031) * amp * 0.4);
    ctx.lineTo(w, h);
    ctx.fill();
  };
  const cloud = (x: number, y: number, s: number, alpha: number) => {
    ctx.fillStyle = css(0xffffff, alpha);
    for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 32], [58, 0, 24], [30, 8, 26]]) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  switch (world.scenery) {
    case 'neighborhood': {
      for (let i = 0; i < 4; i++) cloud(rng.range(0, w), rng.range(60, h * 0.35), rng.range(0.8, 1.4), 0.8);
      hills(horizon - 30, 20, t.far, 0.8);
      for (let i = 0; i < 6; i++) {
        const x = rng.range(0, w);
        const y = horizon - 10;
        ctx.fillStyle = css(rng.pick([0xf6d6a8, 0xf3b9a0, 0xc9dff2]), 0.85);
        ctx.fillRect(x - 30, y - 50, 60, 50);
        ctx.fillStyle = css(0xc95c4a, 0.85);
        ctx.beginPath();
        ctx.moveTo(x - 38, y - 50);
        ctx.lineTo(x, y - 82);
        ctx.lineTo(x + 38, y - 50);
        ctx.fill();
      }
      hills(horizon + 10, 14, t.near, 0.9);
      break;
    }
    case 'city':
      for (let i = 0; i < 3; i++) cloud(rng.range(0, w), rng.range(60, h * 0.3), 1, 0.6);
      skyline(horizon - 20, t.far, 0.75, 120, 330, 50, 110, true);
      skyline(horizon + 30, t.near, 0.8, 60, 220, 60, 130, true);
      break;
    case 'railway':
      hills(horizon - 50, 30, t.far, 0.7);
      // Distant viaduct.
      ctx.fillStyle = css(t.near, 0.6);
      ctx.fillRect(0, horizon - 120, w, 14);
      for (let x = 20; x < w; x += 90) {
        ctx.beginPath();
        ctx.arc(x + 45, horizon - 30, 34, Math.PI, 0);
        ctx.lineTo(x + 90, horizon + 40);
        ctx.lineTo(x, horizon + 40);
        ctx.fill();
        ctx.fillRect(x, horizon - 108, 12, 80);
      }
      hills(horizon + 40, 12, t.near, 0.85);
      break;
    case 'industrial':
      skyline(horizon - 10, t.far, 0.7, 80, 200, 70, 140);
      for (let i = 0; i < 5; i++) {
        const x = rng.range(20, w - 20);
        ctx.fillStyle = css(t.near, 0.8);
        ctx.fillRect(x, horizon - 260, 22, 260);
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = css(0xffffff, 0.35 - k * 0.07);
          ctx.beginPath();
          ctx.arc(x + 11 + k * 14, horizon - 280 - k * 26, 16 + k * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      skyline(horizon + 40, t.near, 0.85, 50, 140, 90, 170);
      break;
    case 'airport': {
      for (let i = 0; i < 5; i++) cloud(rng.range(0, w), rng.range(40, h * 0.45), rng.range(0.8, 1.6), 0.75);
      // Plane silhouette.
      ctx.fillStyle = css(0xffffff, 0.8);
      ctx.save();
      ctx.translate(w * 0.7, h * 0.18);
      ctx.rotate(-0.12);
      ctx.fillRect(-60, -6, 120, 12);
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(20, -40);
      ctx.lineTo(30, 0);
      ctx.moveTo(-10, 0);
      ctx.lineTo(20, 40);
      ctx.lineTo(30, 0);
      ctx.fill();
      ctx.restore();
      // Control tower.
      ctx.fillStyle = css(t.near, 0.8);
      ctx.fillRect(w * 0.15, horizon - 240, 30, 240);
      ctx.fillRect(w * 0.15 - 24, horizon - 280, 78, 46);
      ctx.fillStyle = css(0xffffff, 0.6);
      ctx.fillRect(w * 0.15 - 18, horizon - 272, 66, 22);
      skyline(horizon + 40, t.far, 0.7, 40, 90, 120, 220);
      break;
    }
    case 'space': {
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = css(0xffffff, rng.range(0.2, 0.9));
        ctx.beginPath();
        ctx.arc(rng.range(0, w), rng.range(0, h), rng.range(0.6, 2), 0, Math.PI * 2);
        ctx.fill();
      }
      const planet = ctx.createRadialGradient(w * 0.78, h * 0.2, 10, w * 0.78, h * 0.2, 110);
      planet.addColorStop(0, css(0xc58bff, 0.9));
      planet.addColorStop(1, css(0x5a3fb0, 0.9));
      ctx.fillStyle = planet;
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.2, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css(0xffffff, 0.35);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(w * 0.78, h * 0.2, 140, 26, -0.3, 0, Math.PI * 2);
      ctx.stroke();
      // Station ring.
      ctx.strokeStyle = css(t.far, 0.8);
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(w * 0.2, h * 0.42, 120, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}
