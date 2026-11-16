/**
 * Deterministic Mulberry32 PRNG keyed by level number and sub-seed.
 * Ensures every player gets the exact same procedural level layout for any level N.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number, subSeed = 0) {
    // Mix seed and subSeed cleanly into 32-bit state
    let s = (seed * 0x9e3779b1 + subSeed * 0x85ebca6b) >>> 0;
    if (s === 0) s = 0x6d2b79f5;
    this.state = s;
  }

  /** Return float in [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Return float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Return integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  /** Pick one element deterministically from a non-empty array */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}
