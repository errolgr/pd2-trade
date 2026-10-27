/**
 * Resolves each whisper sender's in-game account to the pd2trader.com user that owns it (lib/seller-lookup),
 * so a whisper from a trader you have no offer or DM with still links to their website profile instead of
 * standing alone as an in-game-only thread.
 *
 * Settled lookups (owners and misses) are kept across launches, owners for OWNER_TTL_MS and misses for
 * MISS_TTL_MS. Lookups run one at a time, LOOKUP_GAP_MS apart, because they share the market service's
 * per-IP rate limit (60/min) with the market browser and saved-search alerts; a failed one waits (the
 * service's Retry-After, else RETRY_DELAY_MS) and is retried, and is never remembered as a miss.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { normalizeName, whisperTarget, type WhisperPerson } from '@/lib/whisper-history';
import { lookupSellerByName, modesFrom, type MarketMode, type ResolvedSeller } from '../lib/seller-lookup';

/** Minimum time between two lookup requests: at most 10 a minute, a sixth of the service's per-IP limit. */
export const LOOKUP_GAP_MS = 6000;
export const OWNER_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MISS_TTL_MS = 24 * 60 * 60 * 1000;
export const STORAGE_KEY = 'pd2trader.resolvedSellers.v1';
/** Wait after a failed lookup when the service named none. */
export const RETRY_DELAY_MS = 30_000;
/** Failed attempts per account before it waits for the next change to the whisper history. */
const MAX_ATTEMPTS = 3;

interface Item {
  key: string;
  sellerName: string;
  mode: MarketMode;
}

interface Settled {
  seller: ResolvedSeller | null;
  at: number;
}

const isSeller = (s: unknown): s is ResolvedSeller =>
  !!s &&
  typeof s === 'object' &&
  typeof (s as ResolvedSeller).userId === 'string' &&
  typeof (s as ResolvedSeller).username === 'string' &&
  Array.isArray((s as ResolvedSeller).accounts) &&
  (s as ResolvedSeller).accounts.every((a) => typeof a === 'string');

/** Stored lookups still within their TTL; empty when storage is unavailable or unreadable. */
function loadSettled(now: number): Map<string, Settled> {
  const out = new Map<string, Settled>();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    for (const [key, entry] of Object.entries(raw)) {
      const { seller, at } = (entry ?? {}) as Partial<Settled>;
      if (typeof at !== 'number' || (seller !== null && !isSeller(seller))) continue;
      if (now - at < (seller ? OWNER_TTL_MS : MISS_TTL_MS)) out.set(key, { seller, at });
    }
  } catch {
    // Unreadable storage: look everyone up again
  }
  return out;
}

function saveSettled() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(settled)));
  } catch {
    // Storage full or blocked: lookups are only kept for this session
  }
}

/** Settled lookups by normalized account: the owner, or null when nobody owns it. */
const settled = loadSettled(Date.now());
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
      settled.set(item.key, { seller: result.status === 'found' ? result.seller : null, at: Date.now() });
      saveSettled();
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

/** Forgets every lookup (stored ones too) and stops the queue. For tests. */
export function _resetResolvedSellers() {
  generation += 1;
  settled.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // No storage to clear
  }
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
      const seller = settled.get(normalizeName(sellerNameFor(person)))?.seller;
      if (seller) resolved.set(person.key, seller);
    }
    return resolved;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settledVersion: re-read once a lookup settles
  }, [people, settledVersion]);
}
