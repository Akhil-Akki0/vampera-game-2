import { GameConfig } from '../config/GameConfig';

export type WorldAmbientParticle =
  | 'fog'
  | 'fireflies'
  | 'embers'
  | 'snow'
  | 'sand'
  | 'bubbles'
  | 'ash'
  | 'rain'
  | 'sparks'
  | 'souls';

export type WorldHazardSpecial =
  | 'none'
  | 'wind_gust'
  | 'slippery_ice'
  | 'sinking_mud'
  | 'falling_rocks'
  | 'lightning_storm';

export type WorldTimeTendency = 'night' | 'dusk_night' | 'day_sunset' | 'twilight_storm';

export interface WorldTheme {
  id: number; // 1..10
  name: string;
  subtitle: string;
  levelStart: number;
  levelEnd: number;
  skyTop: number;
  skyBottom: number;
  moonColor: number;
  hillBackColor: number;
  hillFrontColor: number;
  groundColor: number;
  groundTopColor: number;
  accentHex: string;
  ambientParticle: WorldAmbientParticle;
  specialHazard: WorldHazardSpecial;
  weatherEffectLabel: string;
  timeTendency: WorldTimeTendency;
  ambientAudioKind: 'crickets' | 'wind' | 'echo' | 'rain' | 'bubbles' | 'lava';
  musicRootHz: number;
  musicScale: number[]; // Semitone offsets for procedural looping music
  musicTempoMs: number;
}

export const WORLDS: WorldTheme[] = [
  {
    id: 1,
    name: 'Haunted Graveyard',
    subtitle: 'Moonlit tombstones and drifting mist',
    levelStart: 1,
    levelEnd: 100,
    skyTop: 0x070a14,
    skyBottom: 0x1a1c30,
    moonColor: 0xfef3c7,
    hillBackColor: 0x101524,
    hillFrontColor: 0x161d2e,
    groundColor: 0x1c1917,
    groundTopColor: 0x1e3a29,
    accentHex: '#dc2626',
    ambientParticle: 'fog',
    specialHazard: 'none',
    weatherEffectLabel: 'Graveyard Mist',
    timeTendency: 'night',
    ambientAudioKind: 'crickets',
    musicRootHz: 146.83, // D3
    musicScale: [0, 2, 3, 7, 8, 11],
    musicTempoMs: 410,
  },
  {
    id: 2,
    name: 'Dark Forest',
    subtitle: 'Twisted branches and eerie fireflies',
    levelStart: 101,
    levelEnd: 200,
    skyTop: 0x061012,
    skyBottom: 0x122622,
    moonColor: 0xd9f99d,
    hillBackColor: 0x0d1b18,
    hillFrontColor: 0x122620,
    groundColor: 0x1a1510,
    groundTopColor: 0x264027,
    accentHex: '#84cc16',
    ambientParticle: 'fireflies',
    specialHazard: 'none',
    weatherEffectLabel: 'Falling Leaves & Fireflies',
    timeTendency: 'dusk_night',
    ambientAudioKind: 'crickets',
    musicRootHz: 130.81, // C3
    musicScale: [0, 3, 5, 7, 10, 12],
    musicTempoMs: 390,
  },
  {
    id: 3,
    name: 'Vampire Castle',
    subtitle: 'Stone halls, flickering candles, and chandeliers',
    levelStart: 201,
    levelEnd: 300,
    skyTop: 0x110814,
    skyBottom: 0x291224,
    moonColor: 0xfca5a5,
    hillBackColor: 0x1e1120,
    hillFrontColor: 0x28172b,
    groundColor: 0x231f26,
    groundTopColor: 0x47384d,
    accentHex: '#f59e0b',
    ambientParticle: 'embers',
    specialHazard: 'none',
    weatherEffectLabel: 'Candlelight Echo',
    timeTendency: 'night',
    ambientAudioKind: 'echo',
    musicRootHz: 164.81, // E3
    musicScale: [0, 1, 4, 7, 8, 11],
    musicTempoMs: 360,
  },
  {
    id: 4,
    name: 'Frozen Tundra',
    subtitle: 'Howling blizzards and slick glacial blocks',
    levelStart: 301,
    levelEnd: 400,
    skyTop: 0x081526,
    skyBottom: 0x1b3654,
    moonColor: 0xe0f2fe,
    hillBackColor: 0x162b42,
    hillFrontColor: 0x213e5c,
    groundColor: 0x1e293b,
    groundTopColor: 0xbae6fd,
    accentHex: '#38bdf8',
    ambientParticle: 'snow',
    specialHazard: 'slippery_ice',
    weatherEffectLabel: 'Blizzard · Slippery Ice',
    timeTendency: 'dusk_night',
    ambientAudioKind: 'wind',
    musicRootHz: 196.0, // G3
    musicScale: [0, 2, 3, 7, 10, 12],
    musicTempoMs: 420,
  },
  {
    id: 5,
    name: 'Desert Ruins',
    subtitle: 'Sunken pyramids and gusting sandstorms',
    levelStart: 401,
    levelEnd: 500,
    skyTop: 0x1c1209,
    skyBottom: 0x422914,
    moonColor: 0xfde68a,
    hillBackColor: 0x2e1f11,
    hillFrontColor: 0x452d17,
    groundColor: 0x3b2814,
    groundTopColor: 0xd97706,
    accentHex: '#f59e0b',
    ambientParticle: 'sand',
    specialHazard: 'wind_gust',
    weatherEffectLabel: 'Sandstorm · Wind Gusts',
    timeTendency: 'day_sunset',
    ambientAudioKind: 'wind',
    musicRootHz: 146.83,
    musicScale: [0, 1, 4, 5, 7, 8, 10],
    musicTempoMs: 370,
  },
  {
    id: 6,
    name: 'Swamp of Souls',
    subtitle: 'Toxic mist, sinking mud, and rising bubbles',
    levelStart: 501,
    levelEnd: 600,
    skyTop: 0x07120d,
    skyBottom: 0x132b20,
    moonColor: 0xbef264,
    hillBackColor: 0x0f2119,
    hillFrontColor: 0x183024,
    groundColor: 0x1a261b,
    groundTopColor: 0x3f6212,
    accentHex: '#22c55e',
    ambientParticle: 'bubbles',
    specialHazard: 'sinking_mud',
    weatherEffectLabel: 'Bog Mist · Sinking Mud',
    timeTendency: 'dusk_night',
    ambientAudioKind: 'bubbles',
    musicRootHz: 123.47, // B2
    musicScale: [0, 3, 6, 7, 10, 11],
    musicTempoMs: 440,
  },
  {
    id: 7,
    name: 'Volcano Lair',
    subtitle: 'Molten magma rivers and falling embers',
    levelStart: 601,
    levelEnd: 700,
    skyTop: 0x170606,
    skyBottom: 0x3d100a,
    moonColor: 0xfb923c,
    hillBackColor: 0x260c09,
    hillFrontColor: 0x36120c,
    groundColor: 0x1c1212,
    groundTopColor: 0x991b1b,
    accentHex: '#f97316',
    ambientParticle: 'ash',
    specialHazard: 'falling_rocks',
    weatherEffectLabel: 'Ash Storm · Falling Rocks',
    timeTendency: 'dusk_night',
    ambientAudioKind: 'lava',
    musicRootHz: 110.0, // A2
    musicScale: [0, 1, 5, 7, 8, 12],
    musicTempoMs: 340,
  },
  {
    id: 8,
    name: 'Haunted Town',
    subtitle: 'Cobblestone gables, street lamps, and midnight rain',
    levelStart: 701,
    levelEnd: 800,
    skyTop: 0x090d16,
    skyBottom: 0x1b2436,
    moonColor: 0xe2e8f0,
    hillBackColor: 0x121926,
    hillFrontColor: 0x1a2333,
    groundColor: 0x1e2430,
    groundTopColor: 0x475569,
    accentHex: '#60a5fa',
    ambientParticle: 'rain',
    specialHazard: 'none',
    weatherEffectLabel: 'Midnight Rain',
    timeTendency: 'night',
    ambientAudioKind: 'rain',
    musicRootHz: 138.59, // C#3
    musicScale: [0, 2, 3, 6, 7, 11],
    musicTempoMs: 380,
  },
  {
    id: 9,
    name: 'Sky Fortress',
    subtitle: 'Floating citadels, storm wind, and lightning arcs',
    levelStart: 801,
    levelEnd: 900,
    skyTop: 0x0b1026,
    skyBottom: 0x262f59,
    moonColor: 0xfef08a,
    hillBackColor: 0x192040,
    hillFrontColor: 0x232d54,
    groundColor: 0x28324f,
    groundTopColor: 0x94a3b8,
    accentHex: '#38bdf8',
    ambientParticle: 'sparks',
    specialHazard: 'lightning_storm',
    weatherEffectLabel: 'Thunderstorm · High Winds',
    timeTendency: 'twilight_storm',
    ambientAudioKind: 'rain',
    musicRootHz: 174.61, // F3
    musicScale: [0, 2, 4, 6, 7, 11],
    musicTempoMs: 330,
  },
  {
    id: 10,
    name: 'Cursed Underworld',
    subtitle: 'Purple flames, bone spires, and the Overlord throne',
    levelStart: 901,
    levelEnd: 1000,
    skyTop: 0x12051c,
    skyBottom: 0x2e0b42,
    moonColor: 0xe879f9,
    hillBackColor: 0x1f082e,
    hillFrontColor: 0x2b0d3d,
    groundColor: 0x190b24,
    groundTopColor: 0x7e22ce,
    accentHex: '#c084fc',
    ambientParticle: 'souls',
    specialHazard: 'lightning_storm',
    weatherEffectLabel: 'Soul Tempest · Lightning',
    timeTendency: 'twilight_storm',
    ambientAudioKind: 'echo',
    musicRootHz: 98.0, // G2
    musicScale: [0, 1, 4, 6, 7, 10, 11],
    musicTempoMs: 320,
  },
];

export function getWorldForLevel(levelNumber: number): {
  world: WorldTheme;
  worldIndex: number;
  localLevel: number;
  loopCycle: number;
  difficultyMultiplier: number;
} {
  const safeLevel = Math.max(1, Math.floor(levelNumber));
  const perWorld = GameConfig.LEVELS_PER_WORLD;
  const worldCount = WORLDS.length;
  const zeroBased = safeLevel - 1;
  const totalCycleLevels = perWorld * worldCount;
  const loopCycle = Math.floor(zeroBased / totalCycleLevels);
  const inCycle = zeroBased % totalCycleLevels;
  const worldIndex = Math.floor(inCycle / perWorld);
  const localLevel = (inCycle % perWorld) + 1;
  const world = WORLDS[worldIndex];
  const difficultyMultiplier = 1 + zeroBased * 0.0012 + loopCycle * 0.35;

  return { world, worldIndex, localLevel, loopCycle, difficultyMultiplier };
}
