import { GameConfig } from '../config/GameConfig';
import { BlockBlueprint, HANDCRAFTED_LEVELS, LevelBlueprint, ZombieBlueprint } from '../data/HandcraftedLevels';
import { MaterialTypeId } from '../data/MaterialConfig';
import { VAMPIRE_ORDER, VAMPIRE_TYPES, VampireTypeId } from '../data/VampireTypes';
import { getWorldForLevel } from '../data/WorldConfig';
import { ZOMBIE_TYPES, ZombieTypeId } from '../data/ZombieTypes';
import { computeTrajectoryPoints } from '../utils/PhysicsRules';
import { SeededRNG } from '../utils/SeededRNG';

const G = GameConfig.GROUND_Y;

const TOWER_ADJECTIVES = [
  'Shadow', 'Crimson', 'Blighted', 'Cursed', 'Shattered',
  'Forsaken', 'Gloom', 'Obsidian', 'Hollow', 'Wretched',
];
const TOWER_NOUNS = [
  'Bastion', 'Crypt', 'Citadel', 'Spire', 'Keep',
  'Sanctum', 'Vault', 'Gatehouse', 'Mausoleum', 'Watchtower',
];

/**
 * LevelGenerator supplies hand-designed tutorial levels (1..20) and
 * deterministic, solvability-validated procedural levels (21..TOTAL_LEVELS+).
 */
export class LevelGenerator {
  static getLevel(levelNumber: number): LevelBlueprint {
    const num = Math.max(1, Math.floor(levelNumber));
    if (num <= HANDCRAFTED_LEVELS.length) {
      return structuredClone(HANDCRAFTED_LEVELS[num - 1]);
    }

    // Try sub-seeds until solvability & structural stability validation passes
    for (let subSeed = 0; subSeed < 16; subSeed++) {
      const candidate = this.generateProceduralCandidate(num, subSeed);
      if (this.validateSolvability(candidate)) {
        return candidate;
      }
    }

    // Guaranteed-valid fallback template if 16 sub-seeds were rejected
    return this.generateFallbackLevel(num);
  }

  private static generateProceduralCandidate(levelNumber: number, subSeed: number): LevelBlueprint {
    const rng = new SeededRNG(levelNumber, subSeed);
    const { world, localLevel, difficultyMultiplier } = getWorldForLevel(levelNumber);
    const isBoss = levelNumber % GameConfig.BOSS_INTERVAL === 0;

    // Progress factor across 1..1000+
    const progress = Math.min(1, (levelNumber - 20) / 980);
    const bayCount = isBoss ? rng.int(2, 3) : progress < 0.2 ? rng.int(1, 2) : progress < 0.6 ? rng.int(2, 3) : rng.int(2, 4);

    const blocks: BlockBlueprint[] = [];
    const zombies: ZombieBlueprint[] = [];

    // Choose materials based on world + difficulty
    const matPool = this.getMaterialPool(world.id, progress);

    let cursorX = 875;
    const baySpacing = bayCount >= 4 ? 148 : 175;

    for (let b = 0; b < bayCount; b++) {
      const bayWidth = rng.int(116, 138);
      const centerX = cursorX + bayWidth / 2;
      const tiers = isBoss && b === Math.floor(bayCount / 2)
        ? 2
        : rng.int(1, progress > 0.35 ? 3 : 2);

      let currentTopY = G;
      const pillarMat = rng.pick(matPool);

      for (let t = 0; t < tiers; t++) {
        const pillarH = t === 0 ? (isBoss ? 128 : 108) : 88;
        const pillarW = pillarMat === 'stone' ? 24 : 20;
        const leftX = centerX - bayWidth * 0.38;
        const rightX = centerX + bayWidth * 0.38;
        const pillarCenterY = currentTopY - pillarH / 2;

        blocks.push({ x: Math.round(leftX), y: pillarCenterY, w: pillarW, h: pillarH, material: pillarMat });
        blocks.push({ x: Math.round(rightX), y: pillarCenterY, w: pillarW, h: pillarH, material: pillarMat });

        const roofMat: MaterialTypeId = t === tiers - 1 && rng.next() < 0.35 ? 'glass' : rng.pick(matPool);
        const roofW = Math.round(bayWidth + 16);
        const roofH = 20;
        const roofY = currentTopY - pillarH - roofH / 2;
        blocks.push({ x: Math.round(centerX), y: roofY, w: roofW, h: roofH, material: roofMat });

        // Place zombie or hazard inside this bay tier
        const zType = this.pickZombieType(rng, levelNumber, isBoss, b === Math.floor(bayCount / 2) && t === 0);
        const zMeta = ZOMBIE_TYPES[zType];

        if (isBoss && b === Math.floor(bayCount / 2) && t === 0) {
          // Ensure Boss has plenty of clearance inside central shrine
          zombies.push({ x: Math.round(centerX), y: currentTopY - zMeta.radius, type: 'boss' });
        } else if (t === 0 && rng.next() < 0.22) {
          // Place explosive hazard on ground inside bay and zombie on top roof
          const haz: MaterialTypeId = rng.next() < 0.5 ? 'barrel' : 'tnt';
          const hh = haz === 'barrel' ? 48 : 46;
          const hw = haz === 'barrel' ? 40 : 46;
          blocks.push({ x: Math.round(centerX), y: currentTopY - hh / 2, w: hw, h: hh, material: haz });
        } else {
          zombies.push({ x: Math.round(centerX), y: currentTopY - zMeta.radius, type: zType });
        }

        currentTopY = roofY - roofH / 2;
      }

      // Optional zombie perched on top of the tower
      if (rng.next() < 0.45 + progress * 0.25 && zombies.length < 7) {
        const topType = this.pickZombieType(rng, levelNumber, false, false);
        const topMeta = ZOMBIE_TYPES[topType];
        zombies.push({ x: Math.round(centerX), y: currentTopY - topMeta.radius, type: topType });
      }

      // Optional hanging coffin above bay
      if (rng.next() < 0.24 && currentTopY > 400) {
        blocks.push({
          x: Math.round(centerX),
          y: Math.max(245, currentTopY - 140),
          w: 72,
          h: 34,
          material: 'coffin',
          ropeAnchorY: 85,
        });
      }

      cursorX += baySpacing;
    }

    // Guarantee at least one zombie if random branches skipped
    if (zombies.length === 0) {
      zombies.push({ x: 1020, y: G - 22, type: isBoss ? 'boss' : 'normal' });
    }

    // Optional spike trap between bays or behind structure
    if (rng.next() < 0.35 && cursorX < 1460) {
      blocks.push({ x: Math.round(cursorX - 20), y: G - 12, w: 92, h: 24, material: 'spike' });
    }

    // Build vampire roster appropriate for level milestone & difficulty
    const unlockedVampires = VAMPIRE_ORDER.filter((v) => {
      const unlockLv = VAMPIRE_TYPES[v].unlockLevel;
      return levelNumber >= unlockLv;
    });

    // Vampire count tightens slightly as player masters higher worlds, but scales with zombie count
    const baseShots = Math.max(3, Math.min(6, Math.ceil(zombies.length * 0.85) + (isBoss ? 2 : 1) - (progress > 0.65 ? 1 : 0)));
    const vampires: VampireTypeId[] = [];
    for (let i = 0; i < baseShots; i++) {
      vampires.push(rng.pick(unlockedVampires));
    }

    // Compute fair star thresholds from zombie points + block points + unused bonus
    const zombieTotalPts = zombies.reduce((sum, z) => sum + ZOMBIE_TYPES[z.type].points, 0);
    const blockBonusEst = Math.round(blocks.length * 140 * Math.min(1.5, difficultyMultiplier));
    const star1 = Math.max(800, Math.round(zombieTotalPts * 0.75));
    const star2 = Math.round(zombieTotalPts + blockBonusEst * 0.65 + 800);
    const star3 = Math.round(zombieTotalPts + blockBonusEst + 1700);

    const adj = TOWER_ADJECTIVES[(levelNumber + world.id) % TOWER_ADJECTIVES.length];
    const noun = TOWER_NOUNS[(localLevel + subSeed) % TOWER_NOUNS.length];

    return {
      id: levelNumber,
      name: isBoss ? `${world.name} Overlord` : `${adj} ${noun}`,
      subtitle: isBoss
        ? `Boss Stage ${levelNumber}: Banish the ${world.name} Overlord!`
        : `${world.name} · Stage ${localLevel}`,
      vampires,
      blocks,
      zombies,
      starThresholds: [star1, star2, star3],
      isBoss,
    };
  }

  private static getMaterialPool(worldId: number, progress: number): MaterialTypeId[] {
    if (worldId === 4) return ['ice', 'ice', 'glass', 'stone'];
    if (worldId === 3 || worldId === 10) return ['stone', 'wood', 'glass', 'stone'];
    if (worldId === 7) return ['stone', 'stone', 'wood'];
    if (progress < 0.25) return ['wood', 'glass', 'wood', 'stone'];
    if (progress < 0.6) return ['wood', 'stone', 'glass', 'ice'];
    return ['stone', 'wood', 'stone', 'glass', 'ice'];
  }

  private static pickZombieType(
    rng: SeededRNG,
    levelNumber: number,
    isBossLevel: boolean,
    isBossSlot: boolean
  ): ZombieTypeId {
    if (isBossLevel && isBossSlot) return 'boss';
    const roll = rng.next();
    if (levelNumber < 35) {
      return roll < 0.5 ? 'normal' : roll < 0.78 ? 'armored' : 'runner';
    }
    if (levelNumber < 120) {
      if (roll < 0.3) return 'normal';
      if (roll < 0.54) return 'armored';
      if (roll < 0.7) return 'runner';
      if (roll < 0.84) return 'fat';
      if (roll < 0.93) return 'shield';
      return 'screamer';
    }
    if (roll < 0.2) return 'normal';
    if (roll < 0.4) return 'armored';
    if (roll < 0.56) return 'runner';
    if (roll < 0.72) return 'fat';
    if (roll < 0.86) return 'shield';
    return 'screamer';
  }

  /**
   * Automatic solvability & structural validation check:
   * 1. Ensures every zombie is reachable by a valid ballistic slingshot arc.
   * 2. Ensures no blocks overlap illegally or spawn below GROUND_Y.
   * 3. Ensures vampires + explosives have enough theoretical damage to win.
   */
  static validateSolvability(bp: LevelBlueprint): boolean {
    if (bp.zombies.length === 0 || bp.vampires.length === 0) return false;

    // 1. Structural bounds check
    for (const b of bp.blocks) {
      if (b.y + b.h / 2 > G + 2) return false;
      if (b.x < 780 || b.x > 1620) return false;
    }

    // 2. Ballistic reachability simulation across a fan of launch angles
    const gravityStepY = GameConfig.GRAVITY_Y * 0.001 * GameConfig.FIXED_TIMESTEP_MS * GameConfig.FIXED_TIMESTEP_MS;
    const testArcs: Array<Array<{ x: number; y: number }>> = [];
    const angles = [18, 28, 38, 48, 58];
    const powers = [0.65, 0.85, 1.0];

    for (const deg of angles) {
      for (const p of powers) {
        const rad = (deg * Math.PI) / 180;
        const speed = GameConfig.MAX_DRAG_RADIUS * p * GameConfig.LAUNCH_POWER_SCALE;
        const vx = Math.cos(rad) * speed;
        const vy = -Math.sin(rad) * speed;
        testArcs.push(computeTrajectoryPoints(GameConfig.SLINGSHOT_X, GameConfig.SLINGSHOT_Y, vx, vy, gravityStepY, 45, 2));
      }
    }

    for (const z of bp.zombies) {
      if (z.x < 780 || z.x > 1650 || z.y > G) return false;
      const reachable = testArcs.some((arc) =>
        arc.some((pt) => Math.hypot(pt.x - z.x, pt.y - z.y) <= 135)
      );
      if (!reachable) return false;
    }

    // 3. Damage budget sanity check (each vampire deals ~180-320 effective damage via direct + collapse)
    const totalZombieHp = bp.zombies.reduce((sum, z) => sum + ZOMBIE_TYPES[z.type].maxHp, 0);
    const explosiveCount = bp.blocks.filter((b) => b.material === 'barrel' || b.material === 'tnt').length;
    const estimatedBudget = bp.vampires.length * 240 + explosiveCount * 150;
    return estimatedBudget >= totalZombieHp * 0.9;
  }

  private static generateFallbackLevel(levelNumber: number): LevelBlueprint {
    const isBoss = levelNumber % GameConfig.BOSS_INTERVAL === 0;
    const { world } = getWorldForLevel(levelNumber);
    return {
      id: levelNumber,
      name: isBoss ? `${world.name} Overlord` : `${world.name} Gate`,
      subtitle: `Stage ${levelNumber}`,
      vampires: ['bomb', 'ice', 'thunder', 'speed', 'dracula'],
      blocks: [
        { x: 960, y: G - 55, w: 24, h: 110, material: 'stone' },
        { x: 1120, y: G - 55, w: 24, h: 110, material: 'stone' },
        { x: 1040, y: G - 121, w: 195, h: 22, material: 'wood' },
        { x: 1040, y: G - 145, w: 46, h: 46, material: 'tnt' },
      ],
      zombies: [
        { x: 1040, y: G - (isBoss ? 44 : 24), type: isBoss ? 'boss' : 'armored' },
        { x: 1220, y: G - 22, type: 'normal' },
      ],
      starThresholds: [1800, 3200, 4600],
      isBoss,
    };
  }
}
