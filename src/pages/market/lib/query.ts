import { CLASS_TYPE_CODES, optionCodes } from './catalog';
import { parseStatKey } from './stats';
import type { MarketFilters, StatFilter, Tri } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Names the site matches as a case-insensitive pattern instead of exactly (base kinds rather than items). */
const PATTERN_NAMES = ['small charm', 'large charm', 'grand charm', 'amulet', 'ring', 'jewel'];

const isNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

function range(min?: number, max?: number): { $gte?: number; $lte?: number } | undefined {
  const out: { $gte?: number; $lte?: number } = {};
  if (isNumber(min)) out.$gte = min;
  if (isNumber(max)) out.$lte = max;
  return Object.keys(out).length ? out : undefined;
}

const triValue = (t: Tri): boolean | undefined => (t === 'any' ? undefined : t === 'yes');

/** A Type/Base select value as a query value: the code, or the parsed `{"$in": [...]}` of a grouped entry. */
function codeValue(code: string): unknown {
  if (!code.startsWith('{')) return code;
  try {
    return JSON.parse(code);
  } catch {
    return code;
  }
}

/** Escape regex syntax so the Price box matches what was typed (the site sends it raw). */
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Stat rows that are only there to weight the score: no bounds but a weight. They never filter. */
export function isScoreOnly(stat: StatFilter): boolean {
  return !isNumber(stat.min) && !isNumber(stat.max) && !!stat.weight;
}

/** `item.modifiers` `$elemMatch` for a stat row, built exactly like the site's Properties filter. */
export function statElemMatch(stat: StatFilter): Record<string, unknown> {
  const { names, params, valueIndex } = parseStatKey(stat.key);
  const match: Record<string, unknown> = {};
  if (names.length > 1) match.$or = names.map((name) => ({ name }));
  else match.name = names[0];
  params.forEach((p, i) => (match[`values.${i}`] = p));
  const bounds = range(stat.min, stat.max);
  if (bounds) match[`values.${valueIndex}`] = bounds;
  return { $elemMatch: match };
}

/** Pseudo filters (and client sorts) can't run on the server, so they need a ranked candidate pool. */
export function isPoolMode(f: MarketFilters): boolean {
  if (f.sort.by === 'score' || f.sort.by === 'value') return true;
  return f.stats.some((s) => s.enabled && s.kind === 'pseudo' && (isNumber(s.min) || isNumber(s.max)));
}

/** Type codes the item must have: the Type select narrowed by the class requirement (empty `$in` = no match). */
function typeCodeValue(f: MarketFilters): unknown {
  const classCodes = f.requirements.class ? CLASS_TYPE_CODES[f.requirements.class] : undefined;
  if (!classCodes) return f.typeCode ? codeValue(f.typeCode) : undefined;
  if (!f.typeCode) return classCodes.length === 1 ? classCodes[0] : { $in: classCodes };
  const allowed = optionCodes(f.typeCode).filter((c) => classCodes.includes(c));
  return allowed.length === 1 ? allowed[0] : { $in: allowed };
}

/**
 * The PD2 `find market/listing` (or `market/listingArchive`) query for these filters — the same query the
 * site builds for the same Trade/Archive form, plus a few extensions (HR range, multi-rarity, corruptions).
 *
 * Deviations, all because the site's own mapping is broken or unsafe:
 * - Has Buyout: the site sends `buyout`, a field listings don't have (always 0 results); here Yes = an HR
 *   price is set (`hr_price > 0`), No = none.
 * - Class: see CLASS_TYPE_CODES.
 * - Price text is regex-escaped.
 *
 * Pseudo stats and score-only rows are left to the client. Client sorts fetch in `bumped_at` order.
 */
export function buildListingQuery(
  f: MarketFilters,
  page: { limit: number; skip: number },
  now: Date = new Date(),
): Record<string, unknown> {
  const live = f.source === 'live';
  const sortField = f.sort.by === 'price' ? 'hr_price' : 'bumped_at';
  const sortDir = f.sort.by === 'price' || f.sort.by === 'bumped' ? (f.sort.dir === 'asc' ? 1 : -1) : -1;

  const q: Record<string, unknown> = {
    $resolve: live ? { user: { in_game_account: true } } : { user: true },
    type: 'item',
    $limit: page.limit,
    $skip: page.skip,
  };
  if (live) q.accepted_offer_id = null;
  q.updated_at = { $gte: new Date(now.getTime() - f.maxAgeDays * DAY_MS).toISOString() };
  q.$sort = { [sortField]: sortDir };
  q.is_hardcore = f.hardcore;
  q.is_ladder = f.ladder;

  const itemName = f.itemName?.trim();
  if (itemName) {
    q['item.name'] = PATTERN_NAMES.includes(itemName.toLowerCase()) ? { $regex: itemName, $options: 'i' } : itemName;
  }
  const priceText = f.priceText?.trim();
  if (priceText) q.price = { $regex: escapeRegex(priceText), $options: 'i' };

  const typeCode = typeCodeValue(f);
  if (typeCode !== undefined) q['item.base.type_code'] = typeCode;
  if (f.baseCode) q['item.base_code'] = codeValue(f.baseCode);

  const rarities = f.rarity.filter((r) => r !== 'Runeword');
  const runeword = f.rarity.includes('Runeword');
  if (runeword && rarities.length === 0) q['item.is_runeword'] = true;
  else if (runeword) {
    q.$or = [
      { 'item.is_runeword': true },
      { 'item.quality.name': rarities.length === 1 ? rarities[0] : { $in: rarities } },
    ];
  } else if (rarities.length) q['item.quality.name'] = rarities.length === 1 ? rarities[0] : { $in: rarities };

  const tri: [string, Tri][] = [
    ['item.is_ethereal', f.ethereal],
    ['item.corrupted', f.corrupted],
    ['item.desecrated', f.desecrated],
    ['item.is_identified', f.identified],
  ];
  for (const [key, value] of tri) {
    const bool = triValue(value);
    if (bool !== undefined) q[key] = bool;
  }

  // Site parity: "max 0 sockets" means unsocketed, any min still applies to socket_count
  const sockets = range(f.socketsMin, f.socketsMax === 0 ? undefined : f.socketsMax);
  if (sockets) q['item.socket_count'] = sockets;
  if (f.socketsMax === 0) q['item.is_socketed'] = false;

  if (f.userOnlineSite !== 'all') q.online = f.userOnlineSite === 'online';
  if (f.userOnlineGame !== 'all') q.in_game = f.userOnlineGame === 'online';
  if (f.sellerUserId) q.user_id = f.sellerUserId;

  const r = f.requirements;
  const level = range(r.levelMin, r.levelMax);
  if (level) q['item.requirements.level'] = level;
  const strength = range(r.strMin, r.strMax);
  if (strength) q['item.requirements.strength'] = strength;
  const dexterity = range(r.dexMin, r.dexMax);
  if (dexterity) q['item.requirements.dexterity'] = dexterity;

  const mods = f.stats.filter((s) => s.enabled && s.kind === 'mod' && s.key && !isScoreOnly(s));
  if (mods.length) q['item.modifiers'] = { $all: mods.map(statElemMatch) };
  if (f.corruptions.length) q['item.corruptions'] = { $all: f.corruptions };

  const hr: Record<string, unknown> = { ...range(f.hrMin, f.hrMax) };
  if (f.sort.by === 'price' || f.hasBuyout === 'yes') hr.$gt = 0;
  if (f.hasBuyout === 'no') hr.$in = [null, 0];
  if (Object.keys(hr).length) q.hr_price = hr;

  return q;
}
