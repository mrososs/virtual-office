import Phaser from 'phaser';

/**
 * First scene to run. There are no external assets (all art is generated
 * procedurally in PreloadScene), so it hands off immediately.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
