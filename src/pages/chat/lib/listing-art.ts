import type { ItemDetail } from '@/common/types/pd2-website/GetMarketListingsResponse';
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

/**
 * Thumbnail URL of a listed item: unique/set art from the items database, bundled rune/currency/uber art,
 * else the base's inventory art. null when nothing matches (the card shows a placeholder).
 */
export function listingArtUrl(
  item: Pick<ItemDetail, 'name' | 'quality' | 'base'>,
  itemsByKey: Record<string, ItemType>,
): string | null {
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
export function listingArtCandidates(
  item: Pick<ItemDetail, 'name' | 'quality' | 'base'>,
  itemsByKey: Record<string, ItemType>,
): string[] {
  const url = listingArtUrl(item, itemsByKey);
  if (!url) return [];
  return url.startsWith(`${ITEM_ART}/`) ? [url, `${SITE_ITEM_ART}/${url.slice(ITEM_ART.length + 1)}`] : [url];
}
