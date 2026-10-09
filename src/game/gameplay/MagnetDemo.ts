import type Phaser from 'phaser';

import { Magnet } from '../entities/Magnet';
import { drawParcel } from '../entities/Parcel';
import { GameContext } from '../GameContext';
import { getParcelSkin } from '../progression/Cosmetics';

/**
 * Decorative animation for the loading and menu screens: a parcel swinging between a blue and a red
 * magnet with live field lines. Purely visual.
 */
export class MagnetDemo {
  private readonly left: Magnet;
  private readonly right: Magnet;
  private readonly parcel: Phaser.GameObjects.Graphics;
  private time = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly cx: number,
    private readonly cy: number,
    private readonly span: number,
  ) {
    const layer = scene.add.container(0, 0);
    const fields = scene.add.container(0, 0);
    const bodies = scene.add.container(0, 0);
    layer.add([fields, bodies]);
    this.left = new Magnet(scene, fields, bodies, { x: cx - span, y: cy }, 'attract');
    this.right = new Magnet(scene, fields, bodies, { x: cx + span, y: cy }, 'repel');
    this.parcel = scene.add.graphics();
    drawParcel(this.parcel, 'box', getParcelSkin(GameContext.save?.selectedParcel ?? 'classic-envelope'), 26);
    layer.add(this.parcel);
  }

  update(deltaMs: number): void {
    const reduced = GameContext.reducedMotion;
    const dt = deltaMs / 1000;
    this.time += reduced ? dt * 0.25 : dt;
    const phase = Math.sin(this.time * 1.6);
    const x = this.cx + phase * this.span * 0.55;
    const y = this.cy + Math.cos(this.time * 3.2) * 18 - 40;
    this.parcel.setPosition(x, y);
    this.parcel.setRotation(phase * 0.3);
    const towardsLeft = Math.cos(this.time * 1.6) < 0;
    this.left.update(dt, towardsLeft ? 1 : 0, x, y, false, reduced);
    this.right.update(dt, towardsLeft ? 0 : 1, x, y, false, reduced);
  }
}
