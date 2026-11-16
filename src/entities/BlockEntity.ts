import Phaser from 'phaser';
import { BlockBlueprint } from '../data/HandcraftedLevels';
import { MATERIAL_CONFIG, MaterialTypeId } from '../data/MaterialConfig';

/**
 * BlockEntity wraps a Phaser Matter rectangle body and procedural graphics renderer
 * for wood, stone, glass, ice, explosive barrels, TNT crates, hanging coffins, and spikes.
 */
export class BlockEntity {
  public scene: Phaser.Scene;
  public body: MatterJS.BodyType;
  public graphics: Phaser.GameObjects.Graphics;
  public ropeGraphics: Phaser.GameObjects.Graphics | null = null;
  public ropeConstraint: MatterJS.ConstraintType | null = null;
  public ropeAnchor: { x: number; y: number } | null = null;
  public ropeCut = false;

  public material: MaterialTypeId;
  public w: number;
  public h: number;
  public hp: number;
  public maxHp: number;
  public hardness: number;
  public points: number;
  public destroyed = false;
  public frozen = false;
  private hitFlash = 0;

  constructor(scene: Phaser.Scene, bp: BlockBlueprint, isSlipperyWorld = false) {
    this.scene = scene;
    this.material = bp.material;
    this.w = bp.w;
    this.h = bp.h;
    const meta = MATERIAL_CONFIG[bp.material];
    this.maxHp = meta.maxHp;
    this.hp = meta.maxHp;
    this.hardness = meta.hardness;
    this.points = meta.points;

    this.body = scene.matter.add.rectangle(bp.x, bp.y, bp.w, bp.h, {
      density: meta.density,
      restitution: meta.restitution,
      friction: isSlipperyWorld ? Math.min(meta.friction, 0.12) : meta.friction,
      frictionAir: 0.008,
      angle: bp.angle ?? 0,
      isStatic: Boolean(meta.isStaticHazard),
      label: `block:${bp.material}`,
    });

    (this.body as unknown as { entityRef: BlockEntity }).entityRef = this;

    this.graphics = scene.add.graphics().setDepth(20);

    if (bp.material === 'coffin' && typeof bp.ropeAnchorY === 'number') {
      this.ropeAnchor = { x: bp.x, y: bp.ropeAnchorY };
      this.ropeGraphics = scene.add.graphics().setDepth(18);
      this.ropeConstraint = scene.matter.add.worldConstraint(
        this.body,
        Math.max(20, bp.y - bp.ropeAnchorY - bp.h * 0.45),
        0.9,
        {
          pointA: { x: bp.x, y: bp.ropeAnchorY },
          pointB: { x: 0, y: -bp.h * 0.45 },
          damping: 0.05,
        }
      );
    }

    this.redraw();
  }

  get isExplosive(): boolean {
    return this.material === 'barrel' || this.material === 'tnt';
  }

  freeze(): void {
    if (this.destroyed || this.material === 'spike') return;
    this.frozen = true;
    this.hardness = Math.max(0.45, this.hardness * 0.45);
    this.hp = Math.min(this.hp, 24);
    this.redraw();
  }

  applyDamage(amount: number): boolean {
    if (this.destroyed || this.material === 'spike' || amount <= 0) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 0.12;
    this.redraw();
    if (this.hp <= 0) {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  intersectsRope(px: number, py: number, radius: number): boolean {
    if (!this.ropeAnchor || this.ropeCut || this.destroyed) return false;
    const ax = this.ropeAnchor.x;
    const ay = this.ropeAnchor.y;
    const bx = this.body.position.x;
    const by = this.body.position.y - this.h * 0.4;
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) return false;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= radius + 12;
  }

  cutRope(): void {
    if (!this.ropeConstraint || this.ropeCut) return;
    this.ropeCut = true;
    try {
      this.scene.matter?.world?.removeConstraint(this.ropeConstraint);
    } catch {
      // World already torn down
    }
    this.ropeConstraint = null;
    if (this.ropeGraphics) {
      this.ropeGraphics.clear();
    }
  }

  update(dt: number): void {
    if (this.destroyed) return;
    if (this.hitFlash > 0) {
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      if (this.hitFlash === 0) this.redraw();
    }
    this.graphics.setPosition(this.body.position.x, this.body.position.y);
    this.graphics.setRotation(this.body.angle);

    if (this.ropeGraphics && this.ropeAnchor && !this.ropeCut) {
      this.ropeGraphics.clear();
      const topX = this.body.position.x + Math.sin(this.body.angle) * (this.h * 0.42);
      const topY = this.body.position.y - Math.cos(this.body.angle) * (this.h * 0.42);
      this.ropeGraphics.lineStyle(4, 0xa16207, 1);
      this.ropeGraphics.lineBetween(this.ropeAnchor.x, this.ropeAnchor.y, topX, topY);
      this.ropeGraphics.fillStyle(0x475569, 1);
      this.ropeGraphics.fillCircle(this.ropeAnchor.x, this.ropeAnchor.y, 6);
    }
  }

  private redraw(): void {
    const g = this.graphics;
    g.clear();
    const hw = this.w / 2;
    const hh = this.h / 2;
    const meta = MATERIAL_CONFIG[this.material];
    const fill = this.frozen
      ? 0x7dd3fc
      : this.hitFlash > 0
        ? 0xfef08a
        : meta.color;

    if (this.material === 'spike') {
      g.fillStyle(0x334155, 1);
      g.fillRect(-hw, 2, this.w, hh - 2);
      const spikes = Math.max(3, Math.floor(this.w / 18));
      const sw = this.w / spikes;
      g.fillStyle(0xcbd5e1, 1);
      g.lineStyle(2, 0x0f172a, 1);
      for (let i = 0; i < spikes; i++) {
        const sx = -hw + i * sw;
        g.beginPath();
        g.moveTo(sx, 2);
        g.lineTo(sx + sw * 0.5, -hh);
        g.lineTo(sx + sw, 2);
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
      return;
    }

    const alpha = this.material === 'glass' ? 0.48 : this.material === 'ice' ? 0.72 : 1;
    g.fillStyle(fill, alpha);
    g.lineStyle(2.2, meta.strokeColor, 1);

    if (this.material === 'coffin') {
      g.beginPath();
      g.moveTo(-hw + 10, -hh);
      g.lineTo(hw - 10, -hh);
      g.lineTo(hw, 0);
      g.lineTo(hw - 10, hh);
      g.lineTo(-hw + 10, hh);
      g.lineTo(-hw, 0);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.fillStyle(0x94a3b8, 1);
      g.fillRect(-10, -2, 20, 4);
      g.fillRect(-2, -9, 4, 18);
    } else {
      g.fillRect(-hw, -hh, this.w, this.h);
      g.strokeRect(-hw, -hh, this.w, this.h);
    }

    if (this.material === 'barrel') {
      g.fillStyle(0x475569, 1);
      g.fillRect(-hw, -hh + 6, this.w, 5);
      g.fillRect(-hw, hh - 11, this.w, 5);
      g.fillStyle(0xfbbf24, 1);
      g.fillTriangle(0, -8, 6, 6, -6, 6);
    } else if (this.material === 'tnt') {
      g.fillStyle(0xfef3c7, 1);
      g.fillRect(-hw + 3, -9, this.w - 6, 18);
      g.fillStyle(0x7f1d1d, 1);
      g.fillRect(-11, -3, 22, 6);
    }

    // Progressive cracks as HP drops
    const damageRatio = 1 - this.hp / this.maxHp;
    if (damageRatio > 0.2 && !this.isExplosive) {
      g.lineStyle(1.8, this.material === 'glass' ? 0xe0f2fe : 0x0f172a, 0.85);
      g.beginPath();
      g.moveTo(-hw * 0.45, -hh * 0.45);
      g.lineTo(0, 0);
      g.lineTo(hw * 0.3, -hh * 0.25);
      if (damageRatio > 0.55) {
        g.moveTo(0, 0);
        g.lineTo(-hw * 0.25, hh * 0.6);
        g.moveTo(0, 0);
        g.lineTo(hw * 0.5, hh * 0.45);
      }
      g.strokePath();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.cutRope();
    try {
      this.scene.matter.world.remove(this.body);
    } catch {
      // Already removed
    }
    this.graphics.destroy();
    this.ropeGraphics?.destroy();
  }
}
