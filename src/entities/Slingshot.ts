import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';
import { clampDragVector, computeTrajectoryPoints } from '../utils/PhysicsRules';

/**
 * Slingshot manages the gothic wooden crossbow launcher, elastic rubber bands,
 * upcoming sprite-backed vampire queue beside the launcher, and trajectory dots.
 */
export class Slingshot {
  private scene: Phaser.Scene;
  private backGraphics: Phaser.GameObjects.Graphics;
  private frontGraphics: Phaser.GameObjects.Graphics;
  private loadedSprite: Phaser.GameObjects.Image;
  private shieldGfx: Phaser.GameObjects.Graphics;
  private queueSprites: Phaser.GameObjects.Image[] = [];

  public isDragging = false;
  public pullX: number = GameConfig.SLINGSHOT_X;
  public pullY: number = GameConfig.SLINGSHOT_Y;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.backGraphics = scene.add.graphics().setDepth(19);
    this.loadedSprite = scene.add.image(GameConfig.SLINGSHOT_X, GameConfig.SLINGSHOT_Y, 'vamp_dracula').setDepth(24);
    this.shieldGfx = scene.add.graphics().setDepth(24.5);
    this.frontGraphics = scene.add.graphics().setDepth(27);

    for (let i = 0; i < 6; i++) {
      this.queueSprites.push(scene.add.image(0, 0, 'vamp_dracula').setDepth(20));
    }
  }

  startDrag(): void {
    this.isDragging = true;
    this.pullX = GameConfig.SLINGSHOT_X;
    this.pullY = GameConfig.SLINGSHOT_Y;
  }

  updateDrag(worldX: number, worldY: number): { vx: number; vy: number; powerRatio: number } {
    const dx = worldX - GameConfig.SLINGSHOT_X;
    const dy = worldY - GameConfig.SLINGSHOT_Y;
    const clamped = clampDragVector(dx, dy);
    this.pullX = GameConfig.SLINGSHOT_X + clamped.clampedDx;
    this.pullY = Math.min(GameConfig.GROUND_Y - 26, GameConfig.SLINGSHOT_Y + clamped.clampedDy);
    return { vx: clamped.vx, vy: clamped.vy, powerRatio: clamped.powerRatio };
  }

  releaseDrag(): { vx: number; vy: number; validShot: boolean } {
    this.isDragging = false;
    const dx = this.pullX - GameConfig.SLINGSHOT_X;
    const dy = this.pullY - GameConfig.SLINGSHOT_Y;
    const clamped = clampDragVector(dx, dy);
    const validShot = Math.hypot(dx, dy) > 18 && clamped.vx > 0.6;
    this.pullX = GameConfig.SLINGSHOT_X;
    this.pullY = GameConfig.SLINGSHOT_Y;
    return { vx: clamped.vx, vy: clamped.vy, validShot };
  }

  cancelDrag(): void {
    this.isDragging = false;
    this.pullX = GameConfig.SLINGSHOT_X;
    this.pullY = GameConfig.SLINGSHOT_Y;
  }

  render(
    loadedType: VampireTypeId | null,
    queue: VampireTypeId[],
    showTrajectory: boolean,
    skinTint: number,
    hasLaunchShield: boolean,
    forceHintArc = false
  ): void {
    const ax = GameConfig.SLINGSHOT_X;
    const ay = GameConfig.SLINGSHOT_Y;
    const gy = GameConfig.GROUND_Y;

    // Queue waiting beside the launcher with idle hop animation
    for (let i = 0; i < this.queueSprites.length; i++) {
      const qImg = this.queueSprites[i];
      if (i < queue.length) {
        const vt = queue[i];
        const texKey = this.scene.textures.exists(`vamp_${vt}`) ? `vamp_${vt}` : 'vamp_dracula';
        const bob = Math.sin(this.scene.time.now * 0.0045 + i * 1.1) * 3;
        const baseScale = (VAMPIRE_TYPES[vt].radius * 1.8) / 96;
        qImg.setVisible(true);
        qImg.setTexture(texKey);
        qImg.setPosition(ax - 70 - i * 44, gy - 20 + bob);
        qImg.setScale(baseScale);
        if (skinTint !== 0xffffff) qImg.setTint(skinTint);
        else qImg.clearTint();
      } else {
        qImg.setVisible(false);
      }
    }

    const bx = this.isDragging ? this.pullX : ax;
    const by = this.isDragging ? this.pullY : ay;

    // Back crossbow frame & rear elastic band
    this.backGraphics.clear();
    this.backGraphics.fillStyle(0x334155, 1);
    this.backGraphics.lineStyle(2.5, 0x0f172a, 1);
    this.backGraphics.fillRect(ax - 28, gy - 22, 56, 22);
    this.backGraphics.strokeRect(ax - 28, gy - 22, 56, 22);

    this.backGraphics.fillStyle(0x4a2b18, 1);
    this.backGraphics.fillRect(ax - 11, ay + 16, 22, gy - (ay + 36));
    this.backGraphics.strokeRect(ax - 11, ay + 16, 22, gy - (ay + 36));

    // Rear fork arm
    this.backGraphics.fillTriangle(ax + 4, ay + 24, ax + 26, ay - 12, ax + 14, ay + 34);
    if (loadedType) {
      this.backGraphics.lineStyle(5, 0x991b1b, 1);
      this.backGraphics.lineBetween(ax + 24, ay - 6, bx, by);
    }

    // Loaded vampire sprite in pouch with aim-squash feedback
    this.shieldGfx.clear();
    if (loadedType) {
      const texKey = this.scene.textures.exists(`vamp_${loadedType}`) ? `vamp_${loadedType}` : 'vamp_dracula';
      const meta = VAMPIRE_TYPES[loadedType];
      const baseScale = (meta.radius * 2.35) / 96;
      const dragDist = Math.hypot(bx - ax, by - ay);
      const aimStretch = this.isDragging ? Math.min(0.18, (dragDist / GameConfig.MAX_DRAG_RADIUS) * 0.18) : 0;

      this.loadedSprite.setVisible(true);
      this.loadedSprite.setTexture(texKey);
      this.loadedSprite.setPosition(bx, by);
      this.loadedSprite.setScale(baseScale * (1 + aimStretch), baseScale * (1 - aimStretch * 0.6));
      if (skinTint !== 0xffffff) this.loadedSprite.setTint(skinTint);
      else this.loadedSprite.clearTint();

      if (hasLaunchShield) {
        this.shieldGfx.lineStyle(2.5, 0x38bdf8, 0.9);
        this.shieldGfx.strokeCircle(bx, by, meta.radius * 1.4);
      }
    } else {
      this.loadedSprite.setVisible(false);
    }

    // Front rubber band, front fork arm, & trajectory preview dots
    this.frontGraphics.clear();
    if (loadedType) {
      this.frontGraphics.lineStyle(5, 0xdc2626, 1);
      this.frontGraphics.lineBetween(ax - 24, ay - 6, bx, by);
    }

    this.frontGraphics.fillStyle(0x5c361e, 1);
    this.frontGraphics.lineStyle(2.5, 0x0f172a, 1);
    this.frontGraphics.fillTriangle(ax - 4, ay + 24, ax - 26, ay - 12, ax - 14, ay + 34);
    this.frontGraphics.fillStyle(0x64748b, 1);
    this.frontGraphics.fillCircle(ax - 24, ay - 8, 5);

    if (this.isDragging && (showTrajectory || forceHintArc) && loadedType) {
      const clamped = clampDragVector(bx - ax, by - ay);
      if (Math.hypot(bx - ax, by - ay) > 18) {
        const gStepY = GameConfig.GRAVITY_Y * 0.001 * GameConfig.FIXED_TIMESTEP_MS * GameConfig.FIXED_TIMESTEP_MS;
        const dotCount = forceHintArc ? 26 : 13;
        const pts = computeTrajectoryPoints(bx, by, clamped.vx, clamped.vy, gStepY, dotCount, 3);
        pts.forEach((pt, idx) => {
          const alpha = Math.max(0.2, 0.9 - idx * (forceHintArc ? 0.025 : 0.055));
          this.frontGraphics.fillStyle(forceHintArc ? 0xfbbf24 : 0xf8fafc, alpha);
          this.frontGraphics.lineStyle(1.5, 0x090b10, alpha);
          const rad = Math.max(2.5, 5.2 - idx * 0.14);
          this.frontGraphics.fillCircle(pt.x, pt.y, rad);
          this.frontGraphics.strokeCircle(pt.x, pt.y, rad);
        });
      }
    }
  }

  destroy(): void {
    this.backGraphics.destroy();
    this.frontGraphics.destroy();
    this.loadedSprite.destroy();
    this.shieldGfx.destroy();
    this.queueSprites.forEach((s) => s.destroy());
    this.queueSprites = [];
  }
}
