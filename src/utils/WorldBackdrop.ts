import Phaser from 'phaser';
import { GameConfig, GraphicsQuality } from '../config/GameConfig';
import { getWorldAssets, ASSET_MANIFEST } from '../data/AssetManifest';
import { WorldTheme } from '../data/WorldConfig';
import { SkyCycleSystem } from '../systems/SkyCycleSystem';
import { WeatherSystem } from '../systems/WeatherSystem';

/**
 * WorldBackdrop coordinates the living background across 5+ parallax layers:
 * 1. SkyCycleSystem (day/night sky gradient, sun/moon glow, stars, scrolling clouds)
 * 2. Far Mountains / Moonlit Spires (scrollFactor 0.12)
 * 3. Mid-Far Gothic Landmarks / Castles / Pyramids + Light Shafts (scrollFactor 0.24)
 * 4. Mid Rolling Hills & Ruins (scrollFactor 0.42)
 * 5. Near Tombstones / Pillars / Props (scrollFactor 0.65)
 * 6. Foreground Ground + Ambient Bats + WeatherSystem (scrollFactor 1.0)
 * Automatically uses optional sprite layers from /assets/images/worlds/ if present.
 */
export class WorldBackdrop {
  private skyCycle: SkyCycleSystem;
  private weather: WeatherSystem;
  private mountainGfx: Phaser.GameObjects.Graphics;
  private farGfx: Phaser.GameObjects.Graphics;
  private shaftGfx: Phaser.GameObjects.Graphics;
  private midGfx: Phaser.GameObjects.Graphics;
  private nearGfx: Phaser.GameObjects.Graphics;
  private groundGfx: Phaser.GameObjects.Graphics;
  private optionalLayerImages: Phaser.GameObjects.Image[] = [];
  private bats: Phaser.GameObjects.Image[] = [];
  private world: WorldTheme;

  constructor(scene: Phaser.Scene, world: WorldTheme, quality: GraphicsQuality) {
    this.world = world;
    this.skyCycle = new SkyCycleSystem(scene, world, quality);
    this.weather = new WeatherSystem(scene, world, quality);

    this.mountainGfx = scene.add.graphics().setDepth(1.9).setScrollFactor(0.12);
    this.farGfx = scene.add.graphics().setDepth(2.5).setScrollFactor(0.24);
    this.shaftGfx = scene.add.graphics().setDepth(2.9).setScrollFactor(0.32);
    this.midGfx = scene.add.graphics().setDepth(3.4).setScrollFactor(0.42);
    this.nearGfx = scene.add.graphics().setDepth(3.9).setScrollFactor(0.65);
    this.groundGfx = scene.add.graphics().setDepth(5).setScrollFactor(1);

    this.drawParallaxTerrain(quality);
    this.initOptionalSpriteLayers(scene);
    this.initAmbientBats(scene, quality);
    void this.lazyProbeWorldImages(scene);
  }

  private async lazyProbeWorldImages(scene: Phaser.Scene): Promise<void> {
    const entries = getWorldAssets(this.world.id);
    const loaded: Array<{ key: string; path: string }> = [];
    for (const entry of entries) {
      if (scene.textures.exists(entry.key)) continue;
      try {
        const res = await fetch(entry.path, { method: 'HEAD' });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.startsWith('image/')) {
          loaded.push({ key: entry.key, path: entry.path });
        }
      } catch {
        // Procedural parallax layers already active
      }
    }
    if (loaded.length === 0 || !scene.scene.isActive()) return;
    for (const item of loaded) {
      scene.load.image(item.key, item.path);
    }
    scene.load.once('complete', () => {
      if (scene.scene.isActive()) this.initOptionalSpriteLayers(scene);
    });
    scene.load.start();
  }

  private initOptionalSpriteLayers(scene: Phaser.Scene): void {
    const farKey = `world_${this.world.id}_far`;
    const midKey = `world_${this.world.id}_mid`;
    if (scene.textures.exists(farKey) && !this.optionalLayerImages.some((i) => i.texture.key === farKey)) {
      const img = scene.add
        .image(GameConfig.WORLD_WIDTH / 2, GameConfig.WORLD_HEIGHT / 2, farKey)
        .setDepth(2.6)
        .setScrollFactor(0.22);
      this.optionalLayerImages.push(img);
    }
    if (scene.textures.exists(midKey) && !this.optionalLayerImages.some((i) => i.texture.key === midKey)) {
      const img = scene.add
        .image(GameConfig.WORLD_WIDTH / 2, GameConfig.WORLD_HEIGHT / 2, midKey)
        .setDepth(3.5)
        .setScrollFactor(0.45);
      this.optionalLayerImages.push(img);
    }
    void ASSET_MANIFEST;
  }

  private drawParallaxTerrain(quality: GraphicsQuality): void {
    const W = GameConfig.WORLD_WIDTH;
    const H = GameConfig.WORLD_HEIGHT;
    const G = GameConfig.GROUND_Y;
    const w = this.world;

    // Layer 2: Distant Ridge / Mountain Peaks (scrollFactor 0.12)
    this.mountainGfx.clear();
    this.mountainGfx.fillStyle(w.hillBackColor, 0.72);
    this.mountainGfx.beginPath();
    this.mountainGfx.moveTo(-450, G);
    for (let x = -450; x <= W + 900; x += 170) {
      const peakY = 470 + (Math.abs(x * 37) % 110);
      this.mountainGfx.lineTo(x + 85, peakY);
      this.mountainGfx.lineTo(x + 170, 590);
    }
    this.mountainGfx.lineTo(W + 900, H + 120);
    this.mountainGfx.lineTo(-450, H + 120);
    this.mountainGfx.closePath();
    this.mountainGfx.fillPath();

    // Layer 3: Mid-Far Iconic Landmarks (scrollFactor 0.24)
    this.farGfx.clear();
    this.farGfx.fillStyle(w.hillBackColor, 1);
    if (w.id === 1 || w.id === 8) {
      this.farGfx.fillRect(880, 460, 80, G - 460);
      this.farGfx.fillTriangle(875, 460, 920, 380, 965, 460);
      this.farGfx.fillRect(960, 410, 90, G - 410);
      this.farGfx.fillTriangle(955, 410, 1005, 315, 1055, 410);
      this.farGfx.fillRect(1050, 490, 75, G - 490);
      this.farGfx.fillStyle(0xf59e0b, 0.25);
      this.farGfx.fillCircle(1003, 453, 28);
      this.farGfx.fillStyle(0xf59e0b, 0.85);
      this.farGfx.fillRect(995, 440, 16, 26);
      this.farGfx.fillRect(910, 500, 12, 20);
    } else if (w.id === 2 || w.id === 6) {
      for (let x = 180; x < 1850; x += 220) {
        this.farGfx.fillRect(x, 490, 26, G - 490);
        this.farGfx.fillTriangle(x - 45, 510, x + 13, 410, x + 70, 510);
      }
    } else if (w.id === 3) {
      for (let x = 220; x < 1800; x += 310) {
        this.farGfx.fillRect(x, 120, 36, G - 120);
        this.farGfx.fillStyle(0xfbbf24, 0.24);
        this.farGfx.fillCircle(x + 150, 140, 28);
        this.farGfx.fillStyle(0xfbbf24, 0.85);
        this.farGfx.fillCircle(x + 150, 140, 9);
        this.farGfx.fillStyle(w.hillBackColor, 1);
      }
    } else if (w.id === 5) {
      this.farGfx.fillTriangle(420, G, 620, 430, 820, G);
      this.farGfx.fillTriangle(960, G, 1180, 390, 1400, G);
    } else if (w.id === 7) {
      this.farGfx.fillTriangle(680, G, 950, 360, 1220, G);
      this.farGfx.fillStyle(0xf97316, 0.3);
      this.farGfx.fillCircle(950, 365, 52);
      this.farGfx.fillStyle(0xf97316, 0.8);
      this.farGfx.fillTriangle(925, 395, 950, 360, 975, 395);
    } else if (w.id === 9) {
      for (let x = 350; x < 1650; x += 390) {
        this.farGfx.fillRect(x, 340, 160, 28);
        this.farGfx.fillTriangle(x + 10, 368, x + 80, 440, x + 150, 368);
      }
    } else {
      for (let x = 260; x < 1750; x += 260) {
        this.farGfx.fillTriangle(x, G, x + 55, 420 + (x % 90), x + 110, G);
      }
    }

    // Diagonal Moonlight / Atmospheric Light Shafts (High & Ultra presets)
    this.shaftGfx.clear();
    if (quality === 'high' || quality === 'ultra') {
      const shaftAlpha = quality === 'ultra' ? 0.065 : 0.04;
      this.shaftGfx.fillStyle(w.moonColor, shaftAlpha);
      for (let sx = 240; sx <= 1450; sx += 410) {
        this.shaftGfx.fillTriangle(sx, 0, sx + 140, 0, sx + 380, G);
        this.shaftGfx.fillTriangle(sx, 0, sx + 220, G, sx + 380, G);
      }
    }

    // Layer 4: Rolling Hills (scrollFactor 0.42)
    this.midGfx.clear();
    this.midGfx.fillStyle(w.hillFrontColor, 1);
    this.midGfx.beginPath();
    this.midGfx.moveTo(-450, G);
    for (let x = -450; x <= W + 900; x += 80) {
      this.midGfx.lineTo(x, 690 + Math.sin(x * 0.005) * 42);
    }
    this.midGfx.lineTo(W + 900, H + 120);
    this.midGfx.lineTo(-450, H + 120);
    this.midGfx.closePath();
    this.midGfx.fillPath();

    // Layer 5: Near Silhouettes (Tombstones / Iron Fence / Pillars, scrollFactor 0.65)
    this.nearGfx.clear();
    if (w.id === 1 || w.id === 8 || w.id === 10) {
      this.nearGfx.fillStyle(0x22293a, 0.85);
      for (let x = 90; x < 2100; x += 155) {
        this.nearGfx.fillRoundedRect(x, G - 56, 28, 56, { tl: 14, tr: 14, bl: 0, br: 0 });
        if (x % 2 === 0) {
          this.nearGfx.fillRect(x + 11, G - 48, 6, 20);
          this.nearGfx.fillRect(x + 6, G - 42, 16, 5);
        }
      }
    } else {
      this.nearGfx.fillStyle(w.hillBackColor, 0.7);
      for (let x = 110; x < 2100; x += 210) {
        this.nearGfx.fillRect(x, G - 42, 14, 42);
      }
    }

    // Layer 6: Foreground Ground Layer (scrollFactor 1.0)
    this.groundGfx.clear();
    this.groundGfx.fillStyle(w.groundColor, 1);
    this.groundGfx.fillRect(-400, G, 3000, H - G + 200);
    this.groundGfx.fillStyle(w.groundTopColor, 1);
    this.groundGfx.fillRect(-400, G, 3000, 16);
    this.groundGfx.lineStyle(3, 0x07090e, 1);
    this.groundGfx.lineBetween(-400, G, 2600, G);
  }

  private initAmbientBats(scene: Phaser.Scene, quality: GraphicsQuality): void {
    const batCount = quality === 'low' ? 2 : quality === 'medium' ? 5 : quality === 'high' ? 8 : 12;
    for (let i = 0; i < batCount; i++) {
      const bat = scene.add
        .image(Math.random() * 1900, 75 + Math.random() * 240, 'sky_bat')
        .setDepth(4)
        .setScrollFactor(0.25)
        .setScale(0.6 + Math.random() * 0.6);
      bat.setData('speed', 35 + Math.random() * 45);
      bat.setData('phase', Math.random() * Math.PI * 2);
      this.bats.push(bat);
    }
  }

  update(dt: number): void {
    this.skyCycle.update(dt);
    this.weather.update(dt);

    for (const bat of this.bats) {
      const spd = bat.getData('speed') as number;
      const ph = (bat.getData('phase') as number) + dt * 9;
      bat.setData('phase', ph);
      bat.x += spd * dt;
      bat.scaleY = 0.6 + Math.sin(ph) * 0.35;
      if (bat.x > 1950) {
        bat.x = -60;
        bat.y = 75 + Math.random() * 240;
      }
    }
  }

  destroy(): void {
    this.skyCycle.destroy();
    this.weather.destroy();
    this.mountainGfx.destroy();
    this.farGfx.destroy();
    this.shaftGfx.destroy();
    this.midGfx.destroy();
    this.nearGfx.destroy();
    this.groundGfx.destroy();
    this.optionalLayerImages.forEach((img) => img.destroy());
    this.optionalLayerImages = [];
    this.bats.forEach((b) => b.destroy());
    this.bats = [];
  }
}
