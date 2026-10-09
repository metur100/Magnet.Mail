import type Phaser from 'phaser';

/** Procedural effect textures (no image files). */
export const FX = {
  soft: 'fx-soft',
  spark: 'fx-spark',
  ring: 'fx-ring',
  dot: 'fx-dot',
  square: 'fx-square',
} as const;

export const css = (color: number, alpha = 1) => `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alpha})`;

export function createCanvas(scene: Phaser.Scene, key: string, width: number, height: number): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
  if (!tex) throw new Error(`Could not create canvas texture ${key}`);
  return tex;
}

export function ensureFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(FX.soft)) return;
  const size = 64;
  const c = size / 2;
  let tex = createCanvas(scene, FX.soft, size, size);
  let ctx = tex.getContext();
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();

  tex = createCanvas(scene, FX.spark, size, size);
  ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? c * 0.95 : c * 0.2;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  tex.refresh();

  tex = createCanvas(scene, FX.ring, size, size);
  ctx = tex.getContext();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, c - 4, 0, Math.PI * 2);
  ctx.stroke();
  tex.refresh();

  tex = createCanvas(scene, FX.dot, 16, 16);
  ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(8, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();

  tex = createCanvas(scene, FX.square, 16, 10);
  ctx = tex.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 16, 10);
  tex.refresh();
}
