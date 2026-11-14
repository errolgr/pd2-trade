/**
 * Rare values for worn items. The builds API prices nothing rare or crafted (only what's socketed in it, when that
 * is priced), so rare gear and rare jewels count for 0. Here they go through the rare appraisal (the same batched,
 * cached `POST /api/rares/appraisal/batch` the market's deal badges use): an item is valued at the midpoint of the
 * asking-price band of similar listings, and only when that appraisal has normal confidence. Magic items have no
 * appraisal and stay unpriced.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  CharacterDetail,
  CharmItem,
  EquippedItem,
  Merc,
  ModRoll,
  PricedEquippedItem,
  SocketedItem,
} from '@/lib/builds-api';
import { getCurrentSeason } from '@/lib/seasons';
import { type ClipboardItem, type ClipboardStat, modifierStat } from '@/pages/market/enrich/listing-clipboard';
import {
  getRareEntry,
  isRareEntryStale,
  rareEstimatesVersion,
  requestRareEstimate,
  subscribeRareEstimates,
} from '@/pages/market/enrich/rare-estimates';

/** What rare appraisals added to an item's `priceHr`. */
export interface RareValue {
  /** The item's own appraisal band (p25–p75 asking prices of similar listings) when it was priced by it. */
  band?: { lowHr: number; highHr: number };
  /** Appraised rare jewels socketed in it, HR. */
  jewelsHr?: number;
}

export type RareValued<T> = T & { rareValue?: RareValue };

export type ValuedCharacter = Omit<CharacterDetail, 'equipped' | 'merc' | 'charms'> & {
  equipped: RareValued<PricedEquippedItem>[];
  merc: Merc<RareValued<PricedEquippedItem>> | null;
  charms?: RareValued<CharmItem>[];
};

const APPRAISED_QUALITIES: Record<string, 'Rare' | 'Crafted'> = { Rare: 'Rare', Crafted: 'Crafted' };
/** Same numbers the appraisal's label templates lift out of a line. */
const NUM_RE = /\d+(?:\.\d+)?/g;
/** Lines that are item state, not stats (sent as the item's flags). */
const STATE_LINE = /^(corrupted|socketed \(\d+\)|ethereal.*)$/i;

type Roll = ModRoll | null;

/**
 * The item's own mod lines: PD2 reports a worn item's lines with what its sockets add folded in (a Diadem with an
 * Um shows `All Resistances +34%`, 19 of its own), so each socketed item's lines are taken back out of the line
 * with the same wording. Rolls stay paired with their lines; a line left at 0 is dropped.
 */
export function ownModLines(
  mods: readonly string[],
  rolls: readonly Roll[] | undefined,
  socketed: readonly Pick<SocketedItem, 'mods'>[],
): { line: string; roll: Roll }[] {
  const lines = mods.map((line, i) => ({ line, roll: rolls?.[i] ?? null }));
  const wording = (line: string) => line.replace(NUM_RE, '#');
  for (const added of socketed.flatMap((s) => s.mods)) {
    const at = lines.findIndex(({ line }) => wording(line) === wording(added));
    if (at === -1) continue;
    const minus = (added.match(NUM_RE) ?? []).map(Number);
    const left = (lines[at].line.match(NUM_RE) ?? []).map((n, k) => Number(n) - (minus[k] ?? 0));
    if (left.every((n) => n <= 0)) {
      lines.splice(at, 1);
      continue;
    }
    let k = 0;
    const roll = lines[at].roll;
    lines[at] = {
      line: lines[at].line.replace(NUM_RE, () => String(left[k++])),
      roll: roll && roll[0] !== null ? [Math.max(0, roll[0] - (minus[0] ?? 0)), roll[1], roll[2]] : roll,
    };
  }
  return lines;
}

/**
 * A worn rare/crafted item (or a socketed rare jewel) as the clipboard item JSON the rare appraisal parses: each
 * line as a printf-style stat with its roll range, corruption-changed lines flagged. Null for other qualities.
 */
export function buildItemClipboard(
  item: Pick<EquippedItem, 'name' | 'quality' | 'base' | 'sockets' | 'ethereal' | 'corrupted' | 'mods'> &
    Partial<Pick<EquippedItem, 'itemLevel' | 'rolls' | 'corruptedMods' | 'socketed'>>,
): ClipboardItem | null {
  const quality = APPRAISED_QUALITIES[item.quality];
  if (!quality || !item.base) return null;
  const corruptedLines = new Set(item.corruptedMods ?? []);
  const stats: ClipboardStat[] = [];
  if (item.corrupted) stats.push({ stat_id: 360, name: 'Corrupted' });
  for (const { line, roll } of ownModLines(item.mods, item.rolls, item.socketed ?? [])) {
    if (STATE_LINE.test(line.trim())) continue;
    const stat = modifierStat({
      name: '',
      label: line,
      corrupted: corruptedLines.has(line),
      ...(roll && { min: roll[1], max: roll[2] }),
    });
    if (stat) stats.push(stat);
  }
  return {
    name: item.name,
    quality,
    type: item.base,
    ...(item.itemLevel != null && { iLevel: item.itemLevel }),
    sockets: item.sockets,
    isEthereal: item.ethereal,
    stats,
  };
}

interface RareRequest {
  key: string;
  text: string;
}

/** The appraisals an item needs: itself when rare/crafted, and each socketed rare jewel. */
interface ItemRequests {
  own: RareRequest | null;
  jewels: RareRequest[];
}

const request = (clip: ClipboardItem | null, realm: string): RareRequest | null => {
  if (!clip) return null;
  const text = JSON.stringify(clip);
  return { key: `${realm}|${text}`, text };
};

/** Appraisals per item of the character (items needing none are left out). */
export function rareRequestsOf(detail: CharacterDetail, realm: string): Map<EquippedItem, ItemRequests> {
  const out = new Map<EquippedItem, ItemRequests>();
  for (const item of [...detail.equipped, ...(detail.merc?.equipped ?? []), ...(detail.charms ?? [])]) {
    const own = request(buildItemClipboard(item), realm);
    const jewels = item.socketed.flatMap((s) => {
      const jewel = s.key.startsWith('base:jew:')
        ? request(
            buildItemClipboard({
              name: s.name,
              quality: s.quality ?? '',
              base: 'Jewel',
              sockets: 0,
              ethereal: false,
              corrupted: false,
              mods: s.mods,
            }),
            realm,
          )
        : null;
      return jewel ? [jewel] : [];
    });
    if (own || jewels.length) out.set(item, { own, jewels });
  }
  return out;
}

/** The appraised value of a request: the band midpoint, only for a ready, normal-confidence estimate. */
function appraisedHr(req: RareRequest): { hr: number; band?: { lowHr: number; highHr: number } } | null {
  const entry = getRareEntry(req.key);
  const estimate = entry?.status === 'ready' ? entry.estimate : null;
  if (!estimate || estimate.confidence !== 'normal') return null;
  return { hr: estimate.hr, band: estimate.band };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The character with appraised rare values added to its items' `priceHr` (and the gear value: worn + merc).
 * Reads the shared rare estimate cache; items still waiting or without a confident appraisal are unchanged.
 */
export function applyRarePrices(
  detail: CharacterDetail,
  requests: ReadonlyMap<EquippedItem, ItemRequests>,
): ValuedCharacter {
  let delta = 0;
  const priced = <T extends EquippedItem & { priceHr: number | null }>(items: T[], inGearValue: boolean) =>
    items.map((item): RareValued<T> => {
      const reqs = requests.get(item);
      if (!reqs) return item;
      const own = reqs.own && appraisedHr(reqs.own);
      const jewelsHr = round2(reqs.jewels.reduce((sum, jewel) => sum + (appraisedHr(jewel)?.hr ?? 0), 0));
      if (!own && !jewelsHr) return item;
      const added = (own?.hr ?? 0) + jewelsHr;
      if (inGearValue) delta += added;
      return {
        ...item,
        priceHr: round2((item.priceHr ?? 0) + added),
        rareValue: { ...(own?.band && { band: own.band }), ...(jewelsHr > 0 && { jewelsHr }) },
      };
    });
  const equipped = priced(detail.equipped, true);
  const merc = detail.merc ? { ...detail.merc, equipped: priced(detail.merc.equipped, true) } : null;
  const charms = detail.charms && priced(detail.charms, false);
  return {
    ...detail,
    equipped,
    merc,
    ...(charms && { charms }),
    gearValueHr: detail.gearValueHr === null && delta === 0 ? null : round2((detail.gearValueHr ?? 0) + delta),
  };
}

/**
 * A current-season character with its rare/crafted gear and socketed rare jewels valued by the rare appraisal
 * (batched with every other appraisal asked this tick, cached app-wide). Builds are ladder characters.
 */
export function useRarePrices(detail: CharacterDetail | null): ValuedCharacter | null {
  const version = useSyncExternalStore(subscribeRareEstimates, rareEstimatesVersion);
  const realm = detail?.mode === 'hardcore' ? 'L|HC' : 'L|SC';
  // Keyed by `detail`'s items, so a new detail asks again; the estimates themselves come from the shared cache
  const requests = useMemo(() => {
    const season = getCurrentSeason();
    return detail && season && detail.season === season.id
      ? rareRequestsOf(detail, realm)
      : new Map<EquippedItem, ItemRequests>();
  }, [detail, realm]);

  useEffect(() => {
    for (const { own, jewels } of requests.values()) {
      for (const req of own ? [own, ...jewels] : jewels) {
        if (isRareEntryStale(req.key)) void requestRareEstimate(req.key, req.text, realm);
      }
    }
  }, [requests, realm, version]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` re-reads the estimate cache
  return useMemo(() => (detail ? applyRarePrices(detail, requests) : null), [detail, requests, version]);
}
