export type MarketListingResponse = [null, MarketListingResult];

export interface MarketListingResult {
  total: number;
  limit: number;
  skip: number;
  data: MarketListingEntry[];
}

export interface MarketListingEntry {
  _id: string;
  user_id: string;
  type: "item";
  is_hardcore: boolean;
  is_ladder: boolean;
  item: ItemDetail;
  price: string;
  hr_price: number;
  bumped_at: string;
  created_at: string;
  updated_at: string;
  created_by_id: string;
  updated_by_id: string;
  user: UserSummary;
}

export interface ItemDetail {
  is_identified: boolean;
  is_socketed: boolean;
  is_new: boolean;
  is_ear: boolean;
  is_starter: boolean;
  is_simple: boolean;
  is_ethereal: boolean;
  is_personalized: boolean;
  is_runeword: boolean;
  base: BaseItem;
  socketed_count: number;
  id: number;
  item_level: number;
  quality: Quality;
  graphic_id: number;
  class_specifics: boolean;
  rare?: RareInfo;
  socket_count: number;
  modifiers: Modifier[];
  location: Location;
  position: Position;
  category: string;
  base_code: string;
  name: string;
  requirements: Requirements;
  corrupted: boolean;
  corruptions?: string[];
  desecrated: boolean;
  properties: string[];
  hash: string;
  account_id: string;
  is_hardcore: boolean;
  is_ladder: boolean;
}

export interface BaseItem {
  id: string;
  category: string;
  codes: {
    normal: string;
    exceptional: string;
    elite: string;
  };
  name: string;
  stackable: boolean;
  type: string;
  type_code: string;
  size: Size;
  "class": ClassInfo;
  requirements: Requirements;
  damage: DamageDetail;
}

export interface Size {
  height: number;
  width: number;
}

export interface ClassInfo {
  base_code: string;
  "2hd_code": string;
  base: string;
  "2hd": string;
}

export interface Requirements {
  level: number;
  strength: number;
  dexterity: number;
}

export interface DamageDetail {
  one_handed: MinMax;
  two_handed: MinMax;
  missile?: Record<string, any>;
}

export interface Damage {
  one_handed: MinMax;
  two_handed: MinMax;
}

export interface MinMax {
  minimum: number;
  maximum: number;
}

export interface Quality {
  id: number;
  name: string;
}

export interface Unique {
  id: number;
  requirements: {
    level: number;
  };
}

export interface Durability {
  maximum: number;
  current: number;
}

export interface Modifier {
  name: string;
  values: number[];
  label: string;
  priority: number;
  corrupted?: boolean;
}

export interface Location {
  storage_id: number;
  equipment_id: number;
  zone_id: number;
  zone: string;
  storage: string;
  equipment: string;
  stash_page: number;
}

export interface Position {
  column: number;
  row: number;
}

export interface UserSummary {
  _id: string;
  username: string;
  game: {
    accounts: string[];
    preferences: Preferences;
  };
  created_at: string;       // ISO timestamp
  in_game_account?: string; // sometimes present
}

export interface Preferences {
  account: string | null;
  stash_page: number | null;
  public_stash_pages: any[];
  is_hardcore: boolean;
  is_ladder: boolean;
  notifications_chat: boolean;
  notifications_market: boolean;
}

export interface RareInfo {
  name: {
    prefix_id: number;
    suffix_id: number;
  };
  affixes: number[];
}
