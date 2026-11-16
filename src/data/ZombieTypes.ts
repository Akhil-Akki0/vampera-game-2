export type ZombieTypeId =
  | 'normal'
  | 'armored'
  | 'fat'
  | 'runner'
  | 'shield'
  | 'screamer'
  | 'boss';

export interface ZombieMeta {
  id: ZombieTypeId;
  name: string;
  maxHp: number;
  radius: number;
  points: number;
  massScale: number;
  color: number;
  description: string;
}

export const ZOMBIE_TYPES: Record<ZombieTypeId, ZombieMeta> = {
  normal: {
    id: 'normal',
    name: 'Ghoul',
    maxHp: 42,
    radius: 22,
    points: 500,
    massScale: 1.0,
    color: 0x5b8c51,
    description: 'Blood-thirsty undead lurker.',
  },
  armored: {
    id: 'armored',
    name: 'Crypt Knight',
    maxHp: 96,
    radius: 24,
    points: 850,
    massScale: 1.5,
    color: 0x4f7d47,
    description: 'Iron helmet absorbs overhead hits.',
  },
  fat: {
    id: 'fat',
    name: 'Bloat Fiend',
    maxHp: 150,
    radius: 31,
    points: 1100,
    massScale: 2.4,
    color: 0x466d42,
    description: 'Heavy brute resistant to light debris.',
  },
  runner: {
    id: 'runner',
    name: 'Prowler',
    maxHp: 56,
    radius: 20,
    points: 700,
    massScale: 0.9,
    color: 0x65a30d,
    description: 'Twitchy undead that lunges toward nearby vampires.',
  },
  shield: {
    id: 'shield',
    name: 'Buckler Dead',
    maxHp: 110,
    radius: 25,
    points: 950,
    massScale: 1.65,
    color: 0x3f623d,
    description: 'Carries a forward iron shield blocking direct frontal hits.',
  },
  screamer: {
    id: 'screamer',
    name: 'Banshee Shrieker',
    maxHp: 68,
    radius: 22,
    points: 900,
    massScale: 1.05,
    color: 0x4d7c5b,
    description: 'Emits sonic shrieks that slightly stun nearby flying vampires.',
  },
  boss: {
    id: 'boss',
    name: 'Overlord Baron',
    maxHp: 380,
    radius: 44,
    points: 3500,
    massScale: 4.5,
    color: 0x2f4f2f,
    description: 'Multi-phase boss appearing every 50th level.',
  },
};
