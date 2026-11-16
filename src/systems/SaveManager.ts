import { GameConfig, GraphicsQuality } from '../config/GameConfig';
import { ACHIEVEMENTS } from '../data/Achievements';

export const SAVE_VERSION = 3;
const STORAGE_KEY = 'bloodline_phaser_save_v2';

export interface LevelRecord {
  stars: number;
  highScore: number;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
  showTrajectory: boolean;
  graphicsQuality: GraphicsQuality;
  disableInterstitials: boolean;
  tutorialSeen: boolean;
}

export interface SaveState {
  version: number;
  unlockedLevel: number;
  currentLevel: number;
  selectedWorld: number;
  coins: number;
  levels: Record<number, LevelRecord>;
  unlockedSkins: string[];
  equippedSkin: string;
  powerUps: {
    extraVampire: number;
    biggerBlast: number;
    launchShield: number;
  };
  seenVampireIntros: string[];
  seenZombieIntros: string[];
  seenTooltips: string[];
  unlockedAchievements: string[];
  stats: {
    totalKills: number;
    bossKills: number;
  };
  skipUsage: {
    date: string;
    count: number;
  };
  lastDailyClaimDate: string;
  consentAccepted: boolean;
  settings: GameSettings;
}

export function createDefaultSave(): SaveState {
  return {
    version: SAVE_VERSION,
    unlockedLevel: 1,
    currentLevel: 1,
    selectedWorld: 1,
    coins: 100,
    levels: {},
    unlockedSkins: ['classic'],
    equippedSkin: 'classic',
    powerUps: {
      extraVampire: 1,
      biggerBlast: 1,
      launchShield: 1,
    },
    seenVampireIntros: [],
    seenZombieIntros: [],
    seenTooltips: [],
    unlockedAchievements: [],
    stats: {
      totalKills: 0,
      bossKills: 0,
    },
    skipUsage: {
      date: '',
      count: 0,
    },
    lastDailyClaimDate: '',
    consentAccepted: false,
    settings: {
      musicVolume: 0.45,
      sfxVolume: 0.75,
      ambientVolume: 0.55,
      muted: false,
      showTrajectory: true,
      graphicsQuality: 'high',
      disableInterstitials: true, // Off by default per specification
      tutorialSeen: false,
    },
  };
}

/**
 * SaveManager provides versioned localStorage persistence with corruption fallback.
 */
export class SaveManager {
  private static instance: SaveManager;
  private state: SaveState;
  private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;

  constructor(customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null) {
    this.storage =
      customStorage !== undefined
        ? customStorage
        : typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : null;
    this.state = this.loadSafe();
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private loadSafe(): SaveState {
    const fallback = createDefaultSave();
    if (!this.storage) return fallback;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<SaveState>;
      if (!parsed || typeof parsed !== 'object') return fallback;

      return {
        ...fallback,
        ...parsed,
        version: SAVE_VERSION,
        unlockedLevel:
          typeof parsed.unlockedLevel === 'number' && Number.isFinite(parsed.unlockedLevel)
            ? Math.max(1, Math.floor(parsed.unlockedLevel))
            : 1,
        currentLevel:
          typeof parsed.currentLevel === 'number' && Number.isFinite(parsed.currentLevel)
            ? Math.max(1, Math.floor(parsed.currentLevel))
            : 1,
        selectedWorld:
          typeof parsed.selectedWorld === 'number' && Number.isFinite(parsed.selectedWorld)
            ? Math.max(1, Math.min(10, Math.floor(parsed.selectedWorld)))
            : 1,
        coins: typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? Math.max(0, Math.floor(parsed.coins)) : 100,
        levels: parsed.levels && typeof parsed.levels === 'object' ? parsed.levels : {},
        unlockedSkins: Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins : ['classic'],
        equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : 'classic',
        powerUps: {
          ...fallback.powerUps,
          ...(parsed.powerUps || {}),
        },
        seenVampireIntros: Array.isArray(parsed.seenVampireIntros) ? parsed.seenVampireIntros : [],
        seenZombieIntros: Array.isArray(parsed.seenZombieIntros) ? parsed.seenZombieIntros : [],
        seenTooltips: Array.isArray(parsed.seenTooltips) ? parsed.seenTooltips : [],
        unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
        stats: {
          ...fallback.stats,
          ...(parsed.stats || {}),
        },
        skipUsage: {
          ...fallback.skipUsage,
          ...(parsed.skipUsage || {}),
        },
        settings: {
          ...fallback.settings,
          ...(parsed.settings || {}),
        },
      };
    } catch {
      return fallback;
    }
  }

  persist(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage quota errors
    }
  }

  getState(): SaveState {
    return this.state;
  }

  getSettings(): GameSettings {
    return this.state.settings;
  }

  updateSettings(patch: Partial<GameSettings>): GameSettings {
    this.state.settings = { ...this.state.settings, ...patch };
    this.persist();
    return this.state.settings;
  }

  acceptConsent(): void {
    this.state.consentAccepted = true;
    this.persist();
  }

  setSelectedWorld(worldId: number): void {
    this.state.selectedWorld = Math.max(1, Math.min(10, worldId));
    this.persist();
  }

  setCurrentLevel(levelId: number): void {
    this.state.currentLevel = Math.max(1, levelId);
    this.persist();
  }

  addCoins(amount: number): number {
    if (amount <= 0) return this.state.coins;
    this.state.coins += Math.floor(amount);
    this.persist();
    return this.state.coins;
  }

  spendCoins(amount: number): boolean {
    if (amount <= 0 || this.state.coins < amount) return false;
    this.state.coins -= amount;
    this.persist();
    return true;
  }

  canClaimDailyReward(todayStr = new Date().toISOString().slice(0, 10)): boolean {
    return this.state.lastDailyClaimDate !== todayStr;
  }

  claimDailyReward(todayStr = new Date().toISOString().slice(0, 10)): number {
    if (!this.canClaimDailyReward(todayStr)) return 0;
    this.state.lastDailyClaimDate = todayStr;
    this.state.coins += GameConfig.DAILY_REWARD_COINS;
    this.persist();
    return GameConfig.DAILY_REWARD_COINS;
  }

  hasSeenVampireIntro(typeId: string): boolean {
    return this.state.seenVampireIntros.includes(typeId);
  }

  markVampireIntroSeen(typeId: string): boolean {
    if (this.state.seenVampireIntros.includes(typeId)) return false;
    this.state.seenVampireIntros.push(typeId);
    this.persist();
    return true;
  }

  markZombieIntroSeen(typeId: string): boolean {
    if (this.state.seenZombieIntros.includes(typeId)) return false;
    this.state.seenZombieIntros.push(typeId);
    this.persist();
    return true;
  }

  markTooltipSeen(key: string): boolean {
    if (this.state.seenTooltips.includes(key)) return false;
    this.state.seenTooltips.push(key);
    this.persist();
    return true;
  }

  canSkipLevelToday(todayStr = new Date().toISOString().slice(0, 10)): boolean {
    if (this.state.skipUsage.date !== todayStr) return true;
    return this.state.skipUsage.count < GameConfig.SKIP_LEVEL_DAILY_LIMIT;
  }

  getRemainingSkipsToday(todayStr = new Date().toISOString().slice(0, 10)): number {
    if (this.state.skipUsage.date !== todayStr) return GameConfig.SKIP_LEVEL_DAILY_LIMIT;
    return Math.max(0, GameConfig.SKIP_LEVEL_DAILY_LIMIT - this.state.skipUsage.count);
  }

  recordLevelSkip(levelId: number, todayStr = new Date().toISOString().slice(0, 10)): boolean {
    if (!this.canSkipLevelToday(todayStr)) return false;
    if (this.state.skipUsage.date !== todayStr) {
      this.state.skipUsage = { date: todayStr, count: 1 };
    } else {
      this.state.skipUsage.count += 1;
    }
    const prev = this.state.levels[levelId] || { stars: 0, highScore: 0 };
    this.state.levels[levelId] = {
      stars: Math.max(prev.stars, 1),
      highScore: prev.highScore,
    };
    this.state.unlockedLevel = Math.max(this.state.unlockedLevel, levelId + 1);
    this.state.currentLevel = levelId + 1;
    this.persist();
    return true;
  }

  recordWin(
    levelId: number,
    score: number,
    stars: number,
    killsInLevel: number,
    bossKilled: boolean,
    maxCombo: number
  ): { coinsEarned: number; newlyUnlockedAchievements: string[] } {
    const prev = this.state.levels[levelId] || { stars: 0, highScore: 0 };
    const newStars = Math.max(prev.stars, stars);
    this.state.levels[levelId] = {
      stars: newStars,
      highScore: Math.max(prev.highScore, score),
    };

    this.state.unlockedLevel = Math.max(this.state.unlockedLevel, levelId + 1);
    this.state.currentLevel = this.state.unlockedLevel;
    this.state.stats.totalKills += killsInLevel;
    if (bossKilled) this.state.stats.bossKills += 1;

    const coinsEarned =
      stars * GameConfig.COINS_PER_STAR +
      killsInLevel * GameConfig.COINS_PER_KILL +
      (bossKilled ? GameConfig.COINS_PER_BOSS : 0);
    this.state.coins += coinsEarned;

    const newlyUnlockedAchievements = this.evaluateAchievements(levelId, maxCombo);
    this.persist();
    return { coinsEarned, newlyUnlockedAchievements };
  }

  private evaluateAchievements(levelId: number, maxCombo: number): string[] {
    const unlocked: string[] = [];
    const tryUnlock = (id: string, condition: boolean) => {
      if (condition && !this.state.unlockedAchievements.includes(id)) {
        this.state.unlockedAchievements.push(id);
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) this.state.coins += def.rewardCoins;
        unlocked.push(id);
      }
    };

    const threeStarCount = Object.values(this.state.levels).filter((l) => l.stars >= 3).length;
    tryUnlock('first_blood', levelId >= 1);
    tryUnlock('three_star_10', threeStarCount >= 10);
    tryUnlock('first_boss', this.state.stats.bossKills >= 1);
    tryUnlock('world_traveler', this.state.unlockedLevel >= 101);
    tryUnlock('combo_master', maxCombo >= 3);
    tryUnlock('zombie_hunter_100', this.state.stats.totalKills >= 100);

    return unlocked;
  }

  unlockAllLevelsForDebug(): void {
    this.state.unlockedLevel = GameConfig.TOTAL_LEVELS;
    this.persist();
  }

  resetProgress(): void {
    const keepSettings = { ...this.state.settings, tutorialSeen: false };
    const keepConsent = this.state.consentAccepted;
    this.state = createDefaultSave();
    this.state.settings = keepSettings;
    this.state.consentAccepted = keepConsent;
    this.persist();
  }

  getTotalStarsForWorld(worldId: number): number {
    const start = (worldId - 1) * GameConfig.LEVELS_PER_WORLD + 1;
    const end = worldId * GameConfig.LEVELS_PER_WORLD;
    let total = 0;
    for (let id = start; id <= end; id++) {
      total += this.state.levels[id]?.stars ?? 0;
    }
    return total;
  }

  isWorldUnlocked(worldId: number): boolean {
    if (worldId <= 1) return true;
    const requiredLevel = (worldId - 1) * GameConfig.LEVELS_PER_WORLD + 1;
    return this.state.unlockedLevel >= requiredLevel;
  }
}
