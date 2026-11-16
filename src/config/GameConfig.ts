/**
 * Central tunable configuration for BLOODLINE: Vampire vs Zombies.
 * Adjust TOTAL_LEVELS, physics tuning, ability parameters, rewards, and Ad IDs here.
 */
export const GameConfig = {
  // Logical Phaser stage dimensions (16:9 responsive scaling)
  WORLD_WIDTH: 1600,
  WORLD_HEIGHT: 900,
  GROUND_Y: 780,
  WORLD_BOUNDS_MIN_X: -350,
  WORLD_BOUNDS_MAX_X: 2350,
  WORLD_BOUNDS_MAX_Y: 1120,

  // Slingshot & Launch Physics
  SLINGSHOT_X: 250,
  SLINGSHOT_Y: 620,
  MAX_DRAG_RADIUS: 135,
  LAUNCH_POWER_SCALE: 0.145,
  GRAVITY_Y: 1.0,
  FIXED_TIMESTEP_MS: 1000 / 60,
  MAX_BODY_VELOCITY: 32,

  // Combat, Explosions, Smoke, Tornado, & Mage Tuning
  MIN_IMPACT_SPEED: 2.2,
  IMPACT_DAMAGE_MULT: 7.0,
  EXPLOSION_RADIUS: 215,
  EXPLOSION_DAMAGE: 195,
  EXPLOSION_FORCE: 0.25,
  SMOKE_DURATION_SEC: 4.5,
  SMOKE_RADIUS: 175,
  SMOKE_DOT_PER_SEC: 14,
  TORNADO_DURATION_SEC: 3.1,
  TORNADO_RADIUS: 280,
  TORNADO_PULL_FORCE: 0.016,
  TORNADO_FLING_FORCE: 0.14,
  MAGE_POOL_DURATION_SEC: 2.6,
  MAGE_POOL_RADIUS: 190,
  MAGE_POOL_DOT_PER_SEC: 34,
  ICE_FREEZE_RADIUS: 205,
  THUNDER_CHAIN_COUNT: 3,
  THUNDER_CHAIN_RADIUS: 290,
  THUNDER_DAMAGE: 120,

  // Zombie Hunger (Blood-Thirsty Behavior)
  HUNGER_DETECT_RADIUS: 230,
  HUNGER_CRAWL_SPEED: 0.65,
  HUNGER_BITE_RADIUS: 46,
  HUNGER_BONUS_DRAIN: 50,

  // Turn & Level End Settlement
  STUCK_SPEED_THRESHOLD: 0.45,
  STUCK_TIMEOUT_SEC: 2.2,
  MAX_TURN_SEC: 10.0,
  SETTLE_WAIT_MS: 1350,
  WIN_SETTLE_WAIT_MS: 850,
  INITIAL_SETTLE_GRACE_SEC: 0.75,
  LOADING_VIDEO_PATH: '/assets/video/loading.mp4',
  LOADING_VIDEO_MAX_MS: 8500,
  LOADING_SKIP_DELAY_MS: 2000,
  MIN_LOADING_DISPLAY_MS: 1800,
  HITSTOP_SEC: 0.042,

  // Progression & Level Generation
  TOTAL_LEVELS: 1000, // Raise this constant anytime to expand beyond 1000 levels
  HANDCRAFTED_COUNT: 20,
  LEVELS_PER_WORLD: 100,
  BOSS_INTERVAL: 50,

  // Mobile & Performance Caps
  MAX_DPR: 2,
  LOW_END_FPS_THRESHOLD: 40,
  MAX_ACTIVE_BODIES: 120,
  PARTICLE_POOL_CAPS: {
    low: 80,
    medium: 170,
    high: 290,
    ultra: 420,
  } as const,

  // Economy, Skips & Rewards
  SKIP_LEVEL_DAILY_LIMIT: 5,
  COINS_PER_KILL: 12,
  COINS_PER_BOSS: 90,
  COINS_PER_STAR: 15,
  UNUSED_VAMPIRE_SCORE: 1000,
  DAILY_REWARD_COINS: 120,
  POWERUP_COSTS: {
    extraVampire: 120,
    biggerBlast: 150,
    launchShield: 100,
  },

  // Ad Provider Placeholders (Paste your real publisher & unit IDs here)
  ADS: {
    ADSENSE_PUBLISHER_ID: 'ca-pub-XXXXXXXXXXXXXXXX',
    ADSENSE_GAME_ID: 'BLOODLINE_H5_WEB',
    ADMOB_ANDROID_APP_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY',
    ADMOB_REWARDED_UNIT_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
    ADMOB_INTERSTITIAL_UNIT_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW',
    MOCK_AD_DURATION_SEC: 5,
    PRIVACY_POLICY_URL: 'https://example.com/privacy-policy',
  },
} as const;

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
