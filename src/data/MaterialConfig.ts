export type MaterialTypeId =
  | 'wood'
  | 'stone'
  | 'glass'
  | 'ice'
  | 'barrel'
  | 'tnt'
  | 'coffin'
  | 'spike';

export interface MaterialMeta {
  id: MaterialTypeId;
  maxHp: number;
  density: number;
  restitution: number;
  friction: number;
  hardness: number;
  points: number;
  isHazard: boolean;
  isStaticHazard?: boolean;
  color: number;
  strokeColor: number;
}

export const MATERIAL_CONFIG: Record<MaterialTypeId, MaterialMeta> = {
  glass: {
    id: 'glass',
    maxHp: 28,
    density: 0.0012,
    restitution: 0.22,
    friction: 0.35,
    hardness: 0.7,
    points: 120,
    isHazard: false,
    color: 0x7dd3fc,
    strokeColor: 0xbae6fd,
  },
  ice: {
    id: 'ice',
    maxHp: 40,
    density: 0.0016,
    restitution: 0.14,
    friction: 0.05, // Very slippery
    hardness: 0.85,
    points: 150,
    isHazard: false,
    color: 0xa5f3fc,
    strokeColor: 0xe0f2fe,
  },
  wood: {
    id: 'wood',
    maxHp: 74,
    density: 0.0022,
    restitution: 0.16,
    friction: 0.65,
    hardness: 1.0,
    points: 180,
    isHazard: false,
    color: 0x6b4226,
    strokeColor: 0x2d190d,
  },
  stone: {
    id: 'stone',
    maxHp: 180,
    density: 0.0048,
    restitution: 0.08,
    friction: 0.8,
    hardness: 1.55,
    points: 260,
    isHazard: false,
    color: 0x525b6e,
    strokeColor: 0x1e2430,
  },
  barrel: {
    id: 'barrel',
    maxHp: 24,
    density: 0.0024,
    restitution: 0.2,
    friction: 0.6,
    hardness: 0.8,
    points: 350,
    isHazard: true,
    color: 0x991b1b,
    strokeColor: 0x2b0909,
  },
  tnt: {
    id: 'tnt',
    maxHp: 20,
    density: 0.0026,
    restitution: 0.12,
    friction: 0.75,
    hardness: 0.75,
    points: 400,
    isHazard: true,
    color: 0xb91c1c,
    strokeColor: 0x3b0d0d,
  },
  coffin: {
    id: 'coffin',
    maxHp: 115,
    density: 0.0042,
    restitution: 0.1,
    friction: 0.7,
    hardness: 1.3,
    points: 300,
    isHazard: true,
    color: 0x3b1d14,
    strokeColor: 0x140905,
  },
  spike: {
    id: 'spike',
    maxHp: 9999,
    density: 0.005,
    restitution: 0.1,
    friction: 0.8,
    hardness: 99,
    points: 0,
    isHazard: true,
    isStaticHazard: true,
    color: 0x475569,
    strokeColor: 0x0f172a,
  },
};
