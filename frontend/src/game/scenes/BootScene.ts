import Phaser from 'phaser';

/**
 * First scene to run. Hands off immediately: PreloadScene loads the company
 * logo and generates all procedural art.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
