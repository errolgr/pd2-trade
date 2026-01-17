import { ItemQuality } from '@/common/types/Item';

export type SaleType = 'any' | 'hr_only' | 'price_with_note' | 'no_listed_price';

export interface MarketSearchFilters {
  // Text search
  searchText: string;

  // Type filters
  itemType?: string; // type code
  baseCode?: string; // base code
  quality: ItemQuality | '';

  // Requirements
  levelMin?: number;
  levelMax?: number;
  dexterityMin?: number;
  dexterityMax?: number;
  strengthMin?: number;
  strengthMax?: number;

  // Misc
  corrupted?: 'true' | 'false' | 'both';
  ethereal?: 'true' | 'false' | 'both';
  itemLevelMin?: number;
  itemLevelMax?: number;
  identified?: 'true' | 'false' | 'both';
  socketCountMin?: number;
  socketCountMax?: number;

  // Trade filters
  sellerAccount?: string;
  collapseListingsByAccount: boolean;
  saleType: SaleType;
  minPrice?: number;
  maxPrice?: number;

  // Game mode (from settings, but can be overridden)
  isHardcore?: boolean;
  isLadder?: boolean;

  // Archive search
  searchArchived: boolean;

  // Modifier filters
  modifiers?: Array<{
    name: string;
    min?: number;
    max?: number;
  }>;
}

export const DEFAULT_FILTERS: MarketSearchFilters = {
  searchText: '',
  quality: '',
  itemType: undefined,
  baseCode: undefined,
  levelMin: undefined,
  levelMax: undefined,
  dexterityMin: undefined,
  dexterityMax: undefined,
  strengthMin: undefined,
  strengthMax: undefined,
  corrupted: 'both',
  ethereal: 'both',
  itemLevelMin: undefined,
  itemLevelMax: undefined,
  identified: 'both',
  socketCountMin: undefined,
  socketCountMax: undefined,
  sellerAccount: undefined,
  collapseListingsByAccount: false,
  saleType: 'any',
  minPrice: undefined,
  maxPrice: undefined,
  searchArchived: false,
  modifiers: undefined,
};
