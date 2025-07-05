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
  Currency: Record<string, ItemData>;
  Ubers: Record<string, ItemData>;
};

export const RANGE_MARGIN = 0.05; // 20% by default, make this configurable if needed
