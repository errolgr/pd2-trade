import type { FetchParams, FetchResult } from '@pd2-trader/plugin-sdk';

/**
 * Proxied `fetch` for plugins (PRD §6.1 Network). The sandbox has `connect-src 'none'`; this is the only
 * egress. Rules: https only, default port, hostname exactly one of the consented manifest.network hosts, no
 * cookies/credentials, no redirects (a redirect could leave the allowlist), bounded request and response.
 */

export const FETCH_TIMEOUT_MS = 10_000;
export const MAX_REQUEST_BODY = 64 * 1024;
export const MAX_RESPONSE_BODY = 1024 * 1024;
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const BLOCKED_REQUEST_HEADERS =
  /^(cookie|cookie2|host|origin|referer|connection|content-length|proxy-.*|sec-.*|x-forwarded-.*)$/i;
const EXPOSED_RESPONSE_HEADERS = /^(content-type|cache-control|etag|last-modified|retry-after|x-ratelimit-.*)$/i;

export class FetchDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchDeniedError';
  }
}

/** Throws FetchDeniedError unless the request is allowed; returns the normalized URL. */
export function checkFetch(params: FetchParams, allowedHosts: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(params.url);
  } catch {
    throw new FetchDeniedError('Invalid URL');
  }
  if (url.protocol !== 'https:') throw new FetchDeniedError('Only https:// URLs are allowed');
  if (url.username || url.password) throw new FetchDeniedError('URLs with credentials are not allowed');
  if (url.port) throw new FetchDeniedError('Custom ports are not allowed');
  if (!allowedHosts.includes(url.hostname.toLowerCase()))
    throw new FetchDeniedError(`Host ${url.hostname} is not declared in the manifest network list`);
  const method = (params.method ?? 'GET').toUpperCase();
  if (!METHODS.has(method)) throw new FetchDeniedError(`Method ${method} is not allowed`);
  if (params.body !== undefined && typeof params.body !== 'string') throw new FetchDeniedError('Body must be a string');
  if (params.body && new TextEncoder().encode(params.body).length > MAX_REQUEST_BODY)
    throw new FetchDeniedError('Request body too large');
  return url;
}

export async function proxiedFetch(
  params: FetchParams,
  allowedHosts: readonly string[],
  httpFetch: (url: string, init: RequestInit & { maxRedirections?: number }) => Promise<Response>,
): Promise<FetchResult> {
  const url = checkFetch(params, allowedHosts);
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(params.headers ?? {})) {
    if (typeof value !== 'string' || BLOCKED_REQUEST_HEADERS.test(name)) continue;
    headers[name] = value;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await httpFetch(url.toString(), {
      method: (params.method ?? 'GET').toUpperCase(),
      headers,
      body: params.body,
      credentials: 'omit',
      redirect: 'manual',
      referrerPolicy: 'no-referrer',
      maxRedirections: 0,
      signal: controller.signal,
    });
    if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400))
      throw new FetchDeniedError('Redirects are not followed');
    const body = await response.text();
    if (body.length > MAX_RESPONSE_BODY) throw new FetchDeniedError('Response too large');
    const exposed: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      if (EXPOSED_RESPONSE_HEADERS.test(name)) exposed[name.toLowerCase()] = value;
    });
    return { status: response.status, headers: exposed, body };
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS} ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
