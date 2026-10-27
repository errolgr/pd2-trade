/**
 * Resolves each whisper sender's in-game account to the pd2trader.com user that owns it (lib/seller-lookup),
 * so a whisper from a trader you have no offer or DM with still links to their website profile instead of
 * standing alone as an in-game-only thread.
 *
 * One settled lookup per account per app session (owners and misses both remembered). Lookups run one at a
 * time, LOOKUP_GAP_MS apart, because they share the market service's per-IP rate limit with the market
 * browser; a failed one waits (the service's Retry-After, else RETRY_DELAY_MS) and is retried, and is never
 * remembered as a miss.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { normalizeName, whisperTarget, type WhisperPerson } from '@/lib/whisper-history';
import { lookupSellerByName, modesFrom, type MarketMode, type ResolvedSeller } from '../lib/seller-lookup';

/** Minimum time between two lookup requests. */
export const LOOKUP_GAP_MS = 2000;
/** Wait after a failed lookup when the service named none. */
export const RETRY_DELAY_MS = 30_000;
/** Failed attempts per account before it waits for the next change to the whisper history. */
const MAX_ATTEMPTS = 3;

interface Item {
  key: string;
  sellerName: string;
  mode: MarketMode;
}

/** Settled lookups by normalized account: the owner, or null when nobody owns it. */
const settled = new Map<string, ResolvedSeller | null>();
const queue: Item[] = [];
const attempts = new Map<string, number>();
let inFlight: string | null = null;
let running = false;
let lastRequestAt = 0;
/** Bumped by a reset, so a drain from before it stops. */
let generation = 0;

const listeners = new Set<() => void>();
let version = 0;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getVersion = () => version;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function pace() {
  const wait = lastRequestAt + LOOKUP_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function drain(gen: number) {
  running = true;
  try {
    while (gen === generation && queue.length > 0) {
      const item = queue.shift()!;
      if (settled.has(item.key)) continue;
      inFlight = item.key;
      const result = await lookupSellerByName(item.sellerName, { modes: modesFrom(item.mode), beforeRequest: pace });
      inFlight = null;
      if (gen !== generation) return;
      if (result.status === 'failed') {
        const tries = (attempts.get(item.key) ?? 0) + 1;
        if (tries < MAX_ATTEMPTS) {
          attempts.set(item.key, tries);
          queue.push(item);
        } else {
          attempts.delete(item.key);
        }
        await sleep(result.retryAfterMs ?? RETRY_DELAY_MS);
        continue;
      }
      attempts.delete(item.key);
      settled.set(item.key, result.status === 'found' ? result.seller : null);
      version += 1;
      listeners.forEach((listener) => listener());
    }
  } finally {
    if (gen === generation) running = false;
  }
}

/** Queues what is not settled, queued or in flight; `priority` (an account key) goes to the front. */
function enqueue(items: readonly Item[], priority: string | undefined) {
  for (const item of items) {
    if (settled.has(item.key) || item.key === inFlight) continue;
    const at = queue.findIndex((queued) => queued.key === item.key);
    if (item.key === priority) {
      if (at >= 0) queue.splice(at, 1);
      queue.unshift(item);
    } else if (at < 0) {
      queue.push(item);
    }
  }
  if (!running && queue.length > 0) void drain(generation);
}

/** Forgets every lookup and stops the queue. For tests. */
export function _resetResolvedSellers() {
  generation += 1;
  settled.clear();
  queue.length = 0;
  attempts.clear();
  inFlight = null;
  running = false;
  lastRequestAt = 0;
  version += 1;
  listeners.forEach((listener) => listener());
}

/** The account to look a person up by: the one whispers to them go to. */
const sellerNameFor = (person: WhisperPerson) => whisperTarget(person);

/**
 * The website user owning each whisper sender's account, by person key; senders not resolved (yet) are left
 * out, and the map changes identity only when `people` does or a lookup settles. Nothing is looked up while
 * `enabled` is false. `mode` is searched first; `priorityKey` (a person key, e.g. the open thread's sender)
 * is looked up before the rest.
 */
export function useResolvedSellers(
  people: Readonly<Record<string, WhisperPerson>>,
  { enabled, mode, priorityKey }: { enabled: boolean; mode: MarketMode; priorityKey?: string },
): ReadonlyMap<string, ResolvedSeller> {
  const settledVersion = useSyncExternalStore(subscribe, getVersion);
  const { hardcore, ladder } = mode;

  useEffect(() => {
    if (!enabled) return;
    const items: Item[] = [];
    let priority: string | undefined;
    for (const person of Object.values(people)) {
      const sellerName = sellerNameFor(person);
      const key = normalizeName(sellerName);
      if (!key) continue;
      if (person.key === priorityKey) priority = key;
      if (!settled.has(key)) items.push({ key, sellerName, mode: { hardcore, ladder } });
    }
    if (items.length > 0) enqueue(items, priority);
  }, [people, enabled, hardcore, ladder, priorityKey]);

  return useMemo(() => {
    const resolved = new Map<string, ResolvedSeller>();
    for (const person of Object.values(people)) {
      const seller = settled.get(normalizeName(sellerNameFor(person)));
      if (seller) resolved.set(person.key, seller);
    }
    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settledVersion: re-read once a lookup settles
  }, [people, settledVersion]);
}
