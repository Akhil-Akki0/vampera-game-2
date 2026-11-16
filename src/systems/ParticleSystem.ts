import Phaser from 'phaser';
import { GameConfig, GraphicsQuality } from '../config/GameConfig';

interface PooledParticle {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  vx: number;
  vy: number;
  gravity: number;
  vRot: number;
  life: number;
  maxLife: number;
}

/**
 * Object-pooled Phaser particle system + floating score popups.
 * Respects graphicsQuality ('low' | 'medium' | 'high') particle caps.
 */
export class ParticleSystem {
  private scene: Phaser.Scene;
  private pool: PooledParticle[] = [];
  private cursor = 0;
  private maxActive: number;

  constructor(scene: Phaser.Scene, quality: GraphicsQuality) {
    this.scene = scene;
    this.maxActive = GameConfig.PARTICLE_POOL_CAPS[quality];

    for (let i = 0; i < GameConfig.PARTICLE_POOL_CAPS.high; i++) {
      const sprite = scene.add.image(0, 0, 'particle_dot');
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.setDepth(45);
      this.pool.push({
        sprite,
        active: false,
        vx: 0,
        vy: 0,
        gravity: 0.2,
        vRot: 0,
        life: 0,
        maxLife: 0.6,
      });
    }
  }

  setQuality(quality: GraphicsQuality): void {
    this.maxActive = GameConfig.PARTICLE_POOL_CAPS[quality];
  }

  emitBurst(
    x: number,
    y: number,
    count: number,
    options: {
      colors: number[];
      texture?: 'particle_dot' | 'particle_shard';
      speedMin?: number;
      speedMax?: number;
      scaleMin?: number;
      scaleMax?: number;
      gravity?: number;
      maxLife?: number;
    }
  ): void {
    const scaledCount =
      this.maxActive <= 80 ? Math.max(2, Math.floor(count * 0.45)) : count;
    const tex = options.texture ?? 'particle_dot';
    const speedMin = options.speedMin ?? 1.6;
    const speedMax = options.speedMax ?? 6.5;
    const scaleMin = options.scaleMin ?? 0.35;
    const scaleMax = options.scaleMax ?? 0.9;
    const gravity = options.gravity ?? 0.18;
    const maxLife = options.maxLife ?? 0.65;

    for (let i = 0; i < scaledCount; i++) {
      const idx = this.cursor % this.maxActive;
      this.cursor = (this.cursor + 1) % this.maxActive;
      const p = this.pool[idx];

      const angle = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);

      p.active = true;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 1.2;
      p.gravity = gravity;
      p.vRot = (Math.random() - 0.5) * 0.25;
      p.life = 0;
      p.maxLife = maxLife * (0.7 + Math.random() * 0.55);

      p.sprite.setTexture(tex);
      p.sprite.setPosition(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10);
      p.sprite.setScale(scaleMin + Math.random() * (scaleMax - scaleMin));
      p.sprite.setTint(options.colors[i % options.colors.length]);
      p.sprite.setAlpha(1);
      p.sprite.setVisible(true);
      p.sprite.setActive(true);
    }
  }

  spawnScorePopup(x: number, y: number, text: string, color = '#fde047', scale = 1): void {
    const label = this.scene.add
      .text(x, y, text, {
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color,
        stroke: '#07090e',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(60);

    this.scene.tweens.add({
      targets: label,
      y: y - 48,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  update(dt: number): void {
    const step = dt * 60;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.setVisible(false);
        p.sprite.setActive(false);
        continue;
      }
      p.vy += p.gravity * step;
      p.sprite.x += p.vx * step;
      p.sprite.y += p.vy * step;
      p.sprite.rotation += p.vRot * step;
      p.sprite.setAlpha(Math.max(0, 1 - p.life / p.maxLife));
    }
  }

  destroy(): void {
    for (const p of this.pool) {
      p.sprite.destroy();
    }
    this.pool = [];
  }
}
