/**
 * Client for the pd2trader catalog search (`GET /api/search`): typo- and nickname-tolerant item lookup. Wire
 * shapes mirror the server's src/catalog/catalog.types.ts; keep them in sync.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';

/** One price-tracked item of the server catalog (only the fields the overlay reads). */
export interface CatalogItem {
  baseCode: string;
  name: string;
  /** 'Unique' | 'Set' | 'Normal' | null ... */
  quality: string | null;
}

/** A ranked hit: what matched it — the base code, the name, one of its aliases (nicknames), or a fuzzy (typo) match. */
export interface CatalogSearchHit {
  item: CatalogItem;
  /** Relevance, higher is better; fuzzy hits score 100 + 299 × similarity (0-1). */
  score: number;
  matchedOn: 'code' | 'name' | 'alias' | 'fuzzy';
}

/** The search failed: unreachable, a non-2xx answer (`status`) or an unreadable reply. */
export class CatalogSearchError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'CatalogSearchError';
  }
}

const MATCHES: Record<CatalogSearchHit['matchedOn'], true> = { code: true, name: true, alias: true, fuzzy: true };
const isMatch = (v: unknown): v is CatalogSearchHit['matchedOn'] =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(MATCHES, v);

function parseHit(raw: unknown): CatalogSearchHit | null {
  if (!raw || typeof raw !== 'object') return null;
  const { item, score, matchedOn } = raw as { item?: Record<string, unknown>; score?: unknown; matchedOn?: unknown };
  if (!item || typeof item.name !== 'string' || typeof item.baseCode !== 'string') return null;
  return {
    item: {
      baseCode: item.baseCode,
      name: item.name,
      quality: typeof item.quality === 'string' ? item.quality : null,
    },
    score: typeof score === 'number' && Number.isFinite(score) ? score : 0,
    matchedOn: isMatch(matchedOn) ? matchedOn : 'name',
  };
}

/**
 * Ranked catalog hits for `query` (best first). Rejects with CatalogSearchError or, when `signal` aborts, with
 * the abort reason.
 */
export async function searchCatalog(
  query: string,
  { limit, signal }: { limit: number; signal?: AbortSignal },
): Promise<CatalogSearchHit[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/search?${params}`, { signal });
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    throw new CatalogSearchError(
      `Couldn't reach the catalog search: ${error instanceof Error ? error.message : error}`,
    );
  }
  if (!response.ok) throw new CatalogSearchError(`The catalog search answered ${response.status}.`, response.status);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (signal?.aborted) throw signal.reason;
    throw new CatalogSearchError('The catalog search sent an unreadable reply.', response.status);
  }
  const hits = (body as { hits?: unknown } | null)?.hits;
  if (!Array.isArray(hits))
    throw new CatalogSearchError('The catalog search sent an unreadable reply.', response.status);
  return hits.map(parseHit).filter((h): h is CatalogSearchHit => h !== null);
}
