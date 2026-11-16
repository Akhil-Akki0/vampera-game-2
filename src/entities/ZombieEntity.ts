import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { ZombieBlueprint } from '../data/HandcraftedLevels';
import { ZOMBIE_TYPES, ZombieTypeId } from '../data/ZombieTypes';

/**
 * ZombieEntity manages all 7 undead types using sprite textures,
 * "Thirsty for Blood" hunger detection/crawl/drool/bite behavior,
 * Screamer sonic stun waves, frozen brittle state, and goofy ragdoll death tumbles.
 */
export class ZombieEntity {
  public scene: Phaser.Scene;
  public body: MatterJS.BodyType;
  public sprite: Phaser.GameObjects.Image;
  public overlayGfx: Phaser.GameObjects.Graphics;
  public hpBar: Phaser.GameObjects.Graphics;
  public type: ZombieTypeId;
  public radius: number;
  public hp: number;
  public maxHp: number;
  public points: number;
  public dead = false;
  public frozen = false;
  public hungry = false;
  public bossPhase2Triggered = false;

  private hurtTimer = 0;
  private animPhase = Math.random() * Math.PI * 2;
  private runnerDir = Math.random() < 0.5 ? -1 : 1;
  private runnerTimer = 0;
  private biteCooldown = 0;
  private groanCooldown = 0;
  private shriekCooldown = 1.2;
  private baseScale: number;

  constructor(scene: Phaser.Scene, bp: ZombieBlueprint, hpMultiplier = 1) {
    this.scene = scene;
    this.type = bp.type;
    const meta = ZOMBIE_TYPES[bp.type];
    this.radius = meta.radius;
    this.maxHp = Math.round(meta.maxHp * hpMultiplier);
    this.hp = this.maxHp;
    this.points = meta.points;

    this.body = scene.matter.add.circle(bp.x, bp.y, this.radius, {
      density: 0.0022 * meta.massScale,
      restitution: 0.14,
      friction: 0.78,
      frictionAir: 0.01,
      label: `zombie:${bp.type}`,
    });
    (this.body as unknown as { entityRef: ZombieEntity }).entityRef = this;

    const texKey = scene.textures.exists(`zomb_${bp.type}`) ? `zomb_${bp.type}` : 'zomb_normal';
    const texSize = bp.type === 'boss' ? 140 : 96;
    this.baseScale = (this.radius * 2.25) / texSize;

    this.sprite = scene.add
      .image(bp.x, bp.y, texKey)
      .setDepth(25)
      .setScale(this.baseScale);
    this.overlayGfx = scene.add.graphics().setDepth(25.5);
    this.hpBar = scene.add.graphics().setDepth(26);
    this.redrawOverlays();
  }

  freeze(): void {
    if (this.dead) return;
    this.frozen = true;
    this.sprite.setTint(0x7dd3fc);
    this.redrawOverlays();
  }

  /**
   * Apply impact/ability damage. Frozen zombies shatter massively on next hit!
   */
  applyDamage(amount: number, impactFromLeft = false): boolean {
    if (this.dead || amount <= 0) return false;
    let effective = amount;
    if (this.type === 'shield' && impactFromLeft && !this.frozen) {
      effective = Math.round(amount * 0.35);
    }
    if (this.frozen) {
      effective = Math.max(effective * 2.4, this.hp + 20);
      this.frozen = false;
    }

    this.hp = Math.max(0, this.hp - effective);
    this.hurtTimer = 0.24;
    this.sprite.setTint(0xbbf7d0);

    if (this.type === 'boss' && !this.bossPhase2Triggered && this.hp <= this.maxHp * 0.5 && this.hp > 0) {
      this.bossPhase2Triggered = true;
      this.sprite.setTint(0xfca5a5);
    }

    this.redrawOverlays();
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  /**
   * Evaluate "Thirsty for Blood" hunger toward nearby vampires.
   * Returns events so GameScene can play groan/bite feedback or stun fast vampires near a Screamer.
   */
  evaluateHungerAndAbilities(
    dt: number,
    allowMovement: boolean,
    vampirePos: { x: number; y: number; vx: number; vy: number } | null
  ): { groan: boolean; bite: boolean; shrieked: boolean } {
    const out = { groan: false, bite: false, shrieked: false };
    if (this.dead || this.frozen) {
      this.hungry = false;
      return out;
    }

    this.biteCooldown = Math.max(0, this.biteCooldown - dt);
    this.groanCooldown = Math.max(0, this.groanCooldown - dt);
    this.shriekCooldown = Math.max(0, this.shriekCooldown - dt);

    if (!vampirePos) {
      if (this.hungry) {
        this.hungry = false;
        this.redrawOverlays();
      }
      return out;
    }

    const dx = vampirePos.x - this.body.position.x;
    const dy = vampirePos.y - this.body.position.y;
    const dist = Math.hypot(dx, dy);

    // Screamer sonic shriek slightly stuns fast flying vampires passing overhead
    const vampSpeed = Math.hypot(vampirePos.vx, vampirePos.vy);
    if (this.type === 'screamer' && allowMovement && vampSpeed > 4.5 && dist <= 190 && this.shriekCooldown <= 0) {
      this.shriekCooldown = 2.4;
      out.shrieked = true;
    }

    // Hunger triggers when vampire is nearby & relatively slow (landed/vulnerable)
    const wasHungry = this.hungry;
    if (dist <= GameConfig.HUNGER_DETECT_RADIUS && vampSpeed < 6.0) {
      this.hungry = true;
      this.sprite.setFlipX(dx > 12);

      if (this.groanCooldown <= 0) {
        this.groanCooldown = 2.6 + Math.random();
        out.groan = true;
      }

      if (allowMovement && Math.abs(this.body.velocity.y) < 0.45 && dist > GameConfig.HUNGER_BITE_RADIUS * 0.85) {
        const dir = dx >= 0 ? 1 : -1;
        this.scene.matter.body.setVelocity(this.body, {
          x: dir * (this.type === 'runner' ? 1.25 : GameConfig.HUNGER_CRAWL_SPEED),
          y: this.body.velocity.y,
        });
      }

      if (dist <= GameConfig.HUNGER_BITE_RADIUS && this.biteCooldown <= 0) {
        this.biteCooldown = 1.6;
        out.bite = true;
      }
    } else {
      this.hungry = false;
      this.sprite.setFlipX(false);
    }

    if (wasHungry !== this.hungry) {
      this.redrawOverlays();
    }
    return out;
  }

  update(dt: number, allowMovement: boolean): void {
    if (this.dead) return;
    this.animPhase += dt * (this.hungry ? 6.5 : 3.4);

    if (this.hurtTimer > 0) {
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
      if (this.hurtTimer === 0) {
        if (this.frozen) this.sprite.setTint(0x7dd3fc);
        else if (this.bossPhase2Triggered) this.sprite.setTint(0xfca5a5);
        else this.sprite.clearTint();
        this.redrawOverlays();
      }
    }

    // Runner zombie paces gently when not already chasing hunger target
    if (allowMovement && this.type === 'runner' && !this.hungry && !this.frozen) {
      this.runnerTimer += dt;
      if (this.runnerTimer > 1.8) {
        this.runnerTimer = 0;
        this.runnerDir *= -1;
      }
      if (Math.abs(this.body.velocity.y) < 0.4) {
        this.scene.matter.body.setVelocity(this.body, {
          x: this.runnerDir * 0.85,
          y: this.body.velocity.y,
        });
      }
    }

    const sway = this.frozen ? 0 : Math.sin(this.animPhase) * (this.hungry ? 0.09 : 0.04);
    const pulse = this.hungry ? 1 + Math.sin(this.animPhase * 1.4) * 0.05 : 1;
    this.sprite.setScale(this.baseScale * pulse, this.baseScale * (2 - pulse));
    this.sprite.setPosition(this.body.position.x, this.body.position.y);
    this.sprite.setRotation(this.body.angle + sway);

    this.overlayGfx.setPosition(this.body.position.x, this.body.position.y);
    this.overlayGfx.setRotation(this.body.angle + sway);

    // Draw HP bar above boss or wounded zombies
    this.hpBar.clear();
    if (this.hp < this.maxHp || this.type === 'boss') {
      const barW = this.radius * 2.1;
      const barH = this.type === 'boss' ? 8 : 5;
      const bx = this.body.position.x - barW / 2;
      const by = this.body.position.y - this.radius - (this.type === 'boss' ? 28 : 16);
      const ratio = Math.max(0, this.hp / this.maxHp);
      this.hpBar.fillStyle(0x07090e, 0.85);
      this.hpBar.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      const barColor = ratio > 0.5 ? 0x22c55e : ratio > 0.25 ? 0xeab308 : 0xef4444;
      this.hpBar.fillStyle(barColor, 1);
      this.hpBar.fillRect(bx, by, barW * ratio, barH);
    }
  }

  private redrawOverlays(): void {
    const g = this.overlayGfx;
    g.clear();
    const r = this.radius;

    if (this.frozen) {
      g.lineStyle(3, 0x38bdf8, 0.95);
      g.strokeRoundedRect(-r, -r, r * 2, r * 2, 8);
    }

    if (this.hungry && !this.frozen) {
      // Glowing red blood-lust eyes ring & toxic green drool
      g.fillStyle(0xef4444, 0.95);
      g.fillCircle(-r * 0.3, -r * 0.14, 3.8);
      g.fillCircle(r * 0.3, -r * 0.14, 3.8);
      g.fillStyle(0xa3e635, 0.95);
      g.fillCircle(r * 0.2, r * 0.45, 3);
      g.fillRect(r * 0.16, r * 0.3, 4, 11);
    }
  }

  spawnDeathRagdoll(): void {
    const x = this.body.position.x;
    const y = this.body.position.y;
    const texKey = this.scene.textures.exists(`zomb_${this.type}`) ? `zomb_${this.type}` : 'zomb_normal';
    const rag = this.scene.add
      .image(x, y, texKey)
      .setDepth(27)
      .setScale(this.baseScale)
      .setTint(0x86efac);

    this.scene.tweens.add({
      targets: rag,
      x: x + (Math.random() - 0.3) * 90,
      y: y - 55,
      angle: (Math.random() < 0.5 ? -1 : 1) * 420,
      alpha: 0,
      scaleX: this.baseScale * 0.45,
      scaleY: this.baseScale * 0.45,
      duration: 520,
      ease: 'Cubic.easeOut',
      onComplete: () => rag.destroy(),
    });
  }

  destroy(withRagdoll = false): void {
    this.dead = true;
    if (withRagdoll) {
      this.spawnDeathRagdoll();
    }
    try {
      this.scene.matter.world.remove(this.body);
    } catch {
      // Already removed
    }
    this.sprite.destroy();
    this.overlayGfx.destroy();
    this.hpBar.destroy();
  }
}
