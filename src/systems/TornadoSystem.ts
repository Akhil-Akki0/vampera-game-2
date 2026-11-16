import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { BlockEntity } from '../entities/BlockEntity';
import { ZombieEntity } from '../entities/ZombieEntity';

interface BatTornado {
  kind: 'tornado';
  x: number;
  y: number;
  remaining: number;
  duration: number;
  flung: boolean;
  phase: number;
  bats: Array<{ angle: number; heightRatio: number; speed: number }>;
}

interface BloodVortex {
  kind: 'blood_vortex';
  x: number;
  y: number;
  remaining: number;
  duration: number;
  tickTimer: number;
  phase: number;
}

/**
 * TornadoSystem powers both:
 * 1. Storm Caller's swirling Bat Tornado (pulls bodies into spin, then flings outward)
 * 2. Blood Mage's Crimson Blood Pool Vortex (drags nearby zombies inward with DOT)
 */
export class TornadoSystem {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private activeEffects: Array<BatTornado | BloodVortex> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(40);
  }

  get hasActiveEffect(): boolean {
    return this.activeEffects.length > 0;
  }

  spawnBatTornado(x: number, y: number): void {
    const clampedY = Math.min(GameConfig.GROUND_Y - 80, Math.max(260, y));
    this.activeEffects.push({
      kind: 'tornado',
      x,
      y: clampedY,
      remaining: GameConfig.TORNADO_DURATION_SEC,
      duration: GameConfig.TORNADO_DURATION_SEC,
      flung: false,
      phase: 0,
      bats: Array.from({ length: 18 }, (_, i) => ({
        angle: (i / 18) * Math.PI * 2,
        heightRatio: i / 18,
        speed: 4.5 + (i % 4) * 1.2,
      })),
    });
  }

  spawnBloodVortex(x: number, y: number): void {
    this.activeEffects.push({
      kind: 'blood_vortex',
      x,
      y: Math.min(GameConfig.GROUND_Y - 12, Math.max(380, y)),
      remaining: GameConfig.MAGE_POOL_DURATION_SEC,
      duration: GameConfig.MAGE_POOL_DURATION_SEC,
      tickTimer: 0,
      phase: 0,
    });
  }

  update(
    dt: number,
    blocks: BlockEntity[],
    zombies: ZombieEntity[],
    onDamageZombie: (z: ZombieEntity, dmg: number) => void
  ): void {
    this.gfx.clear();
    if (this.activeEffects.length === 0) return;

    const next: Array<BatTornado | BloodVortex> = [];

    for (const fx of this.activeEffects) {
      fx.remaining -= dt;
      fx.phase += dt * 7;
      if (fx.remaining <= 0) continue;
      next.push(fx);

      if (fx.kind === 'tornado') {
        this.updateTornado(fx, dt, blocks, zombies);
      } else {
        this.updateBloodVortex(fx, dt, zombies, onDamageZombie);
      }
    }

    this.activeEffects = next;
  }

  private updateTornado(
    t: BatTornado,
    dt: number,
    blocks: BlockEntity[],
    zombies: ZombieEntity[]
  ): void {
    const fade = Math.min(1, t.remaining / 0.6);
    const radius = GameConfig.TORNADO_RADIUS;
    const isClimax = t.remaining <= 0.35 && !t.flung;

    // Draw swirling funnel ribbons & circling bat silhouettes
    for (let ring = 0; ring < 7; ring++) {
      const ratio = ring / 6;
      const ry = GameConfig.GROUND_Y - 12 - ratio * 310;
      const rx = 28 + ratio * 105;
      const wobble = Math.sin(t.phase + ring) * 14;
      this.gfx.lineStyle(3, 0x94a3b8, (0.25 + ratio * 0.2) * fade);
      this.gfx.strokeEllipse(t.x + wobble, ry, rx * 2, 22);
    }

    for (const b of t.bats) {
      b.angle += b.speed * dt;
      const ry = GameConfig.GROUND_Y - 24 - b.heightRatio * 290;
      const rx = 24 + b.heightRatio * 108;
      const bx = t.x + Math.cos(b.angle) * rx;
      const by = ry + Math.sin(b.angle) * 12;
      this.gfx.fillStyle(0x090b10, 0.9 * fade);
      this.gfx.fillTriangle(bx - 10, by - 4, bx, by + 3, bx + 10, by - 4);
      this.gfx.fillStyle(0xc084fc, 0.8 * fade);
      this.gfx.fillCircle(bx, by, 2);
    }

    // Apply vortex pull/spin or final outward fling to nearby dynamic bodies
    const applyVortexToBody = (body: MatterJS.BodyType) => {
      if (body.isStatic) return;
      const dx = t.x - body.position.x;
      const dy = t.y - 60 - body.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius || dist < 1) return;

      const nx = dx / dist;
      const ny = dy / dist;
      const falloff = 1 - dist / radius;

      if (isClimax) {
        this.scene.matter.body.applyForce(body, body.position, {
          x: -nx * GameConfig.TORNADO_FLING_FORCE * (0.6 + falloff),
          y: -0.09 - falloff * 0.06,
        });
      } else {
        // Pull inward + tangential spin + lift
        const tx = -ny;
        const ty = nx;
        const force = GameConfig.TORNADO_PULL_FORCE * (0.45 + falloff);
        this.scene.matter.body.applyForce(body, body.position, {
          x: (nx * 0.85 + tx * 0.75) * force,
          y: (ny * 0.6 + ty * 0.35 - 0.55) * force,
        });
      }
    };

    for (const b of blocks) {
      if (!b.destroyed) applyVortexToBody(b.body);
    }
    for (const z of zombies) {
      if (!z.dead) applyVortexToBody(z.body);
    }

    if (isClimax) t.flung = true;
  }

  private updateBloodVortex(
    v: BloodVortex,
    dt: number,
    zombies: ZombieEntity[],
    onDamageZombie: (z: ZombieEntity, dmg: number) => void
  ): void {
    const fade = Math.min(1, v.remaining / 0.5);
    const radius = GameConfig.MAGE_POOL_RADIUS;

    // Crimson pool rings
    this.gfx.fillStyle(0x881337, 0.45 * fade);
    this.gfx.fillEllipse(v.x, v.y, radius * 1.35, 34);
    this.gfx.lineStyle(3, 0xf43f5e, 0.75 * fade);
    const pulse = 0.5 + 0.5 * Math.sin(v.phase);
    this.gfx.strokeEllipse(v.x, v.y, radius * (0.55 + pulse * 0.55), 18 + pulse * 10);

    v.tickTimer += dt;
    const doDot = v.tickTimer >= 0.4;
    if (doDot) v.tickTimer = 0;

    for (const z of [...zombies]) {
      if (z.dead) continue;
      const dx = v.x - z.body.position.x;
      const dy = v.y - z.body.position.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= radius && dist > 1) {
        const pull = 0.011 * (1 - dist / radius + 0.3);
        this.scene.matter.body.applyForce(z.body, z.body.position, {
          x: (dx / dist) * pull,
          y: (dy / dist) * pull * 0.4,
        });
        if (doDot) {
          onDamageZombie(z, Math.round(GameConfig.MAGE_POOL_DOT_PER_SEC * 0.4));
        }
      }
    }
  }

  clear(): void {
    this.activeEffects = [];
    this.gfx.clear();
  }

  destroy(): void {
    this.clear();
    this.gfx.destroy();
  }
}
