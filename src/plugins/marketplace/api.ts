import { z } from 'zod';
import { CATEGORIES, PERMISSIONS, type Category, type Permission } from '@pd2-trader/plugin-sdk';
import { BACKEND_URL } from '@/lib/pkce';
import { fetch as appFetch } from '@/lib/browser-http';

/**
 * Marketplace HTTP client (server: pd2-price-crawler PluginsModule, base `/api/plugins`). Responses are
 * outside data and validated here; anything malformed is an error, never a partial install.
 */

export const MARKETPLACE_BASE = `${BACKEND_URL}/api/plugins`;

export interface Listing {
  id: string;
  name: string;
  summary: string;
  author: string;
  category: Category;
  iconUrl?: string | null;
  latestVersion: string;
  permissions: Permission[];
  network: string[];
  installs: number;
  rating?: number | null;
  verified: boolean;
}

export interface ListingPage {
  items: Listing[];
  nextCursor?: string | null;
}

export interface ListingVersion {
  version: string;
  publishedAt: string;
  permissions: string[];
  network: string[];
  status?: string;
}

export interface ListingDetail extends Listing {
  versions: ListingVersion[];
}

export interface Release {
  manifest: unknown;
  bundleUrl: string;
  sha256: string;
  signature: string;
  publishedAt: string;
}

export interface BlocklistEntry {
  id: string;
  versions: '*' | string[];
  reason: string;
}

export interface SignedBlocklist {
  entries: BlocklistEntry[];
  issuedAt: string;
  signature: string;
}

// Schemas are cast to the interfaces above: zod's inferred types turn every property optional without
// strictNullChecks (this app's tsconfig).
const listingSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().default(''),
  author: z.string().default(''),
  category: z.enum(CATEGORIES).catch('utility'),
  iconUrl: z.string().nullable().optional(),
  latestVersion: z.string(),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
  network: z.array(z.string()).default([]),
  installs: z.number().default(0),
  rating: z.number().nullable().optional(),
  verified: z.boolean().default(false),
});

const listPageSchema = z.object({ items: z.array(listingSchema), nextCursor: z.string().nullable().optional() }) as unknown as z.ZodType<ListingPage>;

const listingDetailSchema = listingSchema.extend({
  versions: z
    .array(
      z.object({
        version: z.string(),
        publishedAt: z.string(),
        permissions: z.array(z.string()).default([]),
        network: z.array(z.string()).default([]),
        status: z.string().optional(),
      }),
    )
    .default([]),
}) as unknown as z.ZodType<ListingDetail>;

const releaseSchema = z.object({
  manifest: z.unknown(),
  bundleUrl: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-fA-F]{64}$/),
  signature: z.string().min(1),
  publishedAt: z.string(),
}) as unknown as z.ZodType<Release>;

const blocklistSchema = z.object({
  entries: z.array(
    z.object({ id: z.string(), versions: z.union([z.literal('*'), z.array(z.string())]), reason: z.string() }),
  ),
  issuedAt: z.string(),
  signature: z.string(),
}) as unknown as z.ZodType<SignedBlocklist>;

export type ErrorKind = 'timeout' | 'crash' | 'invalid-ui' | 'auto-disabled';

export interface MarketplaceApi {
  base: string;
  list(query: { q?: string; category?: string; cursor?: string | null }): Promise<ListingPage>;
  get(id: string): Promise<ListingDetail>;
  release(id: string, version: string): Promise<Release>;
  blocklist(): Promise<SignedBlocklist>;
  download(url: string): Promise<Uint8Array>;
  reportInstall(id: string, version: string): Promise<void>;
  reportError(id: string, version: string, kind: ErrorKind): Promise<void>;
  reportActive(id: string, version: string): Promise<void>;
}

type HttpFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function createMarketplaceApi(base: string = MARKETPLACE_BASE, http: HttpFetch = appFetch): MarketplaceApi {
  const root = base.replace(/\/+$/, '');
  const getJson = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
    const response = await http(`${root}${path}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Marketplace ${path}: HTTP ${response.status}`);
    return schema.parse(await response.json());
  };
  const post = async (path: string, body: unknown) => {
    try {
      await http(`${root}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Counters are best-effort.
    }
  };
  const enc = encodeURIComponent;
  return {
    base: root,
    list: ({ q, category, cursor }) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (cursor) params.set('cursor', cursor);
      const qs = params.toString();
      return getJson(`/${qs ? `?${qs}` : ''}`, listPageSchema);
    },
    get: (id) => getJson(`/${enc(id)}`, listingDetailSchema),
    release: (id, version) => getJson(`/${enc(id)}/versions/${enc(version)}`, releaseSchema),
    blocklist: () => getJson('/blocklist', blocklistSchema),
    async download(url) {
      // bundleUrl is absolute (CDN) or relative to the backend (local storage driver).
      const absolute = new URL(url, `${root}/`).toString();
      const response = await http(absolute);
      if (!response.ok) throw new Error(`Bundle download failed: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    },
    reportInstall: (id, version) => post(`/${enc(id)}/installs`, { version }),
    reportError: (id, version, kind) => post(`/${enc(id)}/errors`, { version, kind }),
    reportActive: (id, version) => post(`/${enc(id)}/active`, { version }),
  };
}

export const marketplaceApi = createMarketplaceApi();
