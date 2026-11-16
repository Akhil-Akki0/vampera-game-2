/**
 * Central AssetManifest mapping every visual & audio asset key to its optional /assets path.
 * Organized into core assets (loaded on startup) and per-world lazy assets (loaded on demand)
 * to keep initial mobile download size minimal. Missing files gracefully fall back to
 * procedural Canvas2D & Web Audio renderers with zero errors.
 */
export interface AssetEntry {
  key: string;
  kind: 'image' | 'audio' | 'atlas';
  path: string;
  atlasJsonPath?: string;
  width?: number;
  height?: number;
  worldId?: number; // If defined, lazy-loaded per world instead of initial boot
  category: 'vampire' | 'zombie' | 'block' | 'hazard' | 'ui' | 'map' | 'parallax' | 'audio';
}

export const ASSET_MANIFEST: AssetEntry[] = [
  // Core Vampires (sprite sheets / portraits)
  { key: 'vamp_dracula', kind: 'image', path: '/assets/images/vampires/dracula.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_bomb', kind: 'image', path: '/assets/images/vampires/blast_baron.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_storm', kind: 'image', path: '/assets/images/vampires/storm_caller.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_bat', kind: 'image', path: '/assets/images/vampires/bat_form.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_speed', kind: 'image', path: '/assets/images/vampires/speed_fang.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_shadow', kind: 'image', path: '/assets/images/vampires/shadow_drop.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_ice', kind: 'image', path: '/assets/images/vampires/ice_fang.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_thunder', kind: 'image', path: '/assets/images/vampires/thunder_bat.png', width: 96, height: 96, category: 'vampire' },
  { key: 'vamp_mage', kind: 'image', path: '/assets/images/vampires/blood_mage.png', width: 96, height: 96, category: 'vampire' },

  // Core Zombies
  { key: 'zomb_normal', kind: 'image', path: '/assets/images/zombies/normal.png', width: 96, height: 96, category: 'zombie' },
  { key: 'zomb_armored', kind: 'image', path: '/assets/images/zombies/armored.png', width: 96, height: 96, category: 'zombie' },
  { key: 'zomb_fat', kind: 'image', path: '/assets/images/zombies/fat.png', width: 112, height: 112, category: 'zombie' },
  { key: 'zomb_runner', kind: 'image', path: '/assets/images/zombies/runner.png', width: 96, height: 96, category: 'zombie' },
  { key: 'zomb_shield', kind: 'image', path: '/assets/images/zombies/shield.png', width: 104, height: 104, category: 'zombie' },
  { key: 'zomb_screamer', kind: 'image', path: '/assets/images/zombies/screamer.png', width: 96, height: 96, category: 'zombie' },
  { key: 'zomb_boss', kind: 'image', path: '/assets/images/zombies/boss.png', width: 160, height: 160, category: 'zombie' },

  // Effects, UI & World Map
  { key: 'fx_smoke', kind: 'image', path: '/assets/images/fx/smoke_puff.png', width: 96, height: 96, category: 'ui' },
  { key: 'fx_blood_drop', kind: 'image', path: '/assets/images/ui/blood_drop.png', width: 64, height: 64, category: 'ui' },
  { key: 'world_map_bg', kind: 'image', path: '/assets/images/maps/world_map_parchment.png', width: 1600, height: 900, category: 'map' },

  // Lazy-loaded per-world parallax layers (World 1..10)
  ...Array.from({ length: 10 }, (_, idx) => ({
    key: `world_${idx + 1}_far`,
    kind: 'image' as const,
    path: `/assets/images/worlds/world_${idx + 1}_far.png`,
    width: 1600,
    height: 900,
    worldId: idx + 1,
    category: 'parallax' as const,
  })),
  ...Array.from({ length: 10 }, (_, idx) => ({
    key: `world_${idx + 1}_mid`,
    kind: 'image' as const,
    path: `/assets/images/worlds/world_${idx + 1}_mid.png`,
    width: 1600,
    height: 900,
    worldId: idx + 1,
    category: 'parallax' as const,
  })),
];

export function getCoreImageAssets(): AssetEntry[] {
  return ASSET_MANIFEST.filter((a) => (a.kind === 'image' || a.kind === 'atlas') && a.worldId === undefined);
}

export function getWorldAssets(worldId: number): AssetEntry[] {
  return ASSET_MANIFEST.filter((a) => a.worldId === worldId);
}
