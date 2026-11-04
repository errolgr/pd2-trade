import { z } from 'zod';
import { CATEGORIES, PERMISSIONS, type Category, type Permission } from '@pd2-trader/plugin-sdk';
import { BACKEND_URL } from '@/lib/pkce';
import { fetch as appFetch } from '@/lib/browser-http';

/**
 * Marketplace HTTP client (server: pd2-price-crawler PluginsModule, base `/api/plugins`, contract "marketplace
 * v2"). Responses are outside data and validated here; anything malformed is an error, never a partial install.
 * Relative URLs the server sends (bundles, screenshots, icons on the local storage driver) are resolved against
 * the backend here, so callers only ever see absolute URLs.
 */

export const MARKETPLACE_BASE = `${BACKEND_URL}/api/plugins`;

/** `GET /api/plugins?sort=`: `relevance` is the server default with `q`, `popular` without. */
export const LISTING_SORTS = ['relevance', 'popular', 'trending', 'rating', 'new', 'updated', 'name'] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

export const REVIEW_SORTS = ['recent', 'highest', 'lowest'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export const REPORT_REASONS = [
  'malware',
  'privacy',
  'broken',
  'misleading',
  'spam',
  'offensive',
  'tos',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface Screenshot {
  file: string;
  /** Absolute (resolved against the backend when the server sent a relative path). */
  url: string;
  type: 'image/png' | 'image/jpeg' | 'image/webp';
  width: number;
  height: number;
  caption: string | null;
}

export interface ListingRating {
  average: number | null;
  count: number;
}

export interface Listing {
  id: string;
  name: string;
  summary: string;
  author: string;
  category: Category;
  tags: string[];
  iconUrl: string | null;
  screenshots: Screenshot[];
  /** null while no version is approved. */
  latestVersion: string | null;
  permissions: Permission[];
  network: string[];
  /** SDK range of the latest version. */
  sdk: string | null;
  /** Whether this overlay's SDK satisfies `sdk` (null = unknown). */
  compatible: boolean | null;
  installs: number;
  weeklyInstalls: number;
  rating: ListingRating;
  /** Admin-verified developer. */
  verified: boolean;
  repo: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ListingPage {
  items: Listing[];
  nextCursor: string | null;
}

export interface PermissionChanges {
  permissionsAdded: string[];
  permissionsRemoved: string[];
  hostsAdded: string[];
  hostsRemoved: string[];
}

export interface ListingVersion {
  version: string;
  publishedAt: string;
  /** Strings, not `Permission`: a version built for a newer SDK may declare permissions this app does not know. */
  permissions: string[];
  network: string[];
  sdk: string | null;
  compatible: boolean | null;
  /** Server-sanitized HTML (render only this field, never markdown or other text as HTML). */
  changelogHtml: string | null;
  /** Versus the previous approved version. */
  changes: PermissionChanges;
}

export interface ListingDetail extends Listing {
  description: string | null;
  /** Server-sanitized HTML of `description` (p, h2-h4, lists, emphasis, code, blockquote, hr, https links, tables). */
  descriptionHtml: string | null;
  /** Approved versions, newest first. */
  versions: ListingVersion[];
}

export interface Collection {
  slug: string;
  title: string;
  description: string | null;
  items: Listing[];
}

export interface CategoryCount {
  slug: Category;
  label: string;
  count: number;
}

export interface DiscoverPage {
  collections: Collection[];
  trending: Listing[];
  new: Listing[];
  updated: Listing[];
  categories: CategoryCount[];
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  body: string;
  /** The version the reviewer had installed. */
  version: string;
  createdAt: string;
  updatedAt: string;
  reply: { body: string; at: string } | null;
}

export type RatingHistogram = Record<'1' | '2' | '3' | '4' | '5', number>;

export interface ReviewSummary {
  average: number | null;
  count: number;
  histogram: RatingHistogram;
}

export interface ReviewPage {
  items: Review[];
  nextCursor: string | null;
  summary: ReviewSummary;
}

export interface ReviewInput {
  rating: number;
  body: string;
  version: string;
}

export interface ReportInput {
  reason: ReportReason;
  details?: string;
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

/** Non-2xx answer; `status` lets callers tell 409 (already reported) or 401 (signed out) apart. */
export class MarketplaceHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MarketplaceHttpError';
  }
}

// Schemas are cast to the interfaces above: zod's inferred types turn every property optional without
// strictNullChecks (this app's tsconfig).
const screenshotSchema = z.object({
  file: z.string(),
  url: z.string().min(1),
  type: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  width: z.number(),
  height: z.number(),
  caption: z.string().nullable().default(null),
});

const listingSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string().default(''),
  author: z.string().default(''),
  category: z.enum(CATEGORIES).catch('utility'),
  tags: z.array(z.string()).default([]),
  iconUrl: z.string().nullable().default(null),
  screenshots: z.array(screenshotSchema).default([]),
  latestVersion: z.string().nullable().default(null),
  permissions: z.array(z.enum(PERMISSIONS)).default([]),
  network: z.array(z.string()).default([]),
  sdk: z.string().nullable().default(null),
  compatible: z.boolean().nullable().default(null),
  installs: z.number().default(0),
  weeklyInstalls: z.number().default(0),
  rating: z
    .object({ average: z.number().nullable().default(null), count: z.number().default(0) })
    .default({ average: null, count: 0 }),
  verified: z.boolean().default(false),
  repo: z.string().nullable().default(null),
  approvedAt: z.string().nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  updatedAt: z.string().default(''),
});

const listPageSchema = z.object({
  items: z.array(listingSchema),
  nextCursor: z.string().nullable().default(null),
}) as unknown as z.ZodType<ListingPage>;

const changesSchema = z
  .object({
    permissionsAdded: z.array(z.string()).default([]),
    permissionsRemoved: z.array(z.string()).default([]),
    hostsAdded: z.array(z.string()).default([]),
    hostsRemoved: z.array(z.string()).default([]),
  })
  .default({ permissionsAdded: [], permissionsRemoved: [], hostsAdded: [], hostsRemoved: [] });

const listingDetailSchema = listingSchema.extend({
  description: z.string().nullable().default(null),
  descriptionHtml: z.string().nullable().default(null),
  versions: z
    .array(
      z.object({
        version: z.string(),
        publishedAt: z.string(),
        permissions: z.array(z.string()).default([]),
        network: z.array(z.string()).default([]),
        sdk: z.string().nullable().default(null),
        compatible: z.boolean().nullable().default(null),
        changelogHtml: z.string().nullable().default(null),
        changes: changesSchema,
      }),
    )
    .default([]),
}) as unknown as z.ZodType<ListingDetail>;

const discoverSchema = z.object({
  collections: z
    .array(
      z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string().nullable().default(null),
        items: z.array(listingSchema),
      }),
    )
    .default([]),
  trending: z.array(listingSchema).default([]),
  new: z.array(listingSchema).default([]),
  updated: z.array(listingSchema).default([]),
  // Categories this app does not know are dropped rather than failing the whole page.
  categories: z
    .array(z.object({ slug: z.string(), label: z.string(), count: z.number().default(0) }))
    .default([])
    .transform((list) => list.filter((c) => (CATEGORIES as readonly string[]).includes(c.slug))),
}) as unknown as z.ZodType<DiscoverPage>;

const reviewSchema = z.object({
  id: z.string(),
  author: z.string().default(''),
  rating: z.number().int().min(1).max(5),
  body: z.string().default(''),
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reply: z.object({ body: z.string(), at: z.string() }).nullable().default(null),
}) as unknown as z.ZodType<Review>;

const histogramSchema = z
  .object({
    '1': z.number().default(0),
    '2': z.number().default(0),
    '3': z.number().default(0),
    '4': z.number().default(0),
    '5': z.number().default(0),
  })
  .default({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });

const reviewPageSchema = z.object({
  items: z.array(reviewSchema),
  nextCursor: z.string().nullable().default(null),
  summary: z
    .object({
      average: z.number().nullable().default(null),
      count: z.number().default(0),
      histogram: histogramSchema,
    })
    .default({ average: null, count: 0, histogram: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } }),
}) as unknown as z.ZodType<ReviewPage>;

const myReviewSchema = z.object({ review: reviewSchema.nullable().default(null) }) as unknown as z.ZodType<{
  review: Review | null;
}>;

const reportResultSchema = z.object({ id: z.string(), status: z.string() }) as unknown as z.ZodType<{
  id: string;
  status: string;
}>;

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

export interface ListQuery {
  q?: string;
  category?: Category | null;
  tag?: string | null;
  sort?: ListingSort | null;
  cursor?: string | null;
}

export interface MarketplaceApi {
  base: string;
  list(query: ListQuery): Promise<ListingPage>;
  discover(): Promise<DiscoverPage>;
  get(id: string): Promise<ListingDetail>;
  reviews(id: string, query?: { sort?: ReviewSort; cursor?: string | null }): Promise<ReviewPage>;
  /** Signed-in user's review (PD2 bearer). */
  myReview(id: string, token: string): Promise<Review | null>;
  saveReview(id: string, token: string, input: ReviewInput): Promise<Review>;
  deleteReview(id: string, token: string): Promise<void>;
  reportPlugin(id: string, token: string, input: ReportInput): Promise<void>;
  reportReview(id: string, reviewId: string, token: string, input: ReportInput): Promise<void>;
  release(id: string, version: string): Promise<Release>;
  blocklist(): Promise<SignedBlocklist>;
  download(url: string): Promise<Uint8Array>;
  reportInstall(id: string, version: string): Promise<void>;
  reportError(id: string, version: string, kind: ErrorKind): Promise<void>;
  reportActive(id: string, version: string): Promise<void>;
}

type HttpFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Query string of `GET /api/plugins` (empty values are left out, so the server applies its defaults). */
export function listQueryString({ q, category, tag, sort, cursor }: ListQuery): string {
  const params = new URLSearchParams();
  if (q?.trim()) params.set('q', q.trim());
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (sort) params.set('sort', sort);
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function errorOf(response: Response, path: string): Promise<MarketplaceHttpError> {
  let message = `Marketplace ${path}: HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body?.message === 'string' && body.message) message = body.message;
    else if (Array.isArray(body?.message) && body.message.length) message = body.message.join(', ');
  } catch {
    // Not JSON: keep the status line.
  }
  return new MarketplaceHttpError(response.status, message);
}

export function createMarketplaceApi(base: string = MARKETPLACE_BASE, http: HttpFetch = appFetch): MarketplaceApi {
  const root = base.replace(/\/+$/, '');
  // Server URLs are absolute (CDN) or relative to the backend (local storage driver, `/api/...`).
  const absolute = (url: string) => new URL(url, `${root}/`).toString();
  const withUrls = <T extends Listing>(listing: T): T => ({
    ...listing,
    iconUrl: listing.iconUrl ? absolute(listing.iconUrl) : null,
    screenshots: listing.screenshots.map((s) => ({ ...s, url: absolute(s.url) })),
  });
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const send = async (path: string, init: RequestInit = {}): Promise<Response> => {
    const response = await http(`${root}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) throw await errorOf(response, path);
    return response;
  };
  const getJson = async <T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> =>
    schema.parse(await (await send(path, init)).json());
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
    list: async (query) => {
      const page = await getJson(`/${listQueryString(query)}`, listPageSchema);
      return { ...page, items: page.items.map(withUrls) };
    },
    discover: async () => {
      const page = await getJson('/discover', discoverSchema);
      return {
        ...page,
        collections: page.collections.map((c) => ({ ...c, items: c.items.map(withUrls) })),
        trending: page.trending.map(withUrls),
        new: page.new.map(withUrls),
        updated: page.updated.map(withUrls),
      };
    },
    get: async (id) => withUrls(await getJson(`/${enc(id)}`, listingDetailSchema)),
    reviews: (id, { sort, cursor } = {}) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (cursor) params.set('cursor', cursor);
      const qs = params.toString();
      return getJson(`/${enc(id)}/reviews${qs ? `?${qs}` : ''}`, reviewPageSchema);
    },
    myReview: async (id, token) =>
      (await getJson(`/${enc(id)}/reviews/mine`, myReviewSchema, { headers: auth(token) })).review,
    saveReview: (id, token, { rating, body, version }) =>
      getJson(`/${enc(id)}/reviews/mine`, reviewSchema, {
        method: 'PUT',
        headers: auth(token),
        body: JSON.stringify({ rating, body, version }),
      }),
    deleteReview: async (id, token) => {
      await send(`/${enc(id)}/reviews/mine`, { method: 'DELETE', headers: auth(token) });
    },
    reportPlugin: async (id, token, { reason, details }) => {
      await getJson(`/${enc(id)}/reports`, reportResultSchema, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(details ? { reason, details } : { reason }),
      });
    },
    reportReview: async (id, reviewId, token, { reason, details }) => {
      await getJson(`/${enc(id)}/reviews/${enc(reviewId)}/reports`, reportResultSchema, {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(details ? { reason, details } : { reason }),
      });
    },
    release: (id, version) => getJson(`/${enc(id)}/versions/${enc(version)}`, releaseSchema),
    blocklist: () => getJson('/blocklist', blocklistSchema),
    async download(url) {
      const response = await http(absolute(url));
      if (!response.ok) throw new Error(`Bundle download failed: HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    },
    reportInstall: (id, version) => post(`/${enc(id)}/installs`, { version }),
    reportError: (id, version, kind) => post(`/${enc(id)}/errors`, { version, kind }),
    reportActive: (id, version) => post(`/${enc(id)}/active`, { version }),
  };
}

export const marketplaceApi = createMarketplaceApi();
