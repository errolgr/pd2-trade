/**
 * Dev-only sample items for the price check, in the in-game clipboard's shape: one per way the price check searches
 * (rare by base and stats, unique / set / unique map by name, runeword by name within its base, charm / jewel / rune
 * by their fixed bases, normal map by tier and base, plain base). Used by the browser test harness picker and
 * `__pd2Overlay.priceCheck()`.
 */
export interface DevPriceCheckSample {
  label: string;
  item: object;
}

export const DEV_PRICE_CHECK_SAMPLES: readonly DevPriceCheckSample[] = [
  {
    label: 'Rare ring (resists, FCR, fire damage)',
    item: {
      name: 'Dread Coil',
      quality: 'Rare',
      type: 'Ring',
      iLevel: 87,
      stats: [
        { stat_id: 105, name: '% Faster Cast Rate', value: 10 },
        { stat_id: 7, name: 'to Life', value: 35, range: { min: 10, max: 40 } },
        { stat_id: 39, name: 'Fire Resist', value: 25, range: { min: 5, max: 30 } },
        { stat_id: 41, name: 'Lightning Resist', value: 20, range: { min: 5, max: 30 } },
        { stat_id: 80, name: '% Better Chance of Getting Magic Items', value: 15, range: { min: 5, max: 15 } },
        { stat_id: 48, name: 'to Minimum Fire Damage', value: 4 },
        { stat_id: 49, name: 'to Maximum Fire Damage', value: 14 },
      ],
    },
  },
  {
    label: 'Unique: Harlequin Crest (Shako)',
    item: {
      name: 'Harlequin Crest',
      quality: 'Unique',
      type: 'Shako',
      iLevel: 85,
      defense: 141,
      stats: [
        { stat_id: 127, name: 'to All Skills', value: 2 },
        { stat_id: 80, name: '% Better Chance of Getting Magic Items', value: 50 },
      ],
    },
  },
  {
    label: 'Unique charm: Annihilus',
    item: {
      name: 'Annihilus',
      quality: 'Unique',
      type: 'Small Charm',
      iLevel: 99,
      stats: [
        { stat_id: 127, name: 'to All Skills', value: 1 },
        { stat_id: 39, name: 'Fire Resist', value: 18, range: { min: 10, max: 20 } },
      ],
    },
  },
  {
    label: "Set: Tal Rasha's Guardianship",
    item: {
      name: "Tal Rasha's Guardianship",
      quality: 'Set',
      type: 'Lacquered Plate',
      set: "Tal Rasha's Wrappings",
      iLevel: 84,
      stats: [{ stat_id: 80, name: '% Better Chance of Getting Magic Items', value: 88 }],
    },
  },
  {
    label: 'Runeword: Enigma (Mage Plate)',
    item: {
      name: 'Mage Plate',
      quality: 'Superior',
      type: 'Mage Plate',
      isRuneword: true,
      runeword: 'Enigma',
      sockets: 3,
      iLevel: 85,
      stats: [{ stat_id: 127, name: 'to All Skills', value: 2 }],
    },
  },
  {
    label: 'Runeword: Spirit (Monarch)',
    item: {
      name: 'Monarch',
      quality: 'Normal',
      type: 'Monarch',
      isRuneword: true,
      runeword: 'Spirit',
      sockets: 4,
      iLevel: 85,
      stats: [{ stat_id: 105, name: '% Faster Cast Rate', value: 35, range: { min: 25, max: 35 } }],
    },
  },
  {
    label: 'Magic grand charm (life)',
    item: {
      name: 'Grand Charm of Vita',
      quality: 'Magic',
      type: 'Grand Charm',
      iLevel: 91,
      stats: [{ stat_id: 7, name: 'to Life', value: 40, range: { min: 31, max: 40 } }],
    },
  },
  {
    label: 'Rare jewel (IAS, fire resist)',
    item: {
      name: 'Rune Eye',
      quality: 'Rare',
      type: 'Jewel',
      iLevel: 88,
      stats: [
        { stat_id: 93, name: '% Increased Attack Speed', value: 15 },
        { stat_id: 39, name: 'Fire Resist', value: 30, range: { min: 5, max: 30 } },
      ],
    },
  },
  {
    label: 'Rune: Ber',
    item: { name: 'Ber Rune', quality: 'Normal', type: 'Ber Rune', iLevel: 1, stats: [] },
  },
  {
    label: 'Map T3: River of Blood',
    item: { name: 'River of Blood Map', quality: 'Normal', type: 'River of Blood Map', iLevel: 80, stats: [] },
  },
  {
    label: "Unique map T5: Zhar's Sanctum",
    item: {
      name: "Zhar's Sanctum",
      quality: 'Unique',
      type: 'Map',
      iLevel: 85,
      stats: [{ stat_id: 80, name: '% Better Chance of Getting Magic Items', value: 40 }],
    },
  },
  {
    label: 'Base: ethereal 4-socket Thresher',
    item: {
      name: 'Thresher',
      quality: 'Normal',
      type: 'Thresher',
      isEthereal: true,
      sockets: 4,
      iLevel: 85,
      stats: [],
    },
  },
];
