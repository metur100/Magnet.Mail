import { ensureFxTextures } from '../rendering/Textures';
import { BaseScene } from './BaseScene';

/** First scene: prepares the textures the loading screen needs. */
export class BootScene extends BaseScene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.setupScene();
    ensureFxTextures(this);
    this.scene.start('Loading');
  }
}
