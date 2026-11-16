import Phaser from 'phaser';
import './index.css';
import { GameConfig } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { CodexScene } from './scenes/CodexScene';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { LoadingVideoScene } from './scenes/LoadingVideoScene';
import { MenuScene } from './scenes/MenuScene';
import { ShopScene } from './scenes/ShopScene';
import { UIScene } from './scenes/UIScene';
import { VampireIntroScene } from './scenes/VampireIntroScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { DeviceScaler } from './systems/DeviceScaler';

const dpr = DeviceScaler.getInstance().getRecommendedDpr();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-mount',
  width: GameConfig.WORLD_WIDTH,
  height: GameConfig.WORLD_HEIGHT,
  backgroundColor: '#07090e',
  render: {
    antialias: true,
    roundPixels: false,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 1,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: GameConfig.GRAVITY_Y },
      enableSleeping: false,
      positionIterations: 8,
      velocityIterations: 6,
    },
  },
  scene: [
    BootScene,
    LoadingVideoScene,
    MenuScene,
    WorldMapScene,
    LevelSelectScene,
    ShopScene,
    CodexScene,
    VampireIntroScene,
    GameScene,
    UIScene,
  ],
};

// Apply DPR attribute cleanly for responsive high-DPI canvas scaling
if (typeof document !== 'undefined') {
  document.documentElement.dataset.dpr = String(dpr);
}

const game = new Phaser.Game(config);

// Expose read-only test handle for automated browser verification
(window as unknown as { __BLOODLINE_GAME__?: Phaser.Game }).__BLOODLINE_GAME__ = game;
