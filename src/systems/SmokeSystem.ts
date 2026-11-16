import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { BlockEntity } from '../entities/BlockEntity';
import { ZombieEntity } from '../entities/ZombieEntity';

interface SmokeCloud {
  x: number;
  y: number;
  radius: number;
  remaining: number;
  duration: number;
  tickTimer: number;
  puffs: Array<{ ox: number; oy: number; r: number; phase: number; speed: number }>;
}

/**
 * SmokeSystem manages lingering Black Smoke clouds spawned by Blast Baron explosions.
 * Obscures the impact zone, weakens nearby blocks & zombies over time, and auto-expires cleanly.
 */
export class SmokeSystem {
  private gfx: Phaser.GameObjects.Graphics;
  private clouds: SmokeCloud[] = [];

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(41);
  }

  spawnCloud(x: number, y: number, radius: number = GameConfig.SMOKE_RADIUS): void {
    const puffs = Array.from({ length: 14 }, (_, i) => {
      const ang = (i / 14) * Math.PI * 2;
      const dist = Math.random() * radius * 0.55;
      return {
        ox: Math.cos(ang) * dist,
        oy: Math.sin(ang) * dist * 0.65 - 10,
        r: 26 + Math.random() * 28,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.1,
      };
    });

    this.clouds.push({
      x,
      y,
      radius,
      remaining: GameConfig.SMOKE_DURATION_SEC,
      duration: GameConfig.SMOKE_DURATION_SEC,
      tickTimer: 0,
      puffs,
    });
  }

  update(
    dt: number,
    blocks: BlockEntity[],
    zombies: ZombieEntity[],
    onDamageBlock: (b: BlockEntity, dmg: number) => void,
    onDamageZombie: (z: ZombieEntity, dmg: number) => void
  ): void {
    this.gfx.clear();
    if (this.clouds.length === 0) return;

    const aliveClouds: SmokeCloud[] = [];
    for (const c of this.clouds) {
      c.remaining -= dt;
      if (c.remaining <= 0) continue;
      aliveClouds.push(c);

      const fade = Math.min(1, c.remaining / 1.1);
      for (const p of c.puffs) {
        p.phase += dt * p.speed;
        const px = c.x + p.ox + Math.sin(p.phase) * 14;
        const py = c.y + p.oy - (1 - c.remaining / c.duration) * 28 + Math.cos(p.phase * 0.8) * 9;
        this.gfx.fillStyle(0x0b0d12, 0.52 * fade);
        this.gfx.fillCircle(px, py, p.r);
        this.gfx.fillStyle(0x1f2430, 0.35 * fade);
        this.gfx.fillCircle(px - 6, py - 6, p.r * 0.65);
      }

      // Apply damage-over-time & weakening every 0.45s
      c.tickTimer += dt;
      if (c.tickTimer >= 0.45) {
        c.tickTimer = 0;
        const dot = Math.round(GameConfig.SMOKE_DOT_PER_SEC * 0.45);
        for (const b of [...blocks]) {
          if (b.destroyed || b.material === 'spike') continue;
          if (Math.hypot(b.body.position.x - c.x, b.body.position.y - c.y) <= c.radius) {
            onDamageBlock(b, dot);
          }
        }
        for (const z of [...zombies]) {
          if (z.dead) continue;
          if (Math.hypot(z.body.position.x - c.x, z.body.position.y - c.y) <= c.radius) {
            onDamageZombie(z, Math.round(dot * 0.75));
          }
        }
      }
    }
    this.clouds = aliveClouds;
  }

  clear(): void {
    this.clouds = [];
    this.gfx.clear();
  }

  destroy(): void {
    this.clear();
    this.gfx.destroy();
  }
}
