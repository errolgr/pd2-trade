import { Item, Stat } from './interfaces';

// Item name to API identifier mapping
export const ECONOMY_API_MAP = {
  Currency: {
    'Worldstone Shard': 'worldstone-shard',
    'Token of Absolution': 'token-of-absolution',
    "Larzuk's Puzzlebox": 'larzuks-puzzlebox',
    "Larzuk's Puzzlepiece": 'larzuks-puzzlepiece',
    'Vial of Lightsong': 'vial-of-lightsong',
    "Lilith's Mirror": 'liliths-mirror',
    'Catalyst Shard': 'catalyst-shard',
    'Standard of Heroes': 'standard-of-heroes',
    'Demonic Cube': 'demonic-cube',
    'Twisted Essence of Suffering': 'twisted-essence-of-suffering',
    'Charged Essence of Hatred': 'charged-essence-of-hatred',
    'Burning Essence of Terror': 'burning-essence-of-terror',
    'Festering Essence of Destruction': 'festering-essence-of-destruction',
  },
  Runes: {
    'El Rune': 'el-rune',
    'Eld Rune': 'eld-rune',
    'Tir Rune': 'tir-rune',
    'Nef Rune': 'nef-rune',
    'Eth Rune': 'eth-rune',
    'Ith Rune': 'ith-rune',
    'Tal Rune': 'tal-rune',
    'Ral Rune': 'ral-rune',
    'Ort Rune': 'ort-rune',
    'Thul Rune': 'thul-rune',
    'Amn Rune': 'amn-rune',
    'Sol Rune': 'sol-rune',
    'Shael Rune': 'shael-rune',
    'Dol Rune': 'dol-rune',
    'Hel Rune': 'hel-rune',
    'Io Rune': 'io-rune',
    'Lum Rune': 'lum-rune',
    'Ko Rune': 'ko-rune',
    'Fal Rune': 'fal-rune',
    'Lem Rune': 'lem-rune',
    'Pul Rune': 'pul-rune',
    'Um Rune': 'um-rune',
    'Mal Rune': 'mal-rune',
    'Ist Rune': 'ist-rune',
    'Gul Rune': 'gul-rune',
    'Vex Rune': 'vex-rune',
    'Ohm Rune': 'ohm-rune',
    'Lo Rune': 'lo-rune',
    'Sur Rune': 'sur-rune',
    'Ber Rune': 'ber-rune',
    'Jah Rune': 'jah-rune',
    'Cham Rune': 'cham-rune',
    'Zod Rune': 'zod-rune',
  },
  Ubers: {
    'Tainted Worldstone Shard': 'tainted-worldstone-shard',
    'Black Soulstone': 'black-soulstone',
    'Pure Demonic Essence': 'pure-demonic-essence',
    'Prime Evil Soul': 'prime-evil-soul',
    "Trang-Oul's Jawbone": 'trang-ouls-jawbone',
    'Splinter of the Void': 'splinter-of-the-void',
    'Hellfire Ashes': 'hellfire-ashes',
    'Relic of the Ancients': 'relic-of-the-ancients',
    'Sigil of Madawc': 'sigil-of-madawc',
    'Sigil of Talic': 'sigil-of-talic',
    'Sigil of Korlic': 'sigil-of-korlic',
    'Demonic Insignia': 'demonic-insignia',
    'Talisman of Transgression': 'talisman-of-transgression',
    'Flesh of Malic': 'flesh-of-malic',
  },
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
