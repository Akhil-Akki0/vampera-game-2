import Phaser from 'phaser';
import { AdManager } from '../systems/AdManager';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { SaveManager } from '../systems/SaveManager';
import { TextureGenerator } from '../utils/TextureGenerator';

/**
 * BootScene initializes save persistence, audio, ad hooks, mobile DeviceScaler,
 * routes normal app start through LoadingVideoScene, and supports ?autostart=1 deep-links.
 */
export class BootScene extends Phaser.Scene {
  private static lifecycleBound = false;

  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const save = SaveManager.getInstance();
    const scaler = DeviceScaler.getInstance();
    scaler.detectInitialQuality();

    const audio = AudioManager.getInstance(save.getSettings());
    audio.updateSettings(save.getSettings());
    AdManager.getInstance().init();

    if (!BootScene.lifecycleBound && typeof window !== 'undefined') {
      BootScene.lifecycleBound = true;
      scaler.bindGlobalMobileGuards(
        () => {
          this.game.events.emit('app:background');
        },
        () => {
          this.game.events.emit('app:foreground');
        }
      );
    }

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';
    const levelParam = Number(params.get('level'));

    if (autostart) {
      TextureGenerator.generateAll(this);
      const targetLevel = Number.isFinite(levelParam) && levelParam >= 1 ? Math.floor(levelParam) : 1;
      save.acceptConsent();
      save.updateSettings({ tutorialSeen: true });
      this.scene.start('GameScene', { levelId: targetLevel });
      return;
    }

    this.scene.start('LoadingVideoScene');
  }
}
