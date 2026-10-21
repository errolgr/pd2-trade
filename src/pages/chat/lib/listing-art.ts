import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ItemType } from '@/assets/itemFuzzySearch';
import { baseArtFile } from '@/components/rares/rare-art';

const ITEM_ART = 'https://pd2trader.com/assets/items';
/** projectdiablo2.com hosts the same inventory art under the same file names. */
const SITE_ITEM_ART = 'https://projectdiablo2.com/image/items';

/** Bundled public/ art by file stem (item name with spaces → "_", apostrophes dropped). */
const BUNDLED_ART: Record<string, 'currency' | 'ubers'> = {
  Burning_Essence_of_Terror: 'currency',
  Catalyst_Shard: 'currency',
  Charged_Essence_of_Hatred: 'currency',
  Demonic_Cube: 'currency',
  Festering_Essence_of_Destruction: 'currency',
  Larzuks_Puzzlebox: 'currency',
  Larzuks_Puzzlepiece: 'currency',
  Standard_of_Heroes: 'currency',
  Twisted_Essence_of_Suffering: 'currency',
  Worldstone_Shard: 'currency',
  Black_Soulstone: 'ubers',
  Demonic_Insignia: 'ubers',
  Flesh_of_Malic: 'ubers',
  Hellfire_Ashes: 'ubers',
  Prime_Evil_Soul: 'ubers',
  Pure_Demonic_Essence: 'ubers',
  Sigil_of_Korlic: 'ubers',
  Sigil_of_Madawc: 'ubers',
  Sigil_of_Talic: 'ubers',
  Splinter_of_the_Void: 'ubers',
  Tainted_Worldstone_Shard: 'ubers',
  Talisman_of_Transgression: 'ubers',
  Trang_Ouls_Jawbone: 'ubers',
};

/** Jewelry, jewels and charms have no weapon/armor family; pd2trader.com uses one art per kind. */
const MISC_BASE_ART: Record<string, string> = {
  ring: 'invrin',
  amulet: 'invamu',
  jewel: 'invgswe',
  'small charm': 'invch4',
  'large charm': 'invch4',
  'grand charm': 'invch4',
};

/** Case-insensitive name/key index per items map (keys differ from display names, e.g. "Eschuta's temper"). */
const LOOSE_INDEX = new WeakMap<Record<string, ItemType>, Map<string, ItemType>>();

function findItem(itemsByKey: Record<string, ItemType>, name: string): ItemType | undefined {
  const direct = itemsByKey[name];
  if (direct) return direct;
  let index = LOOSE_INDEX.get(itemsByKey);
  if (!index) {
    index = new Map();
    for (const [key, entry] of Object.entries(itemsByKey)) {
      for (const alias of [entry.name, key]) {
        const loose = alias?.toLowerCase();
        if (loose && !index.has(loose)) index.set(loose, entry);
      }
    }
    LOOSE_INDEX.set(itemsByKey, index);
  }
  return index.get(name.toLowerCase());
}

export type JewelElement = 'fire' | 'cold' | 'lightning' | 'poison';

const ELEMENT_MODS: [RegExp, JewelElement][] = [
  [/fire/, 'fire'],
  [/cold/, 'cold'],
  [/ltng|light(?!radius)/, 'lightning'],
  [/pois/, 'poison'],
];

/** The element a jewel's mods are about (Rainbow Facets: "+5% to Fire Skill Damage"…), or null. */
export function jewelElement(mods: Pick<Modifier, 'name'>[] | undefined): JewelElement | null {
  const names = (mods ?? []).map((m) => m.name).join(' ');
  return ELEMENT_MODS.find(([re]) => re.test(names))?.[1] ?? null;
}

/** Rainbow Facet art by element (the white jewel when none). */
const FACET_ART: Record<JewelElement, string> = {
  fire: 'invgsre',
  cold: 'invgsbe',
  lightning: 'invgsye',
  poison: 'invgsge',
};

/** What the art resolution reads (socketed items carry the same fields). */
export type ArtItem = Pick<ItemDetail, 'name' | 'quality' | 'base'> &
  Partial<Pick<ItemDetail, 'base_code' | 'graphic_id' | 'modifiers'>>;

/**
 * Jewel art. Rainbow Facets by element; other jewels as projectdiablo2.com draws them: `invgswe` + (graphic_id + 1)
 * (`invgswe1`–`invgswe6`, the site's own rule, read from its bundle), plain `invgswe` without a graphic id.
 */
function jewelArt(item: ArtItem): string | null {
  if (item.base_code !== 'jew' && item.base?.type_code !== 'jewl') return null;
  if (item.name === 'Rainbow Facet') {
    const element = jewelElement(item.modifiers);
    return element ? FACET_ART[element] : 'invgswe';
  }
  const graphic = item.graphic_id;
  return typeof graphic === 'number' && graphic >= 0 && graphic <= 5 ? `invgswe${graphic + 1}` : 'invgswe';
}

/**
 * Thumbnail URL of a listed item: jewel art, unique/set art from the items database, bundled rune/currency/uber
 * art, else the base's inventory art. null when nothing matches (the card shows a placeholder).
 */
export function listingArtUrl(item: ArtItem, itemsByKey: Record<string, ItemType>): string | null {
  const jewel = jewelArt(item);
  if (jewel) return `${ITEM_ART}/${jewel}.png`;

  const quality = item.quality?.name;
  if (quality === 'Unique' || quality === 'Set') {
    const invfile = findItem(itemsByKey, item.name)?.image?.invfile;
    if (invfile) return `${ITEM_ART}/${invfile}.png`;
  }

  const rune = /^([A-Z][a-z]+) Rune$/.exec(item.name);
  if (rune) return `/runes/${rune[1]}_Rune.png`;

  const stem = item.name.replace(/'/g, '').replace(/[\s-]+/g, '_');
  if (BUNDLED_ART[stem]) return `/${BUNDLED_ART[stem]}/${stem}.png`;

  const baseName = item.base?.name ?? item.name;
  const invfile = baseArtFile(baseName) ?? MISC_BASE_ART[baseName.toLowerCase()];
  return invfile ? `${ITEM_ART}/${invfile}.png` : null;
}

/**
 * Art URLs to try in order: the listingArtUrl result, then — for pd2trader.com inventory art, which lacks a
 * few files (invbaf, invmbw…) — the same file on projectdiablo2.com. Empty when nothing matches.
 */
export function listingArtCandidates(item: ArtItem, itemsByKey: Record<string, ItemType>): string[] {
  const url = listingArtUrl(item, itemsByKey);
  if (!url) return [];
  return url.startsWith(`${ITEM_ART}/`) ? [url, `${SITE_ITEM_ART}/${url.slice(ITEM_ART.length + 1)}`] : [url];
}
