import { GameConfig } from '../config/GameConfig';

export interface DragClampResult {
  clampedDx: number;
  clampedDy: number;
  vx: number;
  vy: number;
  powerRatio: number;
}

/**
 * Clamp slingshot drag vector to MAX_DRAG_RADIUS and compute initial launch velocity.
 */
export function clampDragVector(
  dx: number,
  dy: number,
  maxRadius: number = GameConfig.MAX_DRAG_RADIUS,
  powerScale: number = GameConfig.LAUNCH_POWER_SCALE
): DragClampResult {
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) {
    return { clampedDx: 0, clampedDy: 0, vx: 0, vy: 0, powerRatio: 0 };
  }
  const scale = dist > maxRadius ? maxRadius / dist : 1;
  const clampedDx = dx * scale;
  const clampedDy = dy * scale;
  const powerRatio = Math.min(dist, maxRadius) / maxRadius;

  return {
    clampedDx,
    clampedDy,
    vx: -clampedDx * powerScale,
    vy: -clampedDy * powerScale,
    powerRatio,
  };
}

/**
 * Compute dotted trajectory preview points matching Matter.js integration.
 */
export function computeTrajectoryPoints(
  originX: number,
  originY: number,
  launchVx: number,
  launchVy: number,
  gravityStepY: number,
  count = 14,
  frameStride = 3
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  let x = originX;
  let y = originY;
  let vx = launchVx;
  let vy = launchVy;
  const airDrag = 0.995;

  for (let s = 1; s <= count * frameStride; s++) {
    vx *= airDrag;
    vy = vy * airDrag + gravityStepY;
    x += vx;
    y += vy;
    if (s % frameStride === 0) {
      pts.push({ x, y });
    }
  }
  return pts;
}

/**
 * Compute velocity-based impact damage scaled by mass and material hardness.
 */
export function calculateImpactDamage(
  relativeSpeed: number,
  massFactor: number,
  targetHardness = 1.0
): number {
  if (relativeSpeed <= GameConfig.MIN_IMPACT_SPEED) return 0;
  const eff = relativeSpeed - GameConfig.MIN_IMPACT_SPEED;
  const raw = eff * GameConfig.IMPACT_DAMAGE_MULT * Math.max(0.5, Math.min(2.6, massFactor));
  return Math.round(raw / Math.max(0.45, targetHardness));
}

export function calculateComboMultiplier(killsInShot: number): number {
  if (killsInShot <= 1) return 1;
  return Math.min(4, 1 + (killsInShot - 1) * 0.5);
}

export function calculateStarRating(
  score: number,
  thresholds: [number, number, number]
): number {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 1;
}

export function computeBlastEffect(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  radius: number,
  maxDamage: number,
  maxForce: number
): { hit: boolean; damage: number; fx: number; fy: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  if (dist >= radius || radius <= 0) {
    return { hit: false, damage: 0, fx: 0, fy: 0 };
  }
  const falloff = 1 - dist / radius;
  const nx = dist > 0.001 ? dx / dist : 0;
  const ny = dist > 0.001 ? dy / dist : -1;
  return {
    hit: true,
    damage: Math.round(maxDamage * (0.25 + 0.75 * falloff)),
    fx: nx * maxForce * falloff,
    fy: (ny - 0.25) * maxForce * falloff,
  };
}

export function evaluateMatchOutcome(input: {
  aliveZombies: number;
  activeVampireInFlight: boolean;
  queuedVampiresCount: number;
  settledMs: number;
}): 'won' | 'lost' | 'continue' {
  if (input.aliveZombies <= 0) {
    return input.settledMs >= GameConfig.WIN_SETTLE_WAIT_MS ? 'won' : 'continue';
  }
  if (!input.activeVampireInFlight && input.queuedVampiresCount <= 0) {
    return input.settledMs >= GameConfig.SETTLE_WAIT_MS ? 'lost' : 'continue';
  }
  return 'continue';
}
