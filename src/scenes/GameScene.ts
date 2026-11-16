import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { LevelBlueprint } from '../data/HandcraftedLevels';
import { MATERIAL_CONFIG } from '../data/MaterialConfig';
import { VAMPIRE_SKINS, VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';
import { getWorldForLevel, WorldTheme } from '../data/WorldConfig';
import { ZOMBIE_TYPES } from '../data/ZombieTypes';
import { BlockEntity } from '../entities/BlockEntity';
import { Slingshot } from '../entities/Slingshot';
import { VampireEntity } from '../entities/VampireEntity';
import { ZombieEntity } from '../entities/ZombieEntity';
import { AudioManager } from '../systems/AudioManager';
import { DeviceScaler } from '../systems/DeviceScaler';
import { LevelGenerator } from '../systems/LevelGenerator';
import { ParticleSystem } from '../systems/ParticleSystem';
import { SaveManager } from '../systems/SaveManager';
import { SmokeSystem } from '../systems/SmokeSystem';
import { TornadoSystem } from '../systems/TornadoSystem';
import {
  calculateComboMultiplier,
  calculateImpactDamage,
  calculateStarRating,
  computeBlastEffect,
  evaluateMatchOutcome,
} from '../utils/PhysicsRules';
import { TransitionHelper } from '../utils/TransitionHelper';
import { UiDomHelper } from '../utils/UiDomHelper';
import { WorldBackdrop } from '../utils/WorldBackdrop';

export interface HudSnapshot {
  levelId: number;
  levelName: string;
  levelSubtitle: string;
  worldId: number;
  worldName: string;
  weatherLabel: string;
  score: number;
  vampiresRemaining: number;
  loadedVampire: VampireTypeId | null;
  activeAbilityLabel: string | null;
  zombiesRemaining: number;
  totalZombies: number;
  isBossLevel: boolean;
  specialHazard: string;
  forceHintArc: boolean;
  biggerBlastActive: boolean;
  nextLaunchShield: boolean;
  trialUsed: boolean;
  canTapAbility: boolean;
  isLookAround: boolean;
  highlightPractice: boolean;
}

/**
 * GameScene orchestrates the Matter.js physics puzzle arena, slingshot aiming,
 * camera tracking & pan/pinch, 9 vampire abilities (including Smoke, Bat Tornado,
 * Ice Freeze, Chain Lightning, and Blood Pool Vortex), zombie hunger & Screamer behavior,
 * and win/loss evaluation.
 */
export class GameScene extends Phaser.Scene {
  public levelId = 1;
  public blueprint!: LevelBlueprint;
  public worldTheme!: WorldTheme;
  public worldLoopCycle = 0;

  private backdrop: WorldBackdrop | null = null;
  private particles: ParticleSystem | null = null;
  private smokeSystem: SmokeSystem | null = null;
  private tornadoSystem: TornadoSystem | null = null;
  private slingshot: Slingshot | null = null;
  private lightningGfx: Phaser.GameObjects.Graphics | null = null;
  private hazardGfx: Phaser.GameObjects.Graphics | null = null;

  private blocks: BlockEntity[] = [];
  private zombies: ZombieEntity[] = [];
  private activeVampires: VampireEntity[] = [];
  private vampireQueue: VampireTypeId[] = [];
  private loadedVampire: VampireTypeId | null = null;

  private score = 0;
  private killsTotal = 0;
  private bossKilled = false;
  private killsInShot = 0;
  private maxComboInLevel = 0;

  private paused = false;
  private matchEnded = false;
  private settleGraceTimer = 0;
  private turnTimer = 0;
  private settledMs = 0;
  private hazardTimer = 0;
  private windStrength = 0;

  private forceHintArc = false;
  private biggerBlastActive = false;
  private nextLaunchShield = false;
  private trialVampireUsed = false;
  private reviveUsed = false;

  // Camera panning & pinch state
  private isPanning = false;
  private panStartX = 0;
  private camStartScrollX = 0;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private camReturnPending = false;
  private isLookAround = false;
  private highlightPractice = false;
  private hitstopTimer = 0;
  private slowMoTimer = 0;

  private collisionHandler: ((event: Phaser.Physics.Matter.Events.CollisionStartEvent) => void) | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private bgListener: (() => void) | null = null;
  private lastWorldSeen = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { levelId?: number; highlightPractice?: boolean }): void {
    this.levelId = Math.max(1, Math.floor(data?.levelId ?? SaveManager.getInstance().getState().currentLevel ?? 1));
    this.score = 0;
    this.killsTotal = 0;
    this.bossKilled = false;
    this.killsInShot = 0;
    this.maxComboInLevel = 0;
    this.paused = false;
    this.matchEnded = false;
    this.settleGraceTimer = GameConfig.INITIAL_SETTLE_GRACE_SEC;
    this.turnTimer = 0;
    this.settledMs = 0;
    this.hazardTimer = 0;
    this.windStrength = 0;
    this.forceHintArc = false;
    this.biggerBlastActive = false;
    this.nextLaunchShield = false;
    this.trialVampireUsed = false;
    this.reviveUsed = false;
    this.isPanning = false;
    this.camReturnPending = false;
    this.isLookAround = false;
    this.highlightPractice = Boolean(data?.highlightPractice);
    this.hitstopTimer = 0;
    this.slowMoTimer = 0;
    this.blocks = [];
    this.zombies = [];
    this.activeVampires = [];
    this.vampireQueue = [];
    this.loadedVampire = null;
  }

  create(): void {
    const save = SaveManager.getInstance();
    const { world, localLevel, loopCycle, difficultyMultiplier } = getWorldForLevel(this.levelId);
    this.worldTheme = world;
    this.worldLoopCycle = loopCycle;
    this.blueprint = LevelGenerator.getLevel(this.levelId);

    save.setCurrentLevel(this.levelId);
    save.setSelectedWorld(world.id);
    AudioManager.getInstance().setWorldTheme(world, Boolean(this.blueprint.isBoss));

    // Configure Matter world boundaries and solid ground
    this.matter.world.setGravity(0, GameConfig.GRAVITY_Y);
    this.matter.world.engine.timing.timeScale = 1;
    this.matter.world.setBounds(
      GameConfig.WORLD_BOUNDS_MIN_X,
      -500,
      GameConfig.WORLD_BOUNDS_MAX_X - GameConfig.WORLD_BOUNDS_MIN_X,
      GameConfig.WORLD_BOUNDS_MAX_Y + 500,
      64,
      true,
      true,
      false,
      true
    );

    this.matter.add.rectangle(1000, GameConfig.GROUND_Y + 80, 3400, 160, {
      isStatic: true,
      friction: world.specialHazard === 'slippery_ice' ? 0.12 : 0.9,
      restitution: 0.15,
      label: 'ground',
    });

    // Visual & special combat systems
    const quality = save.getSettings().graphicsQuality;
    this.backdrop = new WorldBackdrop(this, world, quality);
    this.particles = new ParticleSystem(this, quality);
    this.smokeSystem = new SmokeSystem(this);
    this.tornadoSystem = new TornadoSystem(this);
    this.slingshot = new Slingshot(this);
    this.lightningGfx = this.add.graphics().setDepth(44);
    this.hazardGfx = this.add.graphics().setDepth(35);

    // Build structure blocks & zombies
    const isSlippery = world.specialHazard === 'slippery_ice';
    for (const bp of this.blueprint.blocks) {
      this.blocks.push(new BlockEntity(this, bp, isSlippery));
    }
    for (const zp of this.blueprint.zombies) {
      this.zombies.push(new ZombieEntity(this, zp, difficultyMultiplier));
    }

    // Build vampire queue
    this.vampireQueue = [...this.blueprint.vampires];
    this.loadNextVampire();

    // Camera setup
    const cam = this.cameras.main;
    cam.setBounds(-180, -140, 2160, 1080);
    cam.setZoom(1);
    cam.scrollX = 0;
    cam.scrollY = 0;

    this.bindInput();
    this.bindCollisions();

    UiDomHelper.setBodyState('playing');
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    this.scene.launch('UIScene', { gameScene: this });

    if (localLevel === 1 || this.lastWorldSeen !== world.id) {
      this.lastWorldSeen = world.id;
      this.time.delayedCall(120, () => {
        if (!this.scene.isActive()) return;
        this.events.emit('world-banner', {
          worldId: world.id,
          name: world.name,
          subtitle: world.subtitle,
          loopCycle,
        });
      });
    }

    // First-time Zombie Bestiary callout for newly introduced zombie archetypes (Stage 2+)
    if (this.levelId >= 2) {
      this.time.delayedCall(520, () => {
        if (!this.scene.isActive() || this.matchEnded) return;
        for (const zp of this.blueprint.zombies) {
          if (zp.type === 'normal') {
            save.markZombieIntroSeen('normal');
            continue;
          }
          if (save.markZombieIntroSeen(zp.type)) {
            const zMeta = ZOMBIE_TYPES[zp.type];
            this.events.emit('zombie-intro', zMeta);
            break;
          }
        }
      });
    } else {
      save.markZombieIntroSeen('normal');
    }

    if (this.highlightPractice) {
      this.time.delayedCall(260, () => {
        if (this.scene.isActive()) {
          this.events.emit('practice-highlight', this.loadedVampire);
        }
      });
    }

    DeviceScaler.getInstance().setBackHandler(() => {
      if (!this.matchEnded && !this.paused) {
        this.setPaused(true);
        this.events.emit('open-pause-modal');
      } else if (this.paused) {
        this.events.emit('toggle-pause-key');
      }
    });

    this.bgListener = () => {
      if (!this.paused && !this.matchEnded) {
        this.setPaused(true);
        this.events.emit('open-pause-modal');
      }
    };
    this.game.events.on('app:background', this.bgListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private getSkinTint(): number {
    const skinId = SaveManager.getInstance().getState().equippedSkin;
    return VAMPIRE_SKINS.find((s) => s.id === skinId)?.tint ?? 0xffffff;
  }

  private loadNextVampire(): void {
    if (this.loadedVampire || this.vampireQueue.length === 0) return;
    this.loadedVampire = this.vampireQueue.shift() ?? null;
    if (this.loadedVampire) {
      const isNew = SaveManager.getInstance().markVampireIntroSeen(this.loadedVampire);
      if (isNew) {
        this.events.emit('vampire-intro', this.loadedVampire);
      }
    }
    this.emitHudUpdate();
  }

  private bindInput(): void {
    this.input.addPointer(1);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.matchEnded) return;
      AudioManager.getInstance().unlock();

      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.slingshot?.cancelDrag();
        this.isPanning = false;
        this.pinchStartDist = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y
        );
        this.pinchStartZoom = this.cameras.main.zoom;
        return;
      }

      const abilityTarget = this.activeVampires.find((v) => v.canUseAbility);
      if (abilityTarget) {
        this.activateVampireAbility(abilityTarget);
        return;
      }

      const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const distToSling = Math.hypot(
        worldPt.x - GameConfig.SLINGSHOT_X,
        worldPt.y - GameConfig.SLINGSHOT_Y
      );

      if (this.loadedVampire && this.activeVampires.length === 0 && distToSling <= 130) {
        if (this.isLookAround) {
          this.isLookAround = false;
          this.tweens.killTweensOf(this.cameras.main);
          this.cameras.main.setZoom(1);
          this.cameras.main.scrollX = 0;
          this.emitHudUpdate();
        }
        this.slingshot?.startDrag();
        this.camReturnPending = false;
      } else {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.camStartScrollX = this.cameras.main.scrollX;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.matchEnded) return;

      if (this.input.pointer1.isDown && this.input.pointer2.isDown && this.pinchStartDist > 0) {
        const dist = Phaser.Math.Distance.Between(
          this.input.pointer1.x,
          this.input.pointer1.y,
          this.input.pointer2.x,
          this.input.pointer2.y
        );
        const nextZoom = Phaser.Math.Clamp(this.pinchStartZoom * (dist / this.pinchStartDist), 0.75, 1.25);
        this.cameras.main.setZoom(nextZoom);
        return;
      }

      if (this.slingshot?.isDragging) {
        const worldPt = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const res = this.slingshot.updateDrag(worldPt.x, worldPt.y);
        if (res.powerRatio > 0.15) {
          AudioManager.getInstance().playStretch(res.powerRatio);
        }
      } else if (this.isPanning && pointer.isDown) {
        const dx = (this.panStartX - pointer.x) / this.cameras.main.zoom;
        this.cameras.main.scrollX = Phaser.Math.Clamp(this.camStartScrollX + dx, -120, 420);
      }
    });

    this.input.on('pointerup', () => {
      this.pinchStartDist = 0;
      if (this.isPanning) {
        this.isPanning = false;
      }
      if (!this.slingshot?.isDragging) return;

      const release = this.slingshot.releaseDrag();
      if (release.validShot && this.loadedVampire && !this.paused && !this.matchEnded) {
        this.launchLoadedVampire(release.vx, release.vy);
      }
    });

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _gx: unknown, _gy: unknown, deltaY: number) => {
      const next = Phaser.Math.Clamp(this.cameras.main.zoom - deltaY * 0.0008, 0.78, 1.25);
      this.cameras.main.setZoom(next);
    });

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === ' ' && !this.paused && !this.matchEnded) {
        const abilityTarget = this.activeVampires.find((v) => v.canUseAbility);
        if (abilityTarget) {
          e.preventDefault();
          this.activateVampireAbility(abilityTarget);
        }
      } else if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && !this.matchEnded) {
        this.events.emit('toggle-pause-key');
      } else if ((e.key === 'r' || e.key === 'R') && !this.matchEnded && !this.paused) {
        this.restartLevel();
      } else if (e.key === '`') {
        this.events.emit('toggle-debug');
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);
  }

  private launchLoadedVampire(vx: number, vy: number): void {
    if (!this.loadedVampire) return;
    const type = this.loadedVampire;
    this.loadedVampire = null;
    this.killsInShot = 0;
    this.turnTimer = 0;
    this.settledMs = 0;
    this.camReturnPending = false;

    const vamp = new VampireEntity(
      this,
      type,
      GameConfig.SLINGSHOT_X,
      GameConfig.SLINGSHOT_Y,
      this.getSkinTint(),
      false,
      this.nextLaunchShield
    );
    this.nextLaunchShield = false;
    this.forceHintArc = false;

    this.matter.body.setVelocity(vamp.body, { x: vx, y: vy });
    this.activeVampires.push(vamp);

    AudioManager.getInstance().playLaunch();
    if (Math.random() < 0.35) {
      AudioManager.getInstance().playVampireLaugh();
    }
    this.particles?.emitBurst(GameConfig.SLINGSHOT_X, GameConfig.SLINGSHOT_Y, 10, {
      colors: [VAMPIRE_TYPES[type].color, 0xf8fafc],
      speedMin: 1,
      speedMax: 4,
      maxLife: 0.4,
    });

    this.emitHudUpdate();
  }

  triggerAbilityFromHud(): void {
    if (this.paused || this.matchEnded) return;
    const target = this.activeVampires.find((v) => v.canUseAbility);
    if (target) this.activateVampireAbility(target);
  }

  private spawnShockwaveRing(x: number, y: number, color: number, maxRadius: number): void {
    const ring = this.add.circle(x, y, 16, color, 0).setStrokeStyle(5, color, 0.9).setDepth(43);
    this.tweens.add({
      targets: ring,
      scale: maxRadius / 16,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  private activateVampireAbility(vamp: VampireEntity): void {
    if (!vamp.canUseAbility) return;
    vamp.abilityUsed = true;
    const pos = vamp.body.position;
    const vel = vamp.body.velocity;

    AudioManager.getInstance().playAbility(vamp.type);

    if (vamp.type === 'bat') {
      const offsets = [-3.4, 3.4];
      for (const dy of offsets) {
        const clone = new VampireEntity(this, 'bat', pos.x, pos.y + dy * 4, this.getSkinTint(), true);
        clone.abilityUsed = true;
        this.matter.body.setVelocity(clone.body, {
          x: Math.max(8, vel.x * 1.05),
          y: vel.y + dy,
        });
        this.activeVampires.push(clone);
      }
      this.particles?.emitBurst(pos.x, pos.y, 16, {
        colors: [0x6d28d9, 0xc084fc],
        speedMin: 2,
        speedMax: 6,
      });
    } else if (vamp.type === 'speed') {
      this.matter.body.setVelocity(vamp.body, {
        x: Math.min(GameConfig.MAX_BODY_VELOCITY, Math.max(14, vel.x * 1.85 + 9)),
        y: vel.y * 0.35,
      });
      this.particles?.emitBurst(pos.x, pos.y, 18, {
        colors: [0x38bdf8, 0xe0f2fe],
        speedMin: 3,
        speedMax: 8,
      });
    } else if (vamp.type === 'bomb') {
      vamp.armedBomb = true;
      vamp.redraw();
      if (Math.hypot(vel.x, vel.y) < 4.5) {
        this.triggerExplosion(pos.x, pos.y, true);
      } else {
        this.particles?.spawnScorePopup(pos.x, pos.y - 26, 'ARMED!', '#fb923c', 0.9);
      }
    } else if (vamp.type === 'storm') {
      this.tornadoSystem?.spawnBatTornado(pos.x, pos.y);
      this.spawnShockwaveRing(pos.x, pos.y, 0xa855f7, 175);
      this.particles?.spawnScorePopup(pos.x, pos.y - 32, 'BAT TORNADO!', '#c084fc', 1.0);
    } else if (vamp.type === 'mage') {
      this.tornadoSystem?.spawnBloodVortex(pos.x, pos.y);
      this.spawnShockwaveRing(pos.x, pos.y, 0xe11d48, 150);
      this.particles?.spawnScorePopup(pos.x, pos.y - 32, 'BLOOD VORTEX!', '#fb7185', 1.0);
    } else if (vamp.type === 'shadow') {
      this.matter.body.setVelocity(vamp.body, {
        x: vel.x * 0.15,
        y: 23,
      });
      this.particles?.emitBurst(pos.x, pos.y, 16, {
        colors: [0x0f172a, 0xf43f5e],
        speedMin: 2,
        speedMax: 6,
      });
    } else if (vamp.type === 'ice') {
      this.particles?.emitBurst(pos.x, pos.y, 26, {
        colors: [0x38bdf8, 0xe0f2fe, 0x7dd3fc],
        speedMin: 2.5,
        speedMax: 7.5,
      });
      this.spawnShockwaveRing(pos.x, pos.y, 0x7dd3fc, GameConfig.ICE_FREEZE_RADIUS);
      const radius = GameConfig.ICE_FREEZE_RADIUS;
      for (const b of [...this.blocks]) {
        if (b.destroyed || b.material === 'spike') continue;
        const d = Math.hypot(b.body.position.x - pos.x, b.body.position.y - pos.y);
        if (d <= radius) {
          b.freeze();
          if (b.material === 'glass' || b.material === 'ice' || d <= radius * 0.65) {
            this.damageBlock(b, 35);
          }
        }
      }
      for (const z of [...this.zombies]) {
        if (z.dead) continue;
        if (Math.hypot(z.body.position.x - pos.x, z.body.position.y - pos.y) <= radius) {
          z.freeze();
        }
      }
      this.particles?.spawnScorePopup(pos.x, pos.y - 28, 'FROST!', '#7dd3fc', 0.95);
    } else if (vamp.type === 'thunder') {
      const candidates = this.zombies
        .filter((z) => !z.dead)
        .map((z) => ({ z, dist: Math.hypot(z.body.position.x - pos.x, z.body.position.y - pos.y) }))
        .filter((entry) => entry.dist <= GameConfig.THUNDER_CHAIN_RADIUS)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, GameConfig.THUNDER_CHAIN_COUNT);

      if (this.lightningGfx) {
        this.lightningGfx.clear();
        this.lightningGfx.lineStyle(4, 0xfef08a, 1);
        let prevX = pos.x;
        let prevY = pos.y;
        for (const { z } of candidates) {
          const zx = z.body.position.x;
          const zy = z.body.position.y;
          const midX = (prevX + zx) / 2 + (Math.random() - 0.5) * 32;
          const midY = (prevY + zy) / 2 - 18;
          this.lightningGfx.beginPath();
          this.lightningGfx.moveTo(prevX, prevY);
          this.lightningGfx.lineTo(midX, midY);
          this.lightningGfx.lineTo(zx, zy);
          this.lightningGfx.strokePath();
          this.damageZombie(z, GameConfig.THUNDER_DAMAGE, false);
          prevX = zx;
          prevY = zy;
        }
        this.time.delayedCall(190, () => this.lightningGfx?.clear());
      }
      this.particles?.emitBurst(pos.x, pos.y, 18, {
        colors: [0xfef08a, 0xfacc15, 0x38bdf8],
        speedMin: 3,
        speedMax: 8,
      });
    }

    this.emitHudUpdate();
  }

  private bindCollisions(): void {
    this.collisionHandler = (event) => {
      if (this.settleGraceTimer > 0 || this.matchEnded) return;

      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        const relVx = bodyA.velocity.x - bodyB.velocity.x;
        const relVy = bodyA.velocity.y - bodyB.velocity.y;
        const relSpeed = Math.hypot(relVx, relVy);

        const entA = (bodyA as unknown as { entityRef?: unknown }).entityRef;
        const entB = (bodyB as unknown as { entityRef?: unknown }).entityRef;

        if (entA instanceof VampireEntity && relSpeed > 2) entA.triggerImpactSquash();
        if (entB instanceof VampireEntity && relSpeed > 2) entB.triggerImpactSquash();

        // Armed Blast Baron detonates with explosion + lingering black smoke
        if (entA instanceof VampireEntity && entA.armedBomb) {
          entA.armedBomb = false;
          this.triggerExplosion(bodyA.position.x, bodyA.position.y, true);
        }
        if (entB instanceof VampireEntity && entB.armedBomb) {
          entB.armedBomb = false;
          this.triggerExplosion(bodyB.position.x, bodyB.position.y, true);
        }

        // Shadow Drop creates heavy ground shockwave slam when hitting quickly
        if (entA instanceof VampireEntity && entA.type === 'shadow' && entA.abilityUsed && relSpeed > 10) {
          this.spawnShockwaveRing(bodyA.position.x, bodyA.position.y, 0xf43f5e, 140);
          entA.abilityUsed = false;
        }
        if (entB instanceof VampireEntity && entB.type === 'shadow' && entB.abilityUsed && relSpeed > 10) {
          this.spawnShockwaveRing(bodyB.position.x, bodyB.position.y, 0xf43f5e, 140);
          entB.abilityUsed = false;
        }

        // Spike trap hazard check
        if (entA instanceof BlockEntity && entA.material === 'spike' && entB instanceof ZombieEntity) {
          this.damageZombie(entB, 140, false);
        } else if (entB instanceof BlockEntity && entB.material === 'spike' && entA instanceof ZombieEntity) {
          this.damageZombie(entA, 140, false);
        }

        if (relSpeed < GameConfig.MIN_IMPACT_SPEED) continue;

        this.processImpact(entA, bodyA, bodyB, relSpeed);
        this.processImpact(entB, bodyB, bodyA, relSpeed);
      }
    };

    this.matter.world.on('collisionstart', this.collisionHandler);
  }

  private processImpact(
    target: unknown,
    targetBody: MatterJS.BodyType,
    otherBody: MatterJS.BodyType,
    relSpeed: number
  ): void {
    const otherEnt = (otherBody as unknown as { entityRef?: unknown }).entityRef;
    let massFactor = otherBody.isStatic ? 1.1 : Math.min(2.4, Math.max(0.7, otherBody.mass / 3.5));
    if (otherEnt instanceof VampireEntity) {
      massFactor = otherEnt.hasShield ? 1.75 : otherEnt.type === 'dracula' || otherEnt.type === 'shadow' ? 1.45 : 1.25;
      if (otherEnt.hasShield) {
        otherEnt.hasShield = false;
        otherEnt.redraw();
      }
    }

    if (target instanceof BlockEntity && !target.destroyed) {
      const dmg = calculateImpactDamage(relSpeed, massFactor, target.hardness);
      if (dmg > 0) this.damageBlock(target, dmg);
    } else if (target instanceof ZombieEntity && !target.dead) {
      const impactFromLeft = otherBody.position.x < targetBody.position.x - target.radius * 0.25;
      const dmg = calculateImpactDamage(relSpeed, massFactor, 1.0);
      if (dmg > 0) this.damageZombie(target, dmg, impactFromLeft);
    }
  }

  private damageBlock(block: BlockEntity, amount: number): void {
    if (block.destroyed) return;
    const destroyed = block.applyDamage(amount);
    if (!destroyed) {
      if (amount > 16) {
        AudioManager.getInstance().playBreak(block.material, 0.45);
      }
      return;
    }

    const bx = block.body.position.x;
    const by = block.body.position.y;
    const wasExplosive = block.isExplosive;
    const mat = block.material;
    const pts = block.points;

    block.destroy();
    this.blocks = this.blocks.filter((b) => !b.destroyed);

    this.addScore(pts, bx, by, '#cbd5e1');
    AudioManager.getInstance().playBreak(mat, 1);

    const color = MATERIAL_CONFIG[mat].color;
    this.particles?.emitBurst(bx, by, mat === 'glass' || mat === 'ice' ? 16 : 12, {
      colors: [color, MATERIAL_CONFIG[mat].strokeColor],
      texture: 'particle_shard',
      speedMin: 2,
      speedMax: 7,
    });

    if (wasExplosive) {
      this.triggerExplosion(bx, by, false);
    }
  }

  private damageZombie(zombie: ZombieEntity, amount: number, impactFromLeft: boolean): void {
    if (zombie.dead) return;
    const died = zombie.applyDamage(amount, impactFromLeft);
    const zx = zombie.body.position.x;
    const zy = zombie.body.position.y;

    if (!died) {
      if (amount > 14) {
        AudioManager.getInstance().playZombieGroan(false);
      }
      return;
    }

    zombie.destroy(true);
    this.zombies = this.zombies.filter((z) => !z.dead);

    this.killsTotal += 1;
    this.killsInShot += 1;
    this.maxComboInLevel = Math.max(this.maxComboInLevel, this.killsInShot);
    if (zombie.type === 'boss') {
      this.bossKilled = true;
    }

    const mult = calculateComboMultiplier(this.killsInShot);
    const pts = Math.round(zombie.points * mult);
    this.addScore(pts, zx, zy - 12, mult > 1 ? '#fbbf24' : '#86efac', mult > 1 ? 1.15 : 1);

    AudioManager.getInstance().playZombieDeath();
    this.particles?.emitBurst(zx, zy, zombie.type === 'boss' ? 38 : 22, {
      colors: [0x4ade80, 0x22c55e, 0x166534],
      speedMin: 2.2,
      speedMax: 7.5,
      maxLife: 0.8,
    });

    if (zombie.type === 'boss' || this.killsInShot >= 2) {
      this.hitstopTimer = GameConfig.HITSTOP_SEC;
      this.matter.world.engine.timing.timeScale = 0.05;
    }

    if (this.zombies.length === 0 && !this.matchEnded) {
      this.slowMoTimer = 0.48;
      this.hitstopTimer = 0;
      this.matter.world.engine.timing.timeScale = 0.38;
    }

    this.emitHudUpdate();
  }

  private triggerExplosion(x: number, y: number, isVampireBomb: boolean): void {
    const blastMult = this.biggerBlastActive ? 1.38 : 1.0;
    const radius = GameConfig.EXPLOSION_RADIUS * blastMult * (isVampireBomb ? 1.12 : 1.0);
    const maxDmg = GameConfig.EXPLOSION_DAMAGE * blastMult;
    const maxForce = GameConfig.EXPLOSION_FORCE * blastMult;

    AudioManager.getInstance().playExplosion();
    this.cameras.main.shake(220, 0.011);
    this.spawnShockwaveRing(x, y, 0xf97316, radius);
    if (isVampireBomb && this.slowMoTimer <= 0) {
      this.hitstopTimer = GameConfig.HITSTOP_SEC;
      this.matter.world.engine.timing.timeScale = 0.05;
    }

    this.particles?.emitBurst(x, y, 32, {
      colors: [0xf97316, 0xfacc15, 0xef4444, 0x1e293b],
      speedMin: 3,
      speedMax: 10,
      scaleMin: 0.45,
      scaleMax: 1.3,
      maxLife: 0.75,
    });

    if (isVampireBomb) {
      // Blast Baron leaves lingering Black Smoke cloud that weakens nearby blocks & zombies
      this.smokeSystem?.spawnCloud(x, y, GameConfig.SMOKE_RADIUS * blastMult);
    }

    for (const b of [...this.blocks]) {
      if (b.destroyed || b.material === 'spike') continue;
      const res = computeBlastEffect(x, y, b.body.position.x, b.body.position.y, radius, maxDmg, maxForce);
      if (res.hit) {
        this.matter.body.applyForce(b.body, b.body.position, { x: res.fx, y: res.fy });
        this.damageBlock(b, res.damage);
      }
    }

    for (const z of [...this.zombies]) {
      if (z.dead) continue;
      const res = computeBlastEffect(x, y, z.body.position.x, z.body.position.y, radius, maxDmg, maxForce);
      if (res.hit) {
        this.matter.body.applyForce(z.body, z.body.position, { x: res.fx, y: res.fy });
        this.damageZombie(z, res.damage, false);
      }
    }
  }

  private addScore(points: number, x: number, y: number, color: string, scale = 1): void {
    this.score = Math.max(0, this.score + points);
    const prefix = points > 0 ? '+' : '';
    this.particles?.spawnScorePopup(x, y, `${prefix}${points}`, color, scale);
    this.emitHudUpdate();
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    DeviceScaler.getInstance().recordFrameFps(this.game.loop.actualFps || 60);
    this.backdrop?.update(dt);
    this.particles?.update(dt);

    if (this.paused) return;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      if (this.hitstopTimer <= 0) {
        this.matter.world.engine.timing.timeScale = this.slowMoTimer > 0 ? 0.38 : 1;
      }
    } else if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      if (this.slowMoTimer <= 0) {
        this.matter.world.engine.timing.timeScale = 1;
      }
    }

    if (this.settleGraceTimer > 0) {
      this.settleGraceTimer = Math.max(0, this.settleGraceTimer - dt);
    }

    // Update blocks & check hanging coffin ropes
    for (const b of [...this.blocks]) {
      b.update(dt);
      if (b.ropeAnchor && !b.ropeCut) {
        for (const v of this.activeVampires) {
          if (b.intersectsRope(v.body.position.x, v.body.position.y, v.radius)) {
            b.cutRope();
            AudioManager.getInstance().playBreak('wood', 0.6);
            this.particles?.spawnScorePopup(b.body.position.x, b.body.position.y - 30, 'ROPE CUT!', '#fde047', 0.9);
            break;
          }
        }
      }
    }

    // Update lingering Black Smoke & Bat Tornado / Blood Vortex force fields
    this.smokeSystem?.update(
      dt,
      this.blocks,
      this.zombies,
      (b, dmg) => this.damageBlock(b, dmg),
      (z, dmg) => this.damageZombie(z, dmg, false)
    );
    this.tornadoSystem?.update(dt, this.blocks, this.zombies, (z, dmg) => this.damageZombie(z, dmg, false));

    // Update zombies, Screamer sonic waves, & Thirsty-for-Blood Hunger behavior
    const allowZombieMove = this.settleGraceTimer <= 0 && !this.matchEnded;
    const primaryVamp = this.activeVampires[0] ?? null;
    const vampSnap = primaryVamp
      ? {
          x: primaryVamp.body.position.x,
          y: primaryVamp.body.position.y,
          vx: primaryVamp.body.velocity.x,
          vy: primaryVamp.body.velocity.y,
        }
      : null;

    for (const z of [...this.zombies]) {
      const ev = z.evaluateHungerAndAbilities(dt, allowZombieMove, vampSnap);
      if (ev.groan) {
        AudioManager.getInstance().playZombieGroan(true);
      }
      if (ev.shrieked && primaryVamp) {
        AudioManager.getInstance().playZombieShriek();
        this.spawnShockwaveRing(z.body.position.x, z.body.position.y, 0xc084fc, 130);
        this.matter.body.setVelocity(primaryVamp.body, {
          x: primaryVamp.body.velocity.x * 0.84,
          y: primaryVamp.body.velocity.y * 0.84,
        });
      }
      if (ev.bite && primaryVamp) {
        AudioManager.getInstance().playZombieGroan(true);
        if (primaryVamp.hasShield) {
          primaryVamp.hasShield = false;
          primaryVamp.redraw();
          this.particles?.spawnScorePopup(primaryVamp.body.position.x, primaryVamp.body.position.y - 24, 'SHIELD BITE!', '#38bdf8', 0.85);
        } else if (this.score >= 25) {
          const drain = Math.min(this.score, GameConfig.HUNGER_BONUS_DRAIN);
          this.addScore(-drain, z.body.position.x, z.body.position.y - 30, '#f87171', 0.85);
        }
      }

      z.update(dt, allowZombieMove);
      if (
        z.body.position.x < GameConfig.WORLD_BOUNDS_MIN_X - 40 ||
        z.body.position.x > GameConfig.WORLD_BOUNDS_MAX_X + 40 ||
        z.body.position.y > GameConfig.WORLD_BOUNDS_MAX_Y + 40
      ) {
        this.damageZombie(z, z.maxHp + 100, false);
      }
    }

    this.updateWorldHazards(dt);

    // Update active flying vampires & handle stuck/turn timeout
    if (this.activeVampires.length > 0) {
      this.turnTimer += dt;
      const lead = this.activeVampires[0];
      if (lead) {
        const targetScrollX = Phaser.Math.Clamp(lead.body.position.x - 520, -80, 420);
        this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, targetScrollX, 0.08);
      }

      const allStuckOrOffscreen = this.activeVampires.every((v) => {
        v.update(dt);
        if (this.worldTheme.specialHazard === 'wind_gust') {
          this.matter.body.applyForce(v.body, v.body.position, { x: this.windStrength * 0.00025, y: 0 });
        }
        const p = v.body.position;
        const off =
          p.x < GameConfig.WORLD_BOUNDS_MIN_X + 20 ||
          p.x > GameConfig.WORLD_BOUNDS_MAX_X - 20 ||
          p.y > GameConfig.GROUND_Y + 100;
        return off || v.stuckTimer >= GameConfig.STUCK_TIMEOUT_SEC;
      });

      if (allStuckOrOffscreen || this.turnTimer >= GameConfig.MAX_TURN_SEC) {
        for (const v of this.activeVampires) v.destroy();
        this.activeVampires = [];
        this.camReturnPending = true;
        this.loadNextVampire();
        this.emitHudUpdate();
      }
    } else if (this.camReturnPending && !this.isPanning) {
      this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, 0, 0.08);
      if (Math.abs(this.cameras.main.scrollX) < 3) {
        this.cameras.main.scrollX = 0;
        this.camReturnPending = false;
      }
    }

    this.slingshot?.render(
      this.loadedVampire,
      this.vampireQueue,
      SaveManager.getInstance().getSettings().showTrajectory,
      this.getSkinTint(),
      this.nextLaunchShield,
      this.forceHintArc
    );

    if (!this.matchEnded && this.settleGraceTimer <= 0) {
      const worldMoving =
        this.zombies.some((z) => Math.hypot(z.body.velocity.x, z.body.velocity.y) > 0.65) ||
        this.blocks.some((b) => !b.body.isStatic && Math.hypot(b.body.velocity.x, b.body.velocity.y) > 0.65);

      const effectBusy = Boolean(this.tornadoSystem?.hasActiveEffect);

      if (!worldMoving && this.activeVampires.length === 0 && !effectBusy) {
        this.settledMs += delta;
      } else if (this.zombies.length === 0) {
        this.settledMs += delta;
      } else {
        this.settledMs = 0;
      }

      const outcome = evaluateMatchOutcome({
        aliveZombies: this.zombies.length,
        activeVampireInFlight: this.activeVampires.length > 0 || effectBusy,
        queuedVampiresCount: this.vampireQueue.length + (this.loadedVampire ? 1 : 0),
        settledMs: this.settledMs,
      });

      if (outcome === 'won') {
        this.handleWin();
      } else if (outcome === 'lost') {
        this.handleLoss();
      }
    }
  }

  private updateWorldHazards(dt: number): void {
    this.hazardTimer += dt;
    const hazard = this.worldTheme.specialHazard;
    this.hazardGfx?.clear();

    if (hazard === 'wind_gust') {
      this.windStrength = Math.sin(this.hazardTimer * 0.9) * 1.4;
      if (this.hazardGfx && Math.abs(this.windStrength) > 0.5) {
        this.hazardGfx.lineStyle(2, 0xfde68a, 0.25);
        for (let i = 0; i < 4; i++) {
          const y = 200 + i * 110;
          const x = (this.hazardTimer * 240 + i * 320) % 1600;
          this.hazardGfx.lineBetween(x, y, x + this.windStrength * 36, y);
        }
      }
    } else if (hazard === 'falling_rocks' && this.hazardTimer > 11 && this.blocks.length < GameConfig.MAX_ACTIVE_BODIES - 5) {
      this.hazardTimer = 0;
      const dropX = 950 + Math.random() * 420;
      const rock = new BlockEntity(this, { x: dropX, y: 60, w: 34, h: 34, material: 'stone' }, false);
      this.blocks.push(rock);
    } else if (hazard === 'lightning_storm' && this.hazardTimer > 8.5) {
      this.hazardTimer = 0;
      this.cameras.main.flash(140, 180, 210, 255, false);
    }
  }

  private handleWin(): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.matter.world.engine.timing.timeScale = 1;

    const unusedCount = this.vampireQueue.length + (this.loadedVampire ? 1 : 0);
    const unusedBonus = unusedCount * GameConfig.UNUSED_VAMPIRE_SCORE;
    this.score += unusedBonus;

    const stars = calculateStarRating(this.score, this.blueprint.starThresholds);
    const save = SaveManager.getInstance();
    const prevHigh = save.getState().levels[this.levelId]?.highScore ?? 0;
    const { coinsEarned, newlyUnlockedAchievements } = save.recordWin(
      this.levelId,
      this.score,
      stars,
      this.killsTotal,
      this.bossKilled,
      this.maxComboInLevel
    );

    AudioManager.getInstance().playWin();
    UiDomHelper.setBodyState('gameover');
    this.events.emit('match-won', {
      levelId: this.levelId,
      score: this.score,
      highScore: Math.max(prevHigh, this.score),
      unusedBonus,
      stars,
      coinsEarned,
      newlyUnlockedAchievements,
    });
  }

  private handleLoss(): void {
    if (this.matchEnded) return;
    this.matchEnded = true;
    this.matter.world.engine.timing.timeScale = 1;
    AudioManager.getInstance().playLose();
    UiDomHelper.setBodyState('gameover');
    this.events.emit('match-lost', {
      levelId: this.levelId,
      score: this.score,
      reviveAvailable: !this.reviveUsed,
      zombiesLeft: this.zombies.length,
    });
  }

  setPaused(nextPaused: boolean): void {
    this.paused = nextPaused;
    this.matter.world.enabled = !nextPaused;
    AudioManager.getInstance().setPaused(nextPaused);
    UiDomHelper.setBodyState(nextPaused ? 'paused' : this.matchEnded ? 'gameover' : 'playing');
  }

  restartLevel(): void {
    this.scene.restart({ levelId: this.levelId });
  }

  toggleLookAround(): boolean {
    if (this.matchEnded) return this.isLookAround;
    this.isLookAround = !this.isLookAround;
    this.tweens.killTweensOf(this.cameras.main);
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: this.isLookAround ? 240 : 0,
      zoom: this.isLookAround ? 0.82 : 1,
      duration: 260,
      ease: 'Cubic.easeOut',
    });
    this.emitHudUpdate();
    return this.isLookAround;
  }

  skipLevelWithReward(): boolean {
    if (this.matchEnded) return false;
    const ok = SaveManager.getInstance().recordLevelSkip(this.levelId);
    if (!ok) return false;
    this.matchEnded = true;
    this.setPaused(false);
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    TransitionHelper.launchStageWithIntroCheck(this, this.levelId + 1);
    return true;
  }

  goToLevel(nextLevelId: number): void {
    this.setPaused(false);
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    TransitionHelper.launchStageWithIntroCheck(this, Math.max(1, nextLevelId));
  }

  goToSceneWithTransition(key: string): void {
    this.setPaused(false);
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
    TransitionHelper.transitionTo(this, key, undefined, 'fade', 250);
  }

  usePowerUp(key: 'extraVampire' | 'biggerBlast' | 'launchShield'): boolean {
    if (this.matchEnded || this.paused) return false;
    const save = SaveManager.getInstance();
    const state = save.getState();
    if (state.powerUps[key] <= 0) return false;

    if (key === 'biggerBlast' && this.biggerBlastActive) return false;
    if (key === 'launchShield' && this.nextLaunchShield) return false;

    state.powerUps[key] -= 1;
    save.persist();

    if (key === 'extraVampire') {
      this.vampireQueue.push('dracula');
      if (!this.loadedVampire && this.activeVampires.length === 0) this.loadNextVampire();
    } else if (key === 'biggerBlast') {
      this.biggerBlastActive = true;
    } else if (key === 'launchShield') {
      this.nextLaunchShield = true;
    }

    AudioManager.getInstance().playCoinPickup();
    this.emitHudUpdate();
    return true;
  }

  grantFreeHint(): void {
    this.forceHintArc = true;
    this.emitHudUpdate();
  }

  grantTrialVampire(): void {
    if (this.trialVampireUsed) return;
    this.trialVampireUsed = true;
    if (this.loadedVampire) {
      this.vampireQueue.unshift(this.loadedVampire);
    }
    this.loadedVampire = 'thunder';
    this.emitHudUpdate();
  }

  grantReviveExtraVampire(): void {
    if (!this.matchEnded || this.reviveUsed) return;
    this.reviveUsed = true;
    this.matchEnded = false;
    this.settledMs = 0;
    this.vampireQueue.push('bomb');
    this.loadNextVampire();
    UiDomHelper.setBodyState('playing');
    this.emitHudUpdate();
  }

  forceWinForDebug(): void {
    for (const z of [...this.zombies]) {
      this.damageZombie(z, z.maxHp + 999, false);
    }
    this.handleWin();
  }

  getHudSnapshot(): HudSnapshot {
    const abilityVamp = this.activeVampires.find((v) => v.canUseAbility);
    return {
      levelId: this.levelId,
      levelName: this.blueprint?.name ?? `Stage ${this.levelId}`,
      levelSubtitle: this.blueprint?.subtitle ?? '',
      worldId: this.worldTheme?.id ?? 1,
      worldName: this.worldTheme?.name ?? 'Haunted Graveyard',
      weatherLabel: this.worldTheme?.weatherEffectLabel ?? 'Graveyard Mist',
      score: this.score,
      vampiresRemaining: this.vampireQueue.length + (this.loadedVampire ? 1 : 0),
      loadedVampire: this.loadedVampire,
      activeAbilityLabel: abilityVamp ? VAMPIRE_TYPES[abilityVamp.type].abilityName : null,
      zombiesRemaining: this.zombies.length,
      totalZombies: this.blueprint?.zombies.length ?? 0,
      isBossLevel: Boolean(this.blueprint?.isBoss),
      specialHazard: this.worldTheme?.specialHazard ?? 'none',
      forceHintArc: this.forceHintArc,
      biggerBlastActive: this.biggerBlastActive,
      nextLaunchShield: this.nextLaunchShield,
      trialUsed: this.trialVampireUsed,
      canTapAbility: Boolean(abilityVamp),
      isLookAround: this.isLookAround,
      highlightPractice: this.highlightPractice,
    };
  }

  getDebugMetrics(): { fps: number; bodyCount: number } {
    return {
      fps: Math.round(this.game.loop.actualFps || 60),
      bodyCount: this.matter.world.getAllBodies().length,
    };
  }

  emitHudUpdate(): void {
    this.events.emit('hud-update', this.getHudSnapshot());
  }

  private cleanup(): void {
    DeviceScaler.getInstance().setBackHandler(null);
    if (this.collisionHandler) {
      this.matter?.world?.off('collisionstart', this.collisionHandler);
      this.collisionHandler = null;
    }
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
    if (this.bgListener) {
      this.game.events.off('app:background', this.bgListener);
      this.bgListener = null;
    }

    for (const b of this.blocks) b.destroy();
    for (const z of this.zombies) z.destroy(false);
    for (const v of this.activeVampires) v.destroy();
    this.blocks = [];
    this.zombies = [];
    this.activeVampires = [];

    this.slingshot?.destroy();
    this.particles?.destroy();
    this.smokeSystem?.destroy();
    this.tornadoSystem?.destroy();
    this.backdrop?.destroy();
    this.lightningGfx?.destroy();
    this.hazardGfx?.destroy();

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }
  }
}
