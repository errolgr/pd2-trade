/**
 * Market listing item → the clipboard item JSON the rare appraisal API parses (`text`, as the price check
 * sends it). The server turns clipboard stats back into market lines, so each listing modifier is sent as
 * a printf-style stat (`+%d%% Faster Cast Rate`, numbers in `chance`/`level`/`value` order) that the server
 * fills back into the listing's own label. Pure: no React.
 */
import type { ItemDetail, MarketListingEntry, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { modifiers as MODIFIER_DATA } from '@/assets/modifiers';

/** Clipboard stat (server `ClipboardStat`). */
export interface ClipboardStat {
  stat_id?: number;
  name: string;
  value?: number;
  level?: number;
  chance?: number;
  corrupted?: boolean;
  range?: { min: number; max: number };
}

/** Roll range the market sends on rolled modifiers (absent from the shared `Modifier` type). */
interface RollRange {
  min?: number;
  max?: number;
}

/** Clipboard item (server `parseClipboardItem` input). */
export interface ClipboardItem {
  name: string;
  quality: 'Rare' | 'Crafted';
  type: string;
  iLevel?: number;
  sockets: number;
  isEthereal: boolean;
  stats: ClipboardStat[];
}

/** Same numbers the server's `labelTemplate` lifts out of a label (unsigned, decimals kept). */
const NUM_RE = /\d+(?:\.\d+)?/g;

/** Stat ids the server's clipboard parser treats specially (pairs, skills, charges…): never sent as ids. */
const SPECIAL_STAT_IDS = new Set([
  0, 1, 2, 3, 17, 18, 39, 41, 43, 45, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 83, 107, 188, 204, 360, 361,
]);
const CORRUPTED_ID = 360;
const CORRUPTOR_ID = 361;
/** Sent as the item's `sockets`, not as a stat line. */
const SOCKET_MODIFIERS: Record<string, true> = { item_numsockets: true, item_numsockets_textonly: true };

let statIds: Map<string, number> | null = null;
function statIdOf(name: string): number | undefined {
  statIds ??= new Map(
    (MODIFIER_DATA as unknown as ReadonlyArray<{ id: number; name: string }>).map((m) => [m.name, m.id]),
  );
  const id = statIds.get(name);
  return id === undefined || SPECIAL_STAT_IDS.has(id) ? undefined : id;
}

/** Rare and crafted listings go to the appraisal; everything else is priced by the economy service. */
export function isAppraisable(item: ItemDetail): boolean {
  const quality = item.quality?.name;
  return (
    (quality === 'Rare' || quality === 'Crafted') &&
    item.is_identified !== false &&
    !!item.base?.name &&
    Array.isArray(item.modifiers)
  );
}

/**
 * A market label as a clipboard stat: numbers become `%d` (literal `%` escaped as `%%`) and are carried in
 * `value` (1 number), `chance`+`value` (2) or `chance`+`level`+`value` (3), the order the server fills them.
 * Null for labels with more numbers than a clipboard stat holds. The roll range (`min`/`max`, which the
 * market sends on rolled modifiers) rides along so the appraisal's roll-quality features match the listing's.
 */
export function modifierStat(mod: Pick<Modifier, 'name' | 'label' | 'corrupted'> & RollRange): ClipboardStat | null {
  const label = (mod.label ?? '').trim();
  if (!label) return null;
  const nums: number[] = [];
  const name = label.replace(/%/g, '%%').replace(NUM_RE, (n) => {
    nums.push(Number(n));
    return '%d';
  });
  if (nums.length > 3) return null;
  const stat: ClipboardStat = { name };
  const id = statIdOf(mod.name);
  if (id !== undefined) stat.stat_id = id;
  if (nums.length === 1) stat.value = nums[0];
  else if (nums.length === 2) [stat.chance, stat.value] = nums;
  else if (nums.length === 3) [stat.chance, stat.level, stat.value] = nums;
  const { min, max } = mod;
  if (typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max)) {
    stat.range = { min, max };
  }
  if (mod.corrupted) stat.corrupted = true;
  return stat;
}

/** The listing's item as clipboard JSON; null when it is not an identified rare/crafted item. */
export function listingClipboardItem(item: ItemDetail): ClipboardItem | null {
  if (!isAppraisable(item)) return null;
  const stats: ClipboardStat[] = [];
  let corrupted = !!item.corrupted;
  for (const mod of item.modifiers) {
    if (SOCKET_MODIFIERS[mod.name]) continue;
    if (mod.name === 'corrupted') {
      corrupted = true;
      // Market `corrupted` = [0, corruption outcome]; the server reads the outcome from stat 361.
      const outcome = mod.values?.[1];
      if (typeof outcome === 'number' && Number.isFinite(outcome)) {
        stats.push({ stat_id: CORRUPTOR_ID, name: 'Corruptor', value: outcome });
      }
      continue;
    }
    const stat = modifierStat(mod);
    if (stat) stats.push(stat);
  }
  if (corrupted) stats.unshift({ stat_id: CORRUPTED_ID, name: 'Corrupted' });
  return {
    name: item.name || item.base.name,
    quality: item.quality.name as 'Rare' | 'Crafted',
    type: item.base.name,
    ...(Number.isFinite(item.item_level) ? { iLevel: item.item_level } : {}),
    sockets: Number.isFinite(item.socket_count) ? item.socket_count : 0,
    isEthereal: !!item.is_ethereal,
    stats,
  };
}

/** Realm a listing is priced in. */
export const realmKey = (listing: Pick<MarketListingEntry, 'is_ladder' | 'is_hardcore'>): string =>
  `${listing.is_ladder ? 'L' : 'NL'}|${listing.is_hardcore ? 'HC' : 'SC'}`;

/**
 * Cache key and request text of a listing's rare appraisal: identical items in one realm share it
 * (whoever lists them); null for listings the appraisal doesn't cover.
 */
export function rareRequest(listing: MarketListingEntry): { key: string; text: string; realm: string } | null {
  const clip = listing.item ? listingClipboardItem(listing.item) : null;
  if (!clip) return null;
  const text = JSON.stringify(clip);
  const realm = realmKey(listing);
  return { key: `${realm}|${text}`, text, realm };
}
