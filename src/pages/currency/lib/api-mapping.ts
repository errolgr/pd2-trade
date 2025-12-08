/**
 * Mapping from stash keys to API baseCode and typeCode
 * Used to fetch prices from the new PD2 Price Crawler API
 */

export interface ItemApiMapping {
  baseCode: string;
  typeCode: string;
  itemName: string;
}

export const STASH_TO_API_MAP: Record<string, ItemApiMapping> = {
  // Currency items
  demonic_cube: { baseCode: 'imrn', typeCode: 'imrn', itemName: 'Demonic Cube' },
  puzzlebox: { baseCode: 'lbox', typeCode: 'lbox', itemName: "Larzuk's Puzzlebox" },
  puzzlepiece: { baseCode: 'lpp', typeCode: 'lpp', itemName: "Larzuk's Puzzlepiece" },
  catalyst: { baseCode: 'iwss', typeCode: 'iwss', itemName: 'Catalyst Shard' },
  standard: { baseCode: 'std', typeCode: 'ques', itemName: 'Standard of Heroes' },
  destruction: { baseCode: 'fed', typeCode: 'ubr', itemName: 'Festering Essence of Destruction' },
  hatred: { baseCode: 'ceh', typeCode: 'ubr', itemName: 'Charged Essence of Hatred' },
  suffering: { baseCode: 'tes', typeCode: 'ubr', itemName: 'Twisted Essence of Suffering' },
  terror: { baseCode: 'bet', typeCode: 'ubr', itemName: 'Burning Essence of Terror' },
  
  // Uber items
  twss: { baseCode: 'cwss', typeCode: 'cwss', itemName: 'Tainted Worldstone Shard' },
  black_soulstone: { baseCode: 'dcho', typeCode: 'ubr', itemName: 'Black Soulstone' },
  pure_demonic_essence: { baseCode: 'dcbl', typeCode: 'ubr', itemName: 'Pure Demonic Essence' },
  prime_evil_soul: { baseCode: 'dcso', typeCode: 'ubr', itemName: 'Prime Evil Soul' },
  jawbone: { baseCode: 'rtmo', typeCode: 'ubr', itemName: "Trang-Oul's Jawbone" },
  splinter: { baseCode: 'rtmv', typeCode: 'ubr', itemName: 'Splinter of the Void' },
  ashes: { baseCode: 'cm2f', typeCode: 'cm2f', itemName: 'Hellfire Ashes' },
  madawc: { baseCode: 'ubaa', typeCode: 'ubr', itemName: 'Sigil of Madawc' },
  talic: { baseCode: 'ubab', typeCode: 'ubr', itemName: 'Sigil of Talic' },
  korlic: { baseCode: 'ubac', typeCode: 'ubr', itemName: 'Sigil of Korlic' },
  insignia: { baseCode: 'lucb', typeCode: 'ubr', itemName: 'Demonic Insignia' },
  talisman: { baseCode: 'lucc', typeCode: 'ubr', itemName: 'Talisman of Transgression' },
  flesh: { baseCode: 'lucd', typeCode: 'ubr', itemName: 'Flesh of Malic' },
};

/**
 * Rune name to baseCode mapping (r20-r33 for high runes)
 * Runes use typeCode "rune" or "runs" and baseCode like "r30" for Ber
 */
export const RUNE_NAME_TO_BASE_CODE: Record<string, string> = {
  'El Rune': 'r01',
  'Eld Rune': 'r02',
  'Tir Rune': 'r03',
  'Nef Rune': 'r04',
  'Eth Rune': 'r05',
  'Ith Rune': 'r06',
  'Tal Rune': 'r07',
  'Ral Rune': 'r08',
  'Ort Rune': 'r09',
  'Thul Rune': 'r10',
  'Amn Rune': 'r11',
  'Sol Rune': 'r12',
  'Shael Rune': 'r13',
  'Dol Rune': 'r14',
  'Hel Rune': 'r15',
  'Io Rune': 'r16',
  'Lum Rune': 'r17',
  'Ko Rune': 'r18',
  'Fal Rune': 'r19',
  'Lem Rune': 'r20',
  'Pul Rune': 'r21',
  'Um Rune': 'r22',
  'Mal Rune': 'r23',
  'Ist Rune': 'r24',
  'Gul Rune': 'r25',
  'Vex Rune': 'r26',
  'Ohm Rune': 'r27',
  'Lo Rune': 'r28',
  'Sur Rune': 'r29',
  'Ber Rune': 'r30',
  'Jah Rune': 'r31',
  'Cham Rune': 'r32',
  'Zod Rune': 'r33',
};

