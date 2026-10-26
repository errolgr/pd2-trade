import { allItems, runeWords } from '@/assets/items';
import { createItemsMapByKey } from '@/lib/item-utils';
import { type ArtItem, listingArtCandidates } from '@/pages/chat/lib/listing-art';

/** Same query as the website's icons: browsers and Cloudflare cached 404s for icons added later. */
const ICON_CACHE_BUST = 'v=2';

const ITEMS_BY_KEY = createItemsMapByKey(allItems);

/** A runeword's first allowed item type (PD2 type code), by lower-cased name. */
const RUNEWORD_TYPE = new Map<string, string>();
for (const rw of runeWords as { name: string; types?: { base?: string[] } }[]) {
  const type = rw.types?.base?.[0];
  if (type && !RUNEWORD_TYPE.has(rw.name.toLowerCase())) RUNEWORD_TYPE.set(rw.name.toLowerCase(), type);
}

/** A typical base per item type, for runewords whose base the data doesn't say (usage lists). */
const TYPE_BASE: Record<string, string> = {
  tors: 'Mage Plate',
  shld: 'Monarch',
  helm: 'Shako',
  swor: 'Crystal Sword',
  weap: 'Crystal Sword',
  mele: 'Crystal Sword',
  axe: 'Berserker Axe',
  mace: 'Flail',
  hamm: 'War Hammer',
  club: 'Club',
  scep: 'Scepter',
  staf: 'War Staff',
  pole: 'Thresher',
  spea: 'Spear',
  miss: 'Long Bow',
  bow: 'Long Bow',
  knif: 'Dagger',
  wand: 'Wand',
  h2h: 'Katar',
  orb: 'Eldritch Orb',
};

export interface ArtSource {
  name: string;
  quality: string | null;
  runeword?: boolean;
  /** Base item name when known (worn items). */
  base?: string;
  iconUrl?: string | null;
}

/**
 * Art URLs to try in order: the API's icon, then the art the chat/market uses for the item (unique/set art, else
 * the base's inventory art on pd2trader.com, then projectdiablo2.com). Runewords without a known base use a
 * typical base of their item type.
 */
export function itemArtCandidates(item: ArtSource): string[] {
  const runeword = item.runeword || item.quality === 'Runeword';
  const base =
    item.base || (runeword ? TYPE_BASE[RUNEWORD_TYPE.get(item.name.toLowerCase()) ?? ''] : undefined) || undefined;
  const art = {
    name: item.name,
    quality: { id: 0, name: runeword ? 'Normal' : (item.quality ?? 'Normal') },
    base: base ? { name: base } : undefined,
  } as unknown as ArtItem;
  const urls = [
    ...(item.iconUrl ? [`${item.iconUrl}?${ICON_CACHE_BUST}`] : []),
    ...listingArtCandidates(art, ITEMS_BY_KEY),
  ];
  return [...new Set(urls)];
}
