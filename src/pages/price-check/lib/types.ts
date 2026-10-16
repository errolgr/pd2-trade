import { Item, Stat } from './interfaces';

export interface ItemData {
  itemName: string;
  proper: string;
  dataByIngestionDate: Array<{
    date: string;
    trueDate: string;
    numListings: number;
    price: number;
  }>;
}

export interface Props {
  item: Item;
  statMapper?: (statId: number, stat: Stat) => string | undefined; // allow override
  onClose?: () => void;
}

export interface ItemValue {
  name: string;
  price: number;
  numListings: number;
  isCalculated: boolean;
  itemName?: string;
  originalPrice?: number;
  isFixed?: boolean;
}

export interface RuneCombination {
  runes: Array<{ name: string; price: number; count: number }>;
  totalValue: number;
  difference: number;
}

export type EconomyData = {
  Runes: Record<string, ItemData>;
};

// RANGE_MARGIN has been replaced by fillStatValue setting (0-100%)
// Default value is 5% (0.05). This constant is kept for backward compatibility but should not be used.
// @deprecated Use fillStatValue from settings instead
export const RANGE_MARGIN = 0.05;
