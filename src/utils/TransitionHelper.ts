import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { AudioManager } from '../systems/AudioManager';
import { LevelGenerator } from '../systems/LevelGenerator';
import { SaveManager } from '../systems/SaveManager';

export type TransitionStyle = 'fade' | 'curtain' | 'bat-swarm' | 'blood-splash';

/**
 * TransitionHelper provides themed gothic scene transitions with matching
 * whoosh/audio cues between Menu, World Map, Level Select, Shop, Intro, and Gameplay.
 */
export class TransitionHelper {
  private static busy = false;

  static launchStageWithIntroCheck(scene: Phaser.Scene, levelId: number): void {
    const safeLevel = Math.max(1, Math.floor(levelId));
    const bp = LevelGenerator.getLevel(safeLevel);
    const save = SaveManager.getInstance();
    const unseen = bp.vampires.find((v) => !save.hasSeenVampireIntro(v));

    if (unseen) {
      this.transitionTo(scene, 'VampireIntroScene', { levelId: safeLevel, vampireId: unseen }, 'curtain', 260);
    } else {
      this.transitionTo(scene, 'GameScene', { levelId: safeLevel }, 'bat-swarm', 280);
    }
  }

  static transitionTo(
    scene: Phaser.Scene,
    targetKey: string,
    data?: Record<string, unknown>,
    style: TransitionStyle = 'fade',
    durationMs = 280
  ): void {
    if (this.busy) return;
    this.busy = true;
    AudioManager.getInstance().playTransitionWhoosh();

    const W = GameConfig.WORLD_WIDTH;
    const H = GameConfig.WORLD_HEIGHT;
    const gfx = scene.add.graphics().setDepth(999).setScrollFactor(0);
    const proxy = { t: 0 };

    const cleanupAndSwitch = () => {
      gfx.destroy();
      this.busy = false;
      scene.scene.start(targetKey, data);
    };

    scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: durationMs,
      ease: 'Cubic.easeInOut',
      onUpdate: () => {
        gfx.clear();
        const p = proxy.t;
        if (style === 'fade') {
          gfx.fillStyle(0x05070c, p);
          gfx.fillRect(0, 0, W, H);
        } else if (style === 'curtain') {
          const half = (W / 2) * p;
          gfx.fillStyle(0x090b10, 1);
          gfx.fillRect(0, 0, half + 4, H);
          gfx.fillRect(W - half - 4, 0, half + 4, H);
          gfx.lineStyle(4, 0x991b1b, 0.9);
          gfx.lineBetween(half, 0, half, H);
          gfx.lineBetween(W - half, 0, W - half, H);
        } else if (style === 'bat-swarm') {
          gfx.fillStyle(0x05070c, p * 0.96);
          gfx.fillRect(0, 0, W, H);
          const count = 18;
          gfx.fillStyle(0x1e1b4b, 0.95);
          for (let i = 0; i < count; i++) {
            const bx = W * (1.1 - p * 1.4) + (i % 5) * 140;
            const by = 90 + ((i * 113) % (H - 180));
            const s = 18 + (i % 3) * 8;
            gfx.fillTriangle(bx - s, by - s * 0.35, bx, by + s * 0.3, bx + s, by - s * 0.35);
          }
        } else if (style === 'blood-splash') {
          gfx.fillStyle(0x450a0a, p * 0.95);
          gfx.fillRect(0, 0, W, H * p);
          gfx.fillStyle(0x991b1b, 0.95);
          for (let i = 0; i < 8; i++) {
            const cx = 100 + i * 200;
            const r = 120 + (i % 3) * 50;
            gfx.fillCircle(cx, H * p, r * p);
          }
        }
      },
      onComplete: cleanupAndSwitch,
    });
  }
}
