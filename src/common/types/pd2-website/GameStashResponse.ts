export const ResponseCode = 4315;
// Top‐level tuple: [null, GameData]
export type SaveFormat = [null, GameData];

export interface GameData {
  file: FileInfo;
  stats: Stats;
  currency: Currency;
  items: Item[];
}

export interface FileInfo {
  identifier: number;
  version: number;
  filesize: number;
  checksum: number;
}

export interface Stats {
  identifier: string;
  time_played: number;
  monster_kills: number;
  dclone_kills: number;
  dclone_t2_kills: number;
  rathma_kills: number;
  rathma_t2_kills: number;
  lucion_kills: number;
  lucion_t2_kills: number;
  uber_trist_kills: number;
  uber_ancient_kills: number;
  andariel_kills: number;
  duriel_kills: number;
  mephisto_kills: number;
  diablo_kills: number;
  baal_kills: number;
  deaths: number;
  map_boss_kills: number;
  dungeon_boss_kills: number;
  player_kills: number;
  unused1: number;
  unused2: number;
  unused3: number;
  unused4: number;
  unused5: number;
}

export interface Currency {
  identifier: string;
  runes: Runes;
  gems: GemsCollection;
  craft: CraftMaterials;
  boss: BossMaterials;
  rejuv: number;
  full_rejuv: number;
  demonic_cube: number;
  jewel_frag: number;
  twss: number;
  wss: number;
  puzzlebox: number;
  puzzlepiece: number;
  essence: Essence;
  map: MapMaterials;
  unused: number[];
  gold: number;
}

export interface Runes {
  r01: number; r02: number; r03: number; r04: number; r05: number;
  r06: number; r07: number; r08: number; r09: number; r10: number;
  r11: number; r12: number; r13: number; r14: number; r15: number;
  r16: number; r17: number; r18: number; r19: number; r20: number;
  r21: number; r22: number; r23: number; r24: number; r25: number;
  r26: number; r27: number; r28: number; r29: number; r30: number;
  r31: number; r32: number; r33: number;
}

export interface GemsCollection {
  flawless: GemCounts;
  perfect:  GemCounts;
}

export interface GemCounts {
  topaz: number;
  diamond: number;
  amethyst: number;
  sapphire: number;
  emerald: number;
  ruby: number;
  skull: number;
}

export interface CraftMaterials {
  bountiful: number;
  brilliant: number;
  caster:    number;
  hitpower:  number;
  safety:    number;
  blood:     number;
  vampiric:  number;
}

export interface BossMaterials {
  mini_uber:     MiniUber;
  uber_trist:    BrainHorn;
  uber_ancients: Ancients;
  dclone:        DCloneMaterials;
  rathma:        RathmaMaterials;
  lucion:        LucionMaterials;
}

export interface MiniUber {
  terror: number;
  hatred: number;
  destruction: number;
}

export interface BrainHorn {
  brain: number;
  eye:   number;
  horn:  number;
}

export interface Ancients {
  madawc:  number;
  talic:   number;
  korlic:  number;
}

export interface DCloneMaterials {
  pure_demonic_essence: number;
  prime_evil_soul:      number;
  black_soulstone:      number;
}

export interface RathmaMaterials {
  jawbone:  number;
  splinter: number;
  ashes:    number;
}

export interface LucionMaterials {
  insignia: number;
  talisman: number;
  flesh:    number;
}

export interface Essence {
  suffering:   number;
  hatred:      number;
  terror:      number;
  destruction: number;
}

export interface MapMaterials {
  standard:         number;
  catalyst:         number;
  cartog:           number;
  infused_arcane:   number;
  infused_angelic:  number;
  infused_zakarum:  number;
  infused_horadrim: number;
  scarab:           number;
  fort:             number;
  destruction:      number;
  arcane:           number;
  angelic:          number;
  zakarum:          number;
  horadrim:         number;
}

export interface Item {
  is_identified:   boolean;
  is_socketed:     boolean;
  is_new:          boolean;
  is_ear:          boolean;
  is_starter:      boolean;
  is_simple:       boolean;
  is_ethereal:     boolean;
  is_personalized: boolean;
  is_runeword:     boolean;
  base:            BaseInfo;
  socketed_count:  number;
  id:              number;
  item_level:      number;
  quality:         Quality;
  graphic_id:      boolean;
  class_specifics: boolean;
  unique?:         UniqueInfo;
  durability:      Durability;
  socket_count:    number;
  modifiers:       Modifier[];
  name:            string;
  location:        Location;
  position:        Position;
  category:        string;
  base_code:       string;
  requirements:    Requirements;
  corrupted:       boolean;
  desecrated:      boolean;
  properties:      string[];
  damage?:         Partial<DamageRange>;
  hash:            string;
}

export interface BaseInfo {
  id:         string;
  category:   string;
  codes:      { normal: string; exceptional: string; elite: string };
  name:       string;
  stackable:  boolean;
  type:       string;
  type_code:  string;
  size:       { height: number; width: number };
  class:      {
    base_code: string;
    "2hd_code": string;
    base:       string;
    "2hd":       string;
  };
  requirements: Requirements;
  damage: {
    one_handed: Partial<DamageRange>;
    two_handed: DamageRange;
    missile:    Partial<DamageRange>;
  };
}

export interface Requirements {
  level:     number;
  strength:  number;
  dexterity: number;
}

export interface DamageRange {
  minimum: number;
  maximum: number;
}

export interface Quality {
  id:   number;
  name: string;
}

export interface UniqueInfo {
  id:            number;
  requirements: { level: number };
}

export interface Durability {
  maximum: number;
  current: number;
}

export interface Modifier {
  name:     string;
  values:   number[];
  label:    string;
  priority: number;
  min?:     number;
  max?:     number;
}

export interface Location {
  storage_id:   number;
  equipment_id: number;
  zone_id:      number;
  zone:         string;
  storage:      string;
  equipment:    string;
  stash_page:   number;
}

export interface Position {
  column: number;
  row:    number;
}
