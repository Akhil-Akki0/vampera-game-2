import Phaser from 'phaser';
import { GameConfig, GraphicsQuality } from '../config/GameConfig';
import { WorldTheme } from '../data/WorldConfig';

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

/**
 * WeatherSystem renders per-world ambient weather (rain, snow, sandstorm, mist,
 * volcano ash, fireflies, falling leaves, daytime birds, and soul sparks),
 * dynamically scaling density by GraphicsQuality and drifting intensity naturally.
 */
export class WeatherSystem {
  private gfx: Phaser.GameObjects.Graphics;
  private world: WorldTheme;
  private quality: GraphicsQuality;
  private particles: WeatherParticle[] = [];
  private intensity = 1.0;
  private intensityTimer = 0;

  constructor(scene: Phaser.Scene, world: WorldTheme, quality: GraphicsQuality) {
    this.world = world;
    this.quality = quality;
    this.gfx = scene.add.graphics().setDepth(42).setScrollFactor(0.78);
    this.initParticles();
  }

  private initParticles(): void {
    const kind = this.world.ambientParticle;
    const base =
      this.quality === 'low' ? 12 : this.quality === 'medium' ? 24 : this.quality === 'high' ? 38 : 54;
    const count = kind === 'fog' ? Math.min(14, base) : base;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * 1900,
        y: Math.random() * GameConfig.GROUND_Y,
        vx:
          kind === 'sand'
            ? -150
            : kind === 'rain'
              ? -45
              : kind === 'fog'
                ? 14 + Math.random() * 12
                : (Math.random() - 0.5) * 28,
        vy:
          kind === 'snow'
            ? 45 + Math.random() * 35
            : kind === 'rain'
              ? 380
              : kind === 'embers' || kind === 'bubbles' || kind === 'souls' || kind === 'ash'
                ? -34 - Math.random() * 28
                : 0,
        size: kind === 'fog' ? 190 : 3 + Math.random() * 4,
        alpha: kind === 'fog' ? 0.045 : 0.58,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  getIntensity(): number {
    return this.intensity;
  }

  update(dt: number): void {
    this.intensityTimer += dt;
    if (this.intensityTimer > 12) {
      this.intensityTimer = 0;
      this.intensity = 0.75 + Math.random() * 0.6;
    }

    this.gfx.clear();
    const kind = this.world.ambientParticle;
    const color =
      kind === 'fireflies'
        ? 0xbef264
        : kind === 'embers' || kind === 'ash'
          ? 0xf97316
          : kind === 'snow' || kind === 'rain'
            ? 0xe0f2fe
            : kind === 'sand'
              ? 0xfcd34d
              : kind === 'bubbles'
                ? 0x4ade80
                : kind === 'sparks'
                  ? 0x38bdf8
                  : kind === 'souls'
                    ? 0xc084fc
                    : 0xcbd5e1;

    for (const p of this.particles) {
      p.phase += dt * 3;
      p.x += p.vx * this.intensity * dt;
      p.y += p.vy * this.intensity * dt;

      if (p.x < -150) p.x = 1850;
      if (p.x > 1880) p.x = -120;
      if (p.y < -20) p.y = GameConfig.GROUND_Y - 10;
      if (p.y > GameConfig.GROUND_Y) p.y = -10;

      if (kind === 'fog') {
        this.gfx.fillStyle(color, p.alpha * this.intensity);
        this.gfx.fillEllipse(p.x, GameConfig.GROUND_Y - 18, p.size * 2, 34);
      } else if (kind === 'rain') {
        this.gfx.lineStyle(1.5, color, 0.48 * this.intensity);
        this.gfx.lineBetween(p.x, p.y, p.x - 5, p.y + 15);
      } else {
        const pulse =
          kind === 'fireflies' || kind === 'souls'
            ? 0.3 + Math.abs(Math.sin(p.phase)) * 0.6
            : p.alpha;
        this.gfx.fillStyle(color, Math.min(1, pulse * this.intensity));
        this.gfx.fillCircle(p.x, p.y, p.size * 0.62);
      }
    }
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
