import { Item, Stat } from "./interfaces";

// Rune name to API identifier mapping
export const RUNE_API_MAP: Record<string, string> = {
  "El Rune": "el-rune",
  "Eld Rune": "eld-rune", 
  "Tir Rune": "tir-rune",
  "Nef Rune": "nef-rune",
  "Eth Rune": "eth-rune",
  "Ith Rune": "ith-rune",
  "Tal Rune": "tal-rune",
  "Ral Rune": "ral-rune",
  "Ort Rune": "ort-rune",
  "Thul Rune": "thul-rune",
  "Amn Rune": "amn-rune",
  "Sol Rune": "sol-rune",
  "Shael Rune": "shael-rune",
  "Dol Rune": "dol-rune",
  "Hel Rune": "hel-rune",
  "Io Rune": "io-rune",
  "Lum Rune": "lum-rune",
  "Ko Rune": "ko-rune",
  "Fal Rune": "fal-rune",
  "Lem Rune": "lem-rune",
  "Pul Rune": "pul-rune",
  "Um Rune": "um-rune",
  "Mal Rune": "mal-rune",
  "Ist Rune": "ist-rune",
  "Gul Rune": "gul-rune",
  "Vex Rune": "vex-rune",
  "Ohm Rune": "ohm-rune",
  "Lo Rune": "lo-rune",
  "Sur Rune": "sur-rune",
  "Ber Rune": "ber-rune",
  "Jah Rune": "jah-rune",
  "Cham Rune": "cham-rune",
  "Zod Rune": "zod-rune"
};

export interface RuneData {
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

export interface RuneValue {
  name: string;
  price: number;
  numListings: number;
  isCalculated: boolean;
  originalPrice?: number;
  isFixed?: boolean;
}

export interface RuneCombination {
  runes: Array<{ name: string; price: number; count: number }>;
  totalValue: number;
  difference: number;
}

export const RANGE_MARGIN = 0.05; // 20% by default, make this configurable if needed 