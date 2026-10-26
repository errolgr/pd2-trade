/**
 * Rare/crafted listing appraisals via `POST /api/rares/appraisal/batch`, cached app-wide by item key
 * (realm + clipboard text, see `rareRequest`). Every caller in the same tick shares one batch per realm;
 * batches of one realm are sent one after another (≤ MAX_BATCH_ITEMS each).
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { reportApiError } from '@/lib/error-reporting';
import type { CraftRecipe, RareAppraisal } from '@/lib/rare-appraisal-api';
import { marketSource, bandRange } from '@/components/rares/rares-format';
import { rareEstimate, type Estimate } from './deal';

/** Server cap per batch request. */
export const MAX_BATCH_ITEMS = 100;
/** Appraisals move with the market slowly; refetch after this long, showing the cached one meanwhile. */
const CACHE_TTL_MS = 30 * 60_000;
/** A failed batch is retried this long after the failure. */
const ERROR_RETRY_MS = 60_000;

/** One batch entry (server `RareAppraisalBatchResult`). */
export interface RareBatchResult {
  index: number;
  appraisal?: RareAppraisal | null;
  reason?: string | null;
  quality?: 'Rare' | 'Crafted';
  recipe?: CraftRecipe | null;
  error?: { code: 'invalid_item'; message: string };
}

export class BatchHttpError extends Error {
  constructor(readonly status: number) {
    super(`Rare appraisal batch API error: ${status}`);
  }
}

/**
 * Appraise up to MAX_BATCH_ITEMS clipboard texts of one realm. Resolves null when the feature is off on the
 * server (404); other failures reject.
 */
export async function fetchRareAppraisalBatch(
  texts: string[],
  opts: { isLadder: boolean; isHardcore: boolean },
): Promise<RareBatchResult[] | null> {
  const response = await fetch(`${BACKEND_URL}/api/rares/appraisal/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: texts.map((text) => ({ text })),
      isLadder: opts.isLadder,
      isHardcore: opts.isHardcore,
    }),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new BatchHttpError(response.status);
  const body = (await response.json()) as { results?: unknown };
  if (!Array.isArray(body?.results)) throw new Error('Rare appraisal batch API: malformed body');
  return body.results as RareBatchResult[];
}

/** A cached appraisal: the estimate (null: none) and the appraisal itself (detail pane; its id keys the history). */
export interface RareEntry {
  /** 'off': the feature is disabled on the server. 'error': the request failed (retried after ERROR_RETRY_MS). */
  status: 'ready' | 'off' | 'error';
  estimate: Estimate | null;
  appraisal: RareAppraisal | null;
  at: number;
}

const cache = new Map<string, RareEntry>();
const inflight = new Map<string, Promise<void>>();
/** Items requested this tick, per realm, flushed in a microtask. */
const pending = new Map<string, { items: Map<string, string>; done: Promise<void> }>();
/** Realms whose earlier batches are still sending; the next one waits for them (no request storms). */
const realmQueue = new Map<string, Promise<void>>();

const listeners = new Set<() => void>();
let version = 0;
function publish() {
  version += 1;
  for (const listener of listeners) listener();
}
export const subscribeRareEstimates = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const rareEstimatesVersion = () => version;

export function getRareEntry(key: string): RareEntry | undefined {
  return cache.get(key);
}

export function isRareEntryStale(key: string, now = Date.now()): boolean {
  const hit = cache.get(key);
  return !hit || now - hit.at >= (hit.status === 'error' ? ERROR_RETRY_MS : CACHE_TTL_MS);
}

function estimateDetail(appraisal: RareAppraisal): string | undefined {
  if (!appraisal.market) return undefined;
  const band = `~${bandRange(appraisal.market.lowHr, appraisal.market.highHr)} HR`;
  const source = marketSource(appraisal);
  return [band, source, `${appraisal.market.sampleSize} listings`].filter(Boolean).join(' · ');
}

async function sendChunk(realm: string, chunk: Array<[string, string]>) {
  const [ladder, hardcore] = realm.split('|');
  try {
    const results = await fetchRareAppraisalBatch(
      chunk.map(([, text]) => text),
      { isLadder: ladder === 'L', isHardcore: hardcore === 'HC' },
    );
    const at = Date.now();
    if (!results) {
      for (const [key] of chunk) cache.set(key, { status: 'off', estimate: null, appraisal: null, at });
      return;
    }
    const byIndex = new Map(results.map((r) => [r.index, r]));
    chunk.forEach(([key], i) => {
      const r = byIndex.get(i);
      // An entry the server rejected or skipped has no estimate (cached: retrying won't change it).
      const appraisal = r && !r.error ? (r.appraisal ?? null) : null;
      cache.set(key, {
        status: 'ready',
        estimate: appraisal ? rareEstimate(appraisal, r?.reason, estimateDetail(appraisal)) : null,
        appraisal,
        at,
      });
    });
  } catch (err) {
    // Kept briefly as 'error' (no estimate), then retried by the next render that asks for it.
    const at = Date.now();
    for (const [key] of chunk) {
      // A stale estimate stays on screen rather than flipping to unknown.
      if (cache.get(key)?.status !== 'ready') cache.set(key, { status: 'error', estimate: null, appraisal: null, at });
    }
    const error = err instanceof Error ? err : new Error(String(err));
    const status = err instanceof BatchHttpError ? err.status : undefined;
    reportApiError(error, 'rare-appraisal-api', 'api/rares/appraisal/batch', status);
  }
}

async function flush(realm: string, items: Map<string, string>) {
  const entries = [...items];
  for (let i = 0; i < entries.length; i += MAX_BATCH_ITEMS) {
    await sendChunk(realm, entries.slice(i, i + MAX_BATCH_ITEMS));
  }
  publish();
}

/** Queue one item into this tick's batch for its realm, or join the request already appraising it. */
export function requestRareEstimate(key: string, text: string, realm: string): Promise<void> {
  const running = inflight.get(key);
  if (running) return running;
  let batch = pending.get(realm);
  if (!batch) {
    const items = new Map<string, string>();
    const done = Promise.resolve().then(() => {
      pending.delete(realm);
      const previous = realmQueue.get(realm) ?? Promise.resolve();
      const run = previous.then(() => flush(realm, items));
      realmQueue.set(realm, run);
      return run.finally(() => {
        if (realmQueue.get(realm) === run) realmQueue.delete(realm);
      });
    });
    batch = { items, done };
    pending.set(realm, batch);
  }
  batch.items.set(key, text);
  const done = batch.done.finally(() => inflight.delete(key));
  inflight.set(key, done);
  return done;
}

/** Test hook: forget every cached appraisal. */
export function clearRareEstimates() {
  cache.clear();
  inflight.clear();
  pending.clear();
  realmQueue.clear();
}
