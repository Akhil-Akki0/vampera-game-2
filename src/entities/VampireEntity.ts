import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';

/**
 * VampireEntity manages all 9 launched vampire characters using sprite textures
 * (loaded from /assets or generated fallback), squash-stretch animations,
 * cape flutter, mid-air special states, and stuck-timeout detection.
 */
export class VampireEntity {
  public scene: Phaser.Scene;
  public body: MatterJS.BodyType;
  public sprite: Phaser.GameObjects.Image;
  public overlayGfx: Phaser.GameObjects.Graphics;
  public trailGraphics: Phaser.GameObjects.Graphics;
  public type: VampireTypeId;
  public radius: number;
  public launched = true;
  public abilityUsed = false;
  public isClone = false;
  public armedBomb = false;
  public hasShield = false;
  public stuckTimer = 0;

  private trail: Array<{ x: number; y: number }> = [];
  private skinTint: number;
  private baseScale: number;
  private hitTimer = 0;
  private flutterPhase = Math.random() * Math.PI * 2;

  constructor(
    scene: Phaser.Scene,
    type: VampireTypeId,
    x: number,
    y: number,
    skinTint = 0xffffff,
    isClone = false,
    hasShield = false
  ) {
    this.scene = scene;
    this.type = type;
    this.isClone = isClone;
    this.skinTint = skinTint;
    this.hasShield = hasShield;
    const meta = VAMPIRE_TYPES[type];
    this.radius = isClone ? Math.round(meta.radius * 0.72) : meta.radius;

    this.body = scene.matter.add.circle(x, y, this.radius, {
      density: meta.density,
      restitution: 0.34,
      friction: 0.55,
      frictionAir: 0.005,
      label: `vampire:${type}`,
    });
    (this.body as unknown as { entityRef: VampireEntity }).entityRef = this;

    this.trailGraphics = scene.add.graphics().setDepth(28);
    this.baseScale = (this.radius * 2.35) / 96;

    const texKey = scene.textures.exists(`vamp_${type}`) ? `vamp_${type}` : 'vamp_dracula';
    this.sprite = scene.add
      .image(x, y, texKey)
      .setDepth(30)
      .setScale(this.baseScale);
    if (this.skinTint !== 0xffffff) {
      this.sprite.setTint(this.skinTint);
    }

    // Launch stretch impulse
    this.sprite.setScale(this.baseScale * 1.18, this.baseScale * 0.84);

    this.overlayGfx = scene.add.graphics().setDepth(31);
    this.redraw();
  }

  get canUseAbility(): boolean {
    return this.launched && !this.abilityUsed && !this.isClone && this.type !== 'dracula';
  }

  triggerImpactSquash(): void {
    this.hitTimer = 0.2;
  }

  update(dt: number): void {
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    const speed = Math.hypot(vx, vy);
    if (speed > GameConfig.MAX_BODY_VELOCITY) {
      const s = GameConfig.MAX_BODY_VELOCITY / speed;
      this.scene.matter.body.setVelocity(this.body, { x: vx * s, y: vy * s });
    }

    this.flutterPhase += dt * (8 + speed * 0.6);
    if (this.hitTimer > 0) this.hitTimer = Math.max(0, this.hitTimer - dt);

    // Squash/stretch proportional to velocity or impact squish
    const stretch = this.hitTimer > 0 ? -0.18 : Math.min(0.22, speed * 0.012);
    const sx = this.baseScale * (1 + stretch);
    const sy = this.baseScale * (1 - stretch * 0.75 + Math.sin(this.flutterPhase) * 0.03);
    this.sprite.setScale(sx, sy);

    this.trail.push({ x: this.body.position.x, y: this.body.position.y });
    const maxTrail = this.type === 'mage' ? 26 : 18;
    if (this.trail.length > maxTrail) this.trail.shift();

    this.trailGraphics.clear();
    const meta = VAMPIRE_TYPES[this.type];
    const trailCol = this.type === 'mage' ? 0xe11d48 : meta.color;
    for (let i = 0; i < this.trail.length; i++) {
      const ratio = i / this.trail.length;
      const alpha = ratio * (this.type === 'mage' ? 0.68 : 0.45);
      this.trailGraphics.fillStyle(trailCol, alpha);
      this.trailGraphics.fillCircle(
        this.trail[i].x,
        this.trail[i].y,
        (this.type === 'mage' ? 3.8 : 2.5) + ratio * 4.5
      );
    }

    this.sprite.setPosition(this.body.position.x, this.body.position.y);
    this.sprite.setRotation(this.body.angle);
    this.overlayGfx.setPosition(this.body.position.x, this.body.position.y);
    this.overlayGfx.setRotation(this.body.angle);

    if (speed < GameConfig.STUCK_SPEED_THRESHOLD) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
    }
  }

  redraw(): void {
    const g = this.overlayGfx;
    g.clear();
    const r = this.radius;

    // Subtle animated cape flutter tail
    const meta = VAMPIRE_TYPES[this.type];
    g.fillStyle(meta.capeColor, 0.75);
    g.fillTriangle(-r * 0.9, -r * 0.1, -r * 1.35, r * 0.45, -r * 0.55, r * 0.65);

    if (this.armedBomb) {
      g.lineStyle(3.5, 0xf97316, 1);
      g.strokeCircle(0, 0, r * 1.28);
    }
    if (this.hasShield) {
      g.lineStyle(2.8, 0x38bdf8, 0.9);
      g.strokeCircle(0, 0, r * 1.42);
    }
  }

  destroy(): void {
    try {
      this.scene.matter.world.remove(this.body);
    } catch {
      // Already removed
    }
    this.sprite.destroy();
    this.overlayGfx.destroy();
    this.trailGraphics.destroy();
  }
}
