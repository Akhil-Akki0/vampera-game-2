export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  rewardCoins: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Clear your first crypt stage.',
    rewardCoins: 40,
  },
  {
    id: 'three_star_10',
    name: 'Moonlit Perfection',
    description: 'Earn 3 stars on 10 different levels.',
    rewardCoins: 150,
  },
  {
    id: 'first_boss',
    name: 'Baron Slayer',
    description: 'Defeat your first Boss Zombie (Stage 50+).',
    rewardCoins: 200,
  },
  {
    id: 'world_traveler',
    name: 'Into the Woods',
    description: 'Unlock World 2: Dark Forest (clear Stage 100).',
    rewardCoins: 300,
  },
  {
    id: 'combo_master',
    name: 'Chain Carnage',
    description: 'Banish 3+ zombies in a single launch.',
    rewardCoins: 100,
  },
  {
    id: 'zombie_hunter_100',
    name: 'Undead Scourge',
    description: 'Defeat 100 zombies across all stages.',
    rewardCoins: 180,
  },
];
