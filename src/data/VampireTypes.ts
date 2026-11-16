export type VampireTypeId =
  | 'dracula'
  | 'bomb'
  | 'storm'
  | 'bat'
  | 'speed'
  | 'shadow'
  | 'ice'
  | 'thunder'
  | 'mage';

export interface VampireMeta {
  id: VampireTypeId;
  name: string;
  title: string;
  backstory: string;
  abilityName: string;
  abilityHint: string;
  whatItDoes: string;
  howToUse: string;
  bestAgainst: string;
  gestureType: 'drag' | 'tap';
  stats: {
    power: number; // 1..5
    speed: number; // 1..5
    special: number; // 1..5
  };
  unlockLevel: number;
  radius: number;
  density: number;
  color: number;
  colorHex: string;
  capeColor: number;
  eyeColor: number;
  skinColor: number;
  hairColor: number;
}

export const VAMPIRE_TYPES: Record<VampireTypeId, VampireMeta> = {
  dracula: {
    id: 'dracula',
    name: 'Count Dracula',
    title: 'Lord of the Crypt',
    backstory: 'Awakened by an undead invasion, the ancient Count leads the hunt for warm zombie blood.',
    abilityName: 'Crimson Might',
    abilityHint: 'Heavy impact force against stone & timber',
    whatItDoes: 'Delivers massive raw impact force and heavy knockback straight through barricades.',
    howToUse: 'Pull the crossbow back, aim at load-bearing beams, and release.',
    bestAgainst: 'Wood pillars, Fat Zombies, and heavy tower bases',
    gestureType: 'drag',
    stats: { power: 4, speed: 3, special: 2 },
    unlockLevel: 1,
    radius: 23,
    density: 0.0047,
    color: 0xb91c1c,
    colorHex: '#b91c1c',
    capeColor: 0x7f1d1d,
    eyeColor: 0xef4444,
    skinColor: 0xf1f5f9,
    hairColor: 0x0f172a,
  },
  bat: {
    id: 'bat',
    name: 'Bat Form',
    title: 'Midnight Swarm',
    backstory: 'Dissolves his cloak into three razor-winged bats to rain down across rooftops.',
    abilityName: 'Swarm Split',
    abilityHint: 'Tap mid-air to split into 3 spreading bats',
    whatItDoes: 'Splits mid-flight into three fast bat projectiles that cover a wide fan.',
    howToUse: 'Launch high, then tap anywhere mid-air before reaching the fortress.',
    bestAgainst: 'Glass panes, spread-out Ghouls, and rope-hung coffins',
    gestureType: 'tap',
    stats: { power: 3, speed: 4, special: 4 },
    unlockLevel: 2,
    radius: 21,
    density: 0.0036,
    color: 0x6d28d9,
    colorHex: '#6d28d9',
    capeColor: 0x4c1d95,
    eyeColor: 0xc084fc,
    skinColor: 0xe9d5ff,
    hairColor: 0x1e1b4b,
  },
  speed: {
    id: 'speed',
    name: 'Speed Fang',
    title: 'Silver Streak',
    backstory: 'A nocturnal duelist who crosses the graveyard faster than a blinking eye.',
    abilityName: 'Shadow Dash',
    abilityHint: 'Tap mid-air for a blazing forward dash',
    whatItDoes: 'Boosts forward velocity with piercing force and leaves an afterimage trail.',
    howToUse: 'Aim straight at a weak beam and tap right before impact for max punch.',
    bestAgainst: 'Wood walls, Shield Zombies (from behind), and distant towers',
    gestureType: 'tap',
    stats: { power: 4, speed: 5, special: 4 },
    unlockLevel: 4,
    radius: 20,
    density: 0.0036,
    color: 0x0284c7,
    colorHex: '#0284c7',
    capeColor: 0x0c4a6e,
    eyeColor: 0x38bdf8,
    skinColor: 0xe0f2fe,
    hairColor: 0x082f49,
  },
  bomb: {
    id: 'bomb',
    name: 'Blast Baron',
    title: 'Cursed Alchemist',
    backstory: 'Brewed volatile brimstone potions that erupt into choking black smoke clouds.',
    abilityName: 'Black Smoke Blast',
    abilityHint: 'Tap mid-air or hit hard to explode & leave weakening black smoke',
    whatItDoes: 'Detonates a huge shockwave explosion and leaves a lingering Black Smoke cloud that weakens nearby blocks.',
    howToUse: 'Tap mid-air inside a dense fortress or let him detonate on heavy impact.',
    bestAgainst: 'Stone vaults, Armored Knights, and clustered multi-story ruins',
    gestureType: 'tap',
    stats: { power: 5, speed: 3, special: 5 },
    unlockLevel: 6,
    radius: 24,
    density: 0.0041,
    color: 0xea580c,
    colorHex: '#ea580c',
    capeColor: 0x7c2d12,
    eyeColor: 0xfbbf24,
    skinColor: 0xfed7aa,
    hairColor: 0x1c1917,
  },
  storm: {
    id: 'storm',
    name: 'Storm Caller',
    title: 'Tempest Summoner',
    backstory: 'Commands a screeching flock of bats into a living whirlwind of destruction.',
    abilityName: 'Bat Tornado',
    abilityHint: 'Tap mid-air to summon a swirling bat tornado for 3s',
    whatItDoes: 'Summons a roaming Bat Tornado that pulls in and spins blocks & zombies for 3 seconds before flinging them outward.',
    howToUse: 'Tap right above a tower so the funnel sweeps across the structure.',
    bestAgainst: 'Tall unstable towers, tight zombie packs, and Shield Zombies',
    gestureType: 'tap',
    stats: { power: 4, speed: 3, special: 5 },
    unlockLevel: 8,
    radius: 22,
    density: 0.0038,
    color: 0x7c3aed,
    colorHex: '#7c3aed',
    capeColor: 0x2e1065,
    eyeColor: 0x34d399,
    skinColor: 0xddd6fe,
    hairColor: 0x1e1b4b,
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow Drop',
    title: 'Abyss Diver',
    backstory: 'Plummets from the clouds like an iron gargoyle to crack roofs wide open.',
    abilityName: 'Abyss Dive',
    abilityHint: 'Tap mid-air to slam straight down with a ground shockwave',
    whatItDoes: 'Cancels forward drift and slams vertically downward with a ground-rattling shockwave.',
    howToUse: 'Arc high above fortified roofs, then tap directly over your target.',
    bestAgainst: 'Bunker roofs, Crypt Knights, and Boss Zombies',
    gestureType: 'tap',
    stats: { power: 5, speed: 4, special: 4 },
    unlockLevel: 10,
    radius: 23,
    density: 0.0048,
    color: 0x334155,
    colorHex: '#334155',
    capeColor: 0x0f172a,
    eyeColor: 0xf43f5e,
    skinColor: 0xcbd5e1,
    hairColor: 0x020617,
  },
  ice: {
    id: 'ice',
    name: 'Ice Fang',
    title: 'Glacial Aristocrat',
    backstory: 'Breathes permafrost across stone walls so even thick masonry shatters like crystal.',
    abilityName: 'Glacial Shatter',
    abilityHint: 'Tap mid-air to freeze blocks & zombies so the next hit shatters them',
    whatItDoes: 'Freezes nearby structures and undead brittle, multiplying the very next impact.',
    howToUse: 'Freeze tough stone fortifications first, then follow up with Dracula or Speed Fang.',
    bestAgainst: 'Heavy stone bunkers and high-HP Bloat Fiends',
    gestureType: 'tap',
    stats: { power: 3, speed: 3, special: 5 },
    unlockLevel: 14,
    radius: 21,
    density: 0.004,
    color: 0x0ea5e9,
    colorHex: '#0ea5e9',
    capeColor: 0x075985,
    eyeColor: 0xe0f2fe,
    skinColor: 0xbae6fd,
    hairColor: 0x0c4a6e,
  },
  thunder: {
    id: 'thunder',
    name: 'Thunder Bat',
    title: 'Stormborn Spark',
    backstory: 'Channels crackling graveyard lightning between iron helmets and buried coffins.',
    abilityName: 'Chain Lightning',
    abilityHint: 'Tap mid-air to zap nearby zombies with chain lightning',
    whatItDoes: 'Arcs high-voltage lightning bolts across up to three nearby zombies simultaneously.',
    howToUse: 'Fly close to fortified rooms and tap mid-air to shock hidden undead inside.',
    bestAgainst: 'Hard-to-reach zombies behind thick stone walls',
    gestureType: 'tap',
    stats: { power: 4, speed: 4, special: 5 },
    unlockLevel: 17,
    radius: 21,
    density: 0.0039,
    color: 0xeab308,
    colorHex: '#eab308',
    capeColor: 0x713f12,
    eyeColor: 0xfef08a,
    skinColor: 0xfef9c3,
    hairColor: 0x422006,
  },
  mage: {
    id: 'mage',
    name: 'Blood Mage',
    title: 'Scarlet Sorcerer',
    backstory: 'Weaves forbidden crimson circles that drag hungry zombies straight into ruin.',
    abilityName: 'Crimson Vortex',
    abilityHint: 'Tap mid-air to conjure a blood pool vortex that drags zombies in',
    whatItDoes: 'Leaves a pulsing Blood Trail and opens a Crimson Vortex that pulls undead inward while draining life.',
    howToUse: 'Tap mid-air near elevated platforms or explosive crates to yank zombies together.',
    bestAgainst: 'Banshee Shriekers, Runners, and multi-platform stages',
    gestureType: 'tap',
    stats: { power: 4, speed: 3, special: 5 },
    unlockLevel: 19,
    radius: 22,
    density: 0.0039,
    color: 0x9f1239,
    colorHex: '#9f1239',
    capeColor: 0x4c0519,
    eyeColor: 0xfb7185,
    skinColor: 0xffe4e6,
    hairColor: 0x270815,
  },
};

export interface VampireSkin {
  id: string;
  name: string;
  description: string;
  cost: number;
  tintHex: string;
  tint: number;
}

export const VAMPIRE_SKINS: VampireSkin[] = [
  {
    id: 'classic',
    name: 'Nocturne Classic',
    description: 'Traditional Transylvanian cloak & pale visage',
    cost: 0,
    tintHex: '#ffffff',
    tint: 0xffffff,
  },
  {
    id: 'crimson_royal',
    name: 'Crimson Sovereign',
    description: 'Royal scarlet mantle and gold-trimmed collar',
    cost: 220,
    tintHex: '#fecaca',
    tint: 0xfecaca,
  },
  {
    id: 'lunar_silver',
    name: 'Lunar Phantom',
    description: 'Moon-blessed silver sheen across all vampires',
    cost: 340,
    tintHex: '#bae6fd',
    tint: 0xbae6fd,
  },
  {
    id: 'cursed_gold',
    name: 'Gilded Nosferatu',
    description: 'Ancient gilded aura of the Bloodline elders',
    cost: 500,
    tintHex: '#fde68a',
    tint: 0xfde68a,
  },
];

export const VAMPIRE_ORDER: VampireTypeId[] = [
  'dracula',
  'bat',
  'speed',
  'bomb',
  'storm',
  'shadow',
  'ice',
  'thunder',
  'mage',
];
