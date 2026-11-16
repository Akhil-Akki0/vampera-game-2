import Phaser from 'phaser';
import { GameConfig, GraphicsQuality } from '../config/GameConfig';
import { WorldTheme } from '../data/WorldConfig';

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  alpha: number;
}

/**
 * SkyCycleSystem renders the living day/night sky cycle, sun & moon paths with
 * glow halos, twinkling stars, scrolling clouds, and soft gothic vignette.
 */
export class SkyCycleSystem {
  private skyGfx: Phaser.GameObjects.Graphics;
  private celestialGfx: Phaser.GameObjects.Graphics;
  private cloudGfx: Phaser.GameObjects.Graphics;
  private vignetteGfx: Phaser.GameObjects.Graphics;

  private world: WorldTheme;
  private quality: GraphicsQuality;
  private cycleTime = 0;
  private clouds: Cloud[] = [];
  private stars: Array<{ x: number; y: number; size: number; phase: number }> = [];

  constructor(scene: Phaser.Scene, world: WorldTheme, quality: GraphicsQuality) {
    this.world = world;
    this.quality = quality;

    // Seed initial time of day per world's atmospheric tendency
    this.cycleTime =
      world.timeTendency === 'day_sunset'
        ? 0.28
        : world.timeTendency === 'dusk_night'
          ? 0.56
          : world.timeTendency === 'twilight_storm'
            ? 0.65
            : 0.78;

    this.skyGfx = scene.add.graphics().setDepth(1).setScrollFactor(0);
    this.celestialGfx = scene.add.graphics().setDepth(1.4).setScrollFactor(0.06);
    this.cloudGfx = scene.add.graphics().setDepth(2.2).setScrollFactor(0.14);
    this.vignetteGfx = scene.add.graphics().setDepth(49).setScrollFactor(0);

    const starCount = quality === 'low' ? 18 : quality === 'medium' ? 32 : quality === 'high' ? 48 : 68;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: (i * 197 + 43) % GameConfig.WORLD_WIDTH,
        y: (i * 89 + 22) % 440,
        size: i % 3 === 0 ? 2.6 : 1.6,
        phase: i * 0.7,
      });
    }

    const cloudCount = quality === 'low' ? 3 : quality === 'medium' ? 5 : quality === 'high' ? 8 : 11;
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({
        x: (i * 260) % 1900,
        y: 80 + (i % 4) * 58,
        w: 160 + (i % 3) * 65,
        h: 34 + (i % 2) * 14,
        speed: 10 + (i % 4) * 6,
        alpha: 0.14 + (i % 3) * 0.04,
      });
    }

    this.drawVignette();
    this.update(0);
  }

  private drawVignette(): void {
    this.vignetteGfx.clear();
    if (this.quality === 'low') return;
    const W = GameConfig.WORLD_WIDTH;
    const H = GameConfig.WORLD_HEIGHT;
    this.vignetteGfx.lineStyle(64, 0x040509, 0.28);
    this.vignetteGfx.strokeRect(-240, -160, W + 480, H + 320);
  }

  private lerpColor(c1: number, c2: number, t: number): number {
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return (r << 16) | (g << 8) | b;
  }

  update(dt: number): void {
    // Full day/night cycle drifts gently (~95 seconds per cycle)
    this.cycleTime = (this.cycleTime + dt * 0.0105) % 1;
    const angle = this.cycleTime * Math.PI * 2;
    // sunElevation > 0 => daytime; < 0 => night
    const sunElev = Math.sin(angle);
    const daylight = Math.max(0, sunElev);
    const duskGlow = Math.max(0, 1 - Math.abs(sunElev) * 3.2);

    const W = GameConfig.WORLD_WIDTH;
    const H = GameConfig.WORLD_HEIGHT;

    const baseTop = this.world.skyTop;
    const baseBot = this.world.skyBottom;
    const dayTop = this.lerpColor(baseTop, 0x264673, daylight * 0.55);
    const dayBot = this.lerpColor(baseBot, 0x5c7ca8, daylight * 0.45);
    const skyTop = this.lerpColor(dayTop, 0x451f33, duskGlow * 0.4);
    const skyBot = this.lerpColor(dayBot, 0x9a3412, duskGlow * 0.35);

    this.skyGfx.clear();
    this.skyGfx.fillGradientStyle(skyTop, skyTop, skyBot, skyBot, 1);
    this.skyGfx.fillRect(-380, -240, W + 760, H + 480);

    // Twinkling stars (brighter at night)
    const nightVis = Math.max(0.12, 1 - daylight * 0.85);
    for (const s of this.stars) {
      s.phase += dt * 2.4;
      const tw = 0.45 + 0.55 * Math.sin(s.phase);
      this.skyGfx.fillStyle(0xf8fafc, tw * nightVis * 0.6);
      this.skyGfx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Sun & Moon arc across the sky
    this.celestialGfx.clear();
    const sunX = 800 + Math.cos(angle) * 620;
    const sunY = 480 - Math.sin(angle) * 340;
    if (sunY < GameConfig.GROUND_Y + 40) {
      this.celestialGfx.fillStyle(0xfbbf24, 0.16);
      this.celestialGfx.fillCircle(sunX, sunY, 92);
      this.celestialGfx.fillStyle(0xfde68a, 0.92);
      this.celestialGfx.fillCircle(sunX, sunY, 44);
    }

    const moonAngle = angle + Math.PI;
    const moonX = 800 + Math.cos(moonAngle) * 620;
    const moonY = 480 - Math.sin(moonAngle) * 340;
    if (moonY < GameConfig.GROUND_Y + 40) {
      this.celestialGfx.fillStyle(this.world.moonColor, 0.15);
      this.celestialGfx.fillCircle(moonX, moonY, 122);
      this.celestialGfx.fillStyle(this.world.moonColor, 0.25);
      this.celestialGfx.fillCircle(moonX, moonY, 82);
      this.celestialGfx.fillStyle(this.world.moonColor, 1);
      this.celestialGfx.fillCircle(moonX, moonY, 56);
      // Subtle moon phase crescent shadow
      this.celestialGfx.fillStyle(skyTop, 0.35);
      this.celestialGfx.fillCircle(moonX + 18, moonY - 10, 48);
    }

    // Scrolling clouds
    this.cloudGfx.clear();
    const cloudCol = this.lerpColor(0x1e293b, 0x94a3b8, daylight * 0.5 + duskGlow * 0.25);
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 1950) c.x = -c.w;
      this.cloudGfx.fillStyle(cloudCol, c.alpha);
      this.cloudGfx.fillEllipse(c.x, c.y, c.w, c.h);
      this.cloudGfx.fillEllipse(c.x - c.w * 0.22, c.y + 6, c.w * 0.6, c.h * 0.8);
      this.cloudGfx.fillEllipse(c.x + c.w * 0.24, c.y + 8, c.w * 0.55, c.h * 0.75);
    }
  }

  destroy(): void {
    this.skyGfx.destroy();
    this.celestialGfx.destroy();
    this.cloudGfx.destroy();
    this.vignetteGfx.destroy();
  }
}
