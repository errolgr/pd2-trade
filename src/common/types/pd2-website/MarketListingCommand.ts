export const CommandCode = 4216;
// The full command tuple:
export type MarketListingCommand = [
    "create",
    "market/listing",
    CreateMarketListingPayload,
    Record<string, unknown>
  ];
  
  // Payload for creating a market listing
  export interface CreateMarketListingPayload {
    user_id:      string;
    type:         "item";
    is_hardcore:  boolean;
    is_ladder:    boolean;
    item:         ListingItem;
    hr_price:     number;
    price?: string;
    bumped_at:    string; // ISO 8601 timestamp
  }
  
  // An item as used in a market listing (extends the base Item structure)
  export interface ListingItem {
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
    unique:          UniqueInfo;
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
    damage:          {
      one_handed: Partial<DamageRange>;
      two_handed: DamageRange;
      missile?:  Partial<DamageRange>;
    };
    hash:            string;
  
    // Listing‐specific fields:
    account_id:      string;
    is_hardcore:     boolean;
    is_ladder:       boolean;
  }
  
  // Reuse these interfaces from your domain model:
  
  export interface BaseInfo {
    id:            string;
    category:      string;
    codes:         { normal: string; exceptional: string; elite: string };
    name:          string;
    stackable:     boolean;
    type:          string;
    type_code:     string;
    size:          { height: number; width: number };
    class:         { base_code: string; "2hd_code": string; base: string; "2hd": string };
    requirements:  Requirements;
    damage:        {
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
  
  