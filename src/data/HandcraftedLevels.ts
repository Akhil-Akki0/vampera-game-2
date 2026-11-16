import { GameConfig } from '../config/GameConfig';
import { MaterialTypeId } from '../data/MaterialConfig';
import { VampireTypeId } from '../data/VampireTypes';
import { ZombieTypeId } from '../data/ZombieTypes';

export interface BlockBlueprint {
  x: number;
  y: number;
  w: number;
  h: number;
  material: MaterialTypeId;
  angle?: number;
  ropeAnchorY?: number;
}

export interface ZombieBlueprint {
  x: number;
  y: number;
  type: ZombieTypeId;
}

export interface LevelBlueprint {
  id: number;
  name: string;
  subtitle: string;
  vampires: VampireTypeId[];
  blocks: BlockBlueprint[];
  zombies: ZombieBlueprint[];
  starThresholds: [number, number, number];
  isBoss: boolean;
}

const G = GameConfig.GROUND_Y;

/**
 * Levels 1 to 20: Hand-designed tutorial campaign introducing one mechanic per stage.
 */
export const HANDCRAFTED_LEVELS: LevelBlueprint[] = [
  // 1: Basic Slingshot & Wood
  {
    id: 1,
    name: 'First Awakening',
    subtitle: 'Drag the crossbow back and crush the wooden gate.',
    vampires: ['dracula', 'dracula', 'dracula'],
    blocks: [
      { x: 960, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1090, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1025, y: G - 121, w: 164, h: 22, material: 'wood' },
    ],
    zombies: [{ x: 1025, y: G - 22, type: 'normal' }],
    starThresholds: [900, 1800, 2600],
    isBoss: false,
  },
  // 2: Bat Form Split + Glass
  {
    id: 2,
    name: 'Wings in the Mist',
    subtitle: 'Tap mid-air with Bat Form to split into 3 bats.',
    vampires: ['bat', 'bat', 'dracula'],
    blocks: [
      { x: 960, y: G - 55, w: 20, h: 110, material: 'glass' },
      { x: 1080, y: G - 55, w: 20, h: 110, material: 'glass' },
      { x: 1020, y: G - 121, w: 150, h: 20, material: 'wood' },
      { x: 1170, y: G - 55, w: 20, h: 110, material: 'glass' },
    ],
    zombies: [
      { x: 1020, y: G - 22, type: 'normal' },
      { x: 1220, y: G - 22, type: 'normal' },
    ],
    starThresholds: [1200, 2300, 3200],
    isBoss: false,
  },
  // 3: Glass Conservatory
  {
    id: 3,
    name: 'Shattered Panes',
    subtitle: 'Glass shatters easily and collapses upper roofs.',
    vampires: ['bat', 'dracula', 'bat'],
    blocks: [
      { x: 950, y: G - 55, w: 20, h: 110, material: 'glass' },
      { x: 1080, y: G - 55, w: 20, h: 110, material: 'glass' },
      { x: 1015, y: G - 121, w: 160, h: 20, material: 'glass' },
      { x: 970, y: G - 176, w: 20, h: 90, material: 'glass' },
      { x: 1060, y: G - 176, w: 20, h: 90, material: 'glass' },
      { x: 1015, y: G - 231, w: 120, h: 20, material: 'wood' },
    ],
    zombies: [
      { x: 1015, y: G - 22, type: 'normal' },
      { x: 1015, y: G - 153, type: 'normal' },
    ],
    starThresholds: [1300, 2500, 3400],
    isBoss: false,
  },
  // 4: Speed Fang Dash
  {
    id: 4,
    name: 'Crimson Streak',
    subtitle: 'Tap mid-air with Speed Fang to dash straight through timber.',
    vampires: ['speed', 'speed', 'dracula'],
    blocks: [
      { x: 940, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 1050, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 995, y: G - 131, w: 145, h: 22, material: 'wood' },
      { x: 1190, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 1300, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 1245, y: G - 131, w: 145, h: 22, material: 'wood' },
    ],
    zombies: [
      { x: 995, y: G - 22, type: 'normal' },
      { x: 1245, y: G - 22, type: 'normal' },
    ],
    starThresholds: [1300, 2600, 3500],
    isBoss: false,
  },
  // 5: Explosive Barrels
  {
    id: 5,
    name: 'Brimstone Barrels',
    subtitle: 'Strike red barrels to trigger chain explosions.',
    vampires: ['speed', 'dracula', 'bat'],
    blocks: [
      { x: 950, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1090, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1020, y: G - 121, w: 170, h: 22, material: 'wood' },
      { x: 1020, y: G - 24, w: 40, h: 48, material: 'barrel' },
      { x: 1185, y: G - 55, w: 22, h: 110, material: 'glass' },
    ],
    zombies: [
      { x: 1020, y: G - 154, type: 'normal' },
      { x: 1240, y: G - 22, type: 'normal' },
    ],
    starThresholds: [1500, 2700, 3600],
    isBoss: false,
  },
  // 6: Armored Zombie + Stone
  {
    id: 6,
    name: 'Iron Helmets',
    subtitle: 'Armored Zombies and stone walls take heavier blows.',
    vampires: ['dracula', 'speed', 'dracula', 'bat'],
    blocks: [
      { x: 950, y: G - 60, w: 26, h: 120, material: 'stone' },
      { x: 1100, y: G - 60, w: 26, h: 120, material: 'stone' },
      { x: 1025, y: G - 131, w: 185, h: 22, material: 'wood' },
      { x: 1210, y: G - 55, w: 22, h: 110, material: 'wood' },
    ],
    zombies: [
      { x: 1025, y: G - 24, type: 'armored' },
      { x: 1265, y: G - 22, type: 'normal' },
    ],
    starThresholds: [1600, 2800, 3900],
    isBoss: false,
  },
  // 7: Blood Bomb Intro
  {
    id: 7,
    name: 'Crimson Detonation',
    subtitle: 'Tap mid-air with Blood Bomb to explode on impact.',
    vampires: ['bomb', 'dracula', 'speed'],
    blocks: [
      { x: 980, y: G - 60, w: 26, h: 120, material: 'stone' },
      { x: 1130, y: G - 60, w: 26, h: 120, material: 'stone' },
      { x: 1055, y: G - 131, w: 185, h: 22, material: 'stone' },
      { x: 995, y: G - 187, w: 22, h: 90, material: 'wood' },
      { x: 1115, y: G - 187, w: 22, h: 90, material: 'wood' },
      { x: 1055, y: G - 243, w: 150, h: 22, material: 'wood' },
    ],
    zombies: [
      { x: 1055, y: G - 24, type: 'armored' },
      { x: 1055, y: G - 164, type: 'normal' },
    ],
    starThresholds: [1700, 3000, 4100],
    isBoss: false,
  },
  // 8: Storm Caller (Bat Tornado) + TNT Crates
  {
    id: 8,
    name: 'Bat Tempest',
    subtitle: 'Tap mid-air with Storm Caller to conjure a swirling bat tornado!',
    vampires: ['storm', 'bomb', 'speed'],
    blocks: [
      { x: 940, y: G - 60, w: 26, h: 120, material: 'stone' },
      { x: 1090, y: G - 60, w: 26, h: 120, material: 'stone' },
      { x: 1015, y: G - 131, w: 185, h: 22, material: 'wood' },
      { x: 1015, y: G - 23, w: 46, h: 46, material: 'tnt' },
      { x: 1200, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1310, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1255, y: G - 121, w: 145, h: 22, material: 'wood' },
    ],
    zombies: [
      { x: 1015, y: G - 166, type: 'armored' },
      { x: 1255, y: G - 22, type: 'normal' },
    ],
    starThresholds: [1800, 3100, 4200],
    isBoss: false,
  },
  // 9: Ice Material (slippery)
  {
    id: 9,
    name: 'Glacial Relics',
    subtitle: 'Ice blocks slide easily — knock out the base supports.',
    vampires: ['speed', 'bat', 'dracula'],
    blocks: [
      { x: 960, y: G - 55, w: 22, h: 110, material: 'ice' },
      { x: 1100, y: G - 55, w: 22, h: 110, material: 'ice' },
      { x: 1030, y: G - 121, w: 175, h: 22, material: 'ice' },
      { x: 980, y: G - 176, w: 20, h: 90, material: 'glass' },
      { x: 1080, y: G - 176, w: 20, h: 90, material: 'glass' },
      { x: 1030, y: G - 231, w: 135, h: 22, material: 'ice' },
    ],
    zombies: [
      { x: 1030, y: G - 22, type: 'normal' },
      { x: 1030, y: G - 154, type: 'armored' },
    ],
    starThresholds: [1700, 3000, 4100],
    isBoss: false,
  },
  // 10: Shadow Drop Intro
  {
    id: 10,
    name: 'Descent of Shadow',
    subtitle: 'Arc high above the bunker and tap Shadow Drop to slam down.',
    vampires: ['shadow', 'shadow', 'bomb', 'dracula'],
    blocks: [
      { x: 980, y: G - 65, w: 26, h: 130, material: 'stone' },
      { x: 1150, y: G - 65, w: 26, h: 130, material: 'stone' },
      { x: 1065, y: G - 141, w: 205, h: 22, material: 'stone' },
      { x: 1010, y: G - 197, w: 20, h: 90, material: 'glass' },
      { x: 1120, y: G - 197, w: 20, h: 90, material: 'glass' },
      { x: 1065, y: G - 253, w: 150, h: 22, material: 'wood' },
    ],
    zombies: [
      { x: 1065, y: G - 24, type: 'armored' },
      { x: 1065, y: G - 174, type: 'normal' },
    ],
    starThresholds: [1900, 3300, 4500],
    isBoss: false,
  },
  // 11: Fat Zombie
  {
    id: 11,
    name: 'Bloat Fiend',
    subtitle: 'Heavy Fat Zombies absorb minor falls — use explosives or Shadow Drop.',
    vampires: ['bomb', 'shadow', 'dracula', 'speed'],
    blocks: [
      { x: 960, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 1130, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 1045, y: G - 131, w: 205, h: 22, material: 'wood' },
      { x: 1220, y: G - 24, w: 40, h: 48, material: 'barrel' },
    ],
    zombies: [
      { x: 1045, y: G - 31, type: 'fat' },
      { x: 1290, y: G - 22, type: 'normal' },
    ],
    starThresholds: [2000, 3500, 4800],
    isBoss: false,
  },
  // 12: Hanging Coffins
  {
    id: 12,
    name: 'Gallows Rope',
    subtitle: 'Snap the hanging coffin rope to drop heavy ironwood from above.',
    vampires: ['bat', 'speed', 'dracula'],
    blocks: [
      { x: 1070, y: 295, w: 74, h: 36, material: 'coffin', ropeAnchorY: 100 },
      { x: 980, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1160, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1070, y: G - 121, w: 210, h: 20, material: 'glass' },
    ],
    zombies: [
      { x: 1070, y: G - 31, type: 'fat' },
      { x: 1250, y: G - 22, type: 'normal' },
    ],
    starThresholds: [2100, 3600, 4900],
    isBoss: false,
  },
  // 13: Runner Zombie
  {
    id: 13,
    name: 'Restless Prowlers',
    subtitle: 'Runner Zombies pace inside courtyards — time your shot or blast the floor.',
    vampires: ['bomb', 'bat', 'speed', 'dracula'],
    blocks: [
      { x: 920, y: G - 55, w: 22, h: 110, material: 'stone' },
      { x: 1280, y: G - 55, w: 22, h: 110, material: 'stone' },
      { x: 1100, y: G - 23, w: 46, h: 46, material: 'tnt' },
      { x: 1020, y: G - 55, w: 20, h: 110, material: 'glass' },
      { x: 1180, y: G - 55, w: 20, h: 110, material: 'glass' },
    ],
    zombies: [
      { x: 970, y: G - 20, type: 'runner' },
      { x: 1230, y: G - 20, type: 'runner' },
    ],
    starThresholds: [2000, 3500, 4700],
    isBoss: false,
  },
  // 14: Ice Fang Unlock
  {
    id: 14,
    name: 'Frostbite Fang',
    subtitle: 'Tap mid-air with Ice Fang to freeze & shatter nearby stone and glass!',
    vampires: ['ice', 'ice', 'bomb', 'dracula'],
    blocks: [
      { x: 960, y: G - 65, w: 26, h: 130, material: 'stone' },
      { x: 1120, y: G - 65, w: 26, h: 130, material: 'stone' },
      { x: 1040, y: G - 141, w: 195, h: 22, material: 'stone' },
      { x: 980, y: G - 197, w: 22, h: 90, material: 'stone' },
      { x: 1100, y: G - 197, w: 22, h: 90, material: 'stone' },
      { x: 1040, y: G - 253, w: 150, h: 22, material: 'ice' },
    ],
    zombies: [
      { x: 1040, y: G - 24, type: 'armored' },
      { x: 1040, y: G - 174, type: 'normal' },
      { x: 1220, y: G - 22, type: 'normal' },
    ],
    starThresholds: [2300, 3900, 5200],
    isBoss: false,
  },
  // 15: Shield Zombie
  {
    id: 15,
    name: 'Buckler Phalanx',
    subtitle: 'Shield Zombies deflect frontal hits — attack from above or behind!',
    vampires: ['shadow', 'bomb', 'ice', 'bat'],
    blocks: [
      { x: 930, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1110, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1020, y: G - 121, w: 210, h: 22, material: 'wood' },
      { x: 1200, y: G - 24, w: 40, h: 48, material: 'barrel' },
    ],
    zombies: [
      { x: 1020, y: G - 25, type: 'shield' },
      { x: 1270, y: G - 24, type: 'armored' },
    ],
    starThresholds: [2200, 3700, 5000],
    isBoss: false,
  },
  // 16: Spike Traps + Screamer Zombie
  {
    id: 16,
    name: 'Banshee Spikes',
    subtitle: 'Screamer Zombies stun nearby momentum — knock undead onto iron spikes.',
    vampires: ['speed', 'storm', 'bomb', 'dracula'],
    blocks: [
      { x: 1000, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1130, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1065, y: G - 121, w: 160, h: 22, material: 'wood' },
      { x: 1240, y: G - 12, w: 96, h: 24, material: 'spike' },
    ],
    zombies: [
      { x: 1065, y: G - 154, type: 'screamer' },
      { x: 1065, y: G - 24, type: 'armored' },
      { x: 1350, y: G - 20, type: 'runner' },
    ],
    starThresholds: [2200, 3800, 5100],
    isBoss: false,
  },
  // 17: Domino Columns
  {
    id: 17,
    name: 'Domino Obelisks',
    subtitle: 'Topple the western pillar to crush the entire courtyard.',
    vampires: ['speed', 'ice', 'dracula', 'bomb'],
    blocks: [
      { x: 900, y: G - 85, w: 24, h: 170, material: 'stone' },
      { x: 990, y: G - 85, w: 24, h: 170, material: 'stone' },
      { x: 1080, y: G - 85, w: 24, h: 170, material: 'wood' },
      { x: 1170, y: G - 85, w: 24, h: 170, material: 'wood' },
      { x: 1255, y: G - 23, w: 46, h: 46, material: 'tnt' },
    ],
    zombies: [
      { x: 945, y: G - 22, type: 'normal' },
      { x: 1125, y: G - 25, type: 'shield' },
      { x: 1340, y: G - 31, type: 'fat' },
    ],
    starThresholds: [2500, 4200, 5600],
    isBoss: false,
  },
  // 18: Thunder Bat Unlock
  {
    id: 18,
    name: 'Storm of Fangs',
    subtitle: 'Tap mid-air with Thunder Bat to chain lightning across nearby zombies!',
    vampires: ['thunder', 'thunder', 'bat', 'bomb'],
    blocks: [
      { x: 950, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1070, y: G - 55, w: 22, h: 110, material: 'wood' },
      { x: 1010, y: G - 121, w: 150, h: 22, material: 'wood' },
      { x: 1190, y: G - 55, w: 22, h: 110, material: 'stone' },
      { x: 1310, y: G - 55, w: 22, h: 110, material: 'stone' },
      { x: 1250, y: G - 121, w: 150, h: 22, material: 'stone' },
    ],
    zombies: [
      { x: 1010, y: G - 22, type: 'normal' },
      { x: 1010, y: G - 154, type: 'normal' },
      { x: 1250, y: G - 24, type: 'armored' },
      { x: 1250, y: G - 154, type: 'runner' },
    ],
    starThresholds: [2800, 4600, 6100],
    isBoss: false,
  },
  // 19: Blood Mage Unlock
  {
    id: 19,
    name: 'Crimson Vortex',
    subtitle: 'Tap mid-air with Blood Mage to pull zombies into a blood pool vortex!',
    vampires: ['mage', 'ice', 'thunder', 'bomb'],
    blocks: [
      { x: 1140, y: 275, w: 74, h: 36, material: 'coffin', ropeAnchorY: 95 },
      { x: 920, y: G - 60, w: 22, h: 120, material: 'glass' },
      { x: 970, y: G - 24, w: 40, h: 48, material: 'barrel' },
      { x: 1050, y: G - 65, w: 26, h: 130, material: 'stone' },
      { x: 1230, y: G - 65, w: 26, h: 130, material: 'stone' },
      { x: 1140, y: G - 141, w: 210, h: 22, material: 'wood' },
      { x: 1330, y: G - 12, w: 96, h: 24, material: 'spike' },
    ],
    zombies: [
      { x: 1140, y: G - 31, type: 'fat' },
      { x: 1140, y: G - 176, type: 'shield' },
      { x: 1410, y: G - 20, type: 'screamer' },
    ],
    starThresholds: [3000, 4900, 6400],
    isBoss: false,
  },
  // 20: Tutorial Finale
  {
    id: 20,
    name: 'Gatekeeper Keep',
    subtitle: 'Final Tutorial Challenge: Breach the twin-towered gatehouse!',
    vampires: ['storm', 'mage', 'thunder', 'bomb', 'shadow'],
    blocks: [
      { x: 1200, y: 270, w: 74, h: 36, material: 'coffin', ropeAnchorY: 90 },
      { x: 930, y: G - 60, w: 24, h: 120, material: 'stone' },
      { x: 1040, y: G - 60, w: 24, h: 120, material: 'wood' },
      { x: 985, y: G - 131, w: 145, h: 22, material: 'wood' },
      { x: 985, y: G - 23, w: 46, h: 46, material: 'tnt' },
      { x: 1120, y: G - 70, w: 26, h: 140, material: 'stone' },
      { x: 1280, y: G - 70, w: 26, h: 140, material: 'stone' },
      { x: 1200, y: G - 151, w: 195, h: 22, material: 'stone' },
      { x: 1140, y: G - 207, w: 22, h: 90, material: 'glass' },
      { x: 1260, y: G - 207, w: 22, h: 90, material: 'glass' },
      { x: 1200, y: G - 263, w: 150, h: 22, material: 'wood' },
    ],
    zombies: [
      { x: 985, y: G - 166, type: 'armored' },
      { x: 1200, y: G - 31, type: 'fat' },
      { x: 1200, y: G - 187, type: 'shield' },
      { x: 1370, y: G - 22, type: 'screamer' },
    ],
    starThresholds: [3400, 5600, 7400],
    isBoss: false,
  },
];
