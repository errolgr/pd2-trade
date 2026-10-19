import type { ItemDetail } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ItemType } from '@/assets/itemFuzzySearch';
import { baseArtFile } from '@/components/rares/rare-art';

const ITEM_ART = 'https://pd2trader.com/assets/items';

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
    const invfile = itemsByKey[item.name]?.image?.invfile;
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
