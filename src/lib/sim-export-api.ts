/**
 * Client for the Horadric Sim overlay export on pd2trader.com: `GET /api/sim/import/mine` (the signed-in
 * user's characters) and `POST /api/sim/exports` (character + selected stash items → planner URL).
 * Both take the user's PD2 token as bearer.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { AccountMismatchError, AuthenticationError } from '@/hooks/pd2website/usePD2Website';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';

/** Stash items per export; mirrors the server's MAX_STASH_ITEMS (its JSON body limit is 100 KB). */
export const MAX_SIM_EXPORT_ITEMS = 40;

export interface SimCharacters {
  accounts: { account: string; characters: string[] }[];
}

export class SimExportApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'SimExportApiError';
  }
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `pd2trader.com answered ${response.status}. Try again shortly.`;
    try {
      const body = await response.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    } catch {
      // non-JSON error body
    }
    throw new SimExportApiError(message, response.status);
  }
  return (await response.json()) as T;
}

export function getMyCharacters(token: string): Promise<SimCharacters> {
  return request('/api/sim/import/mine', token);
}

/** The server imports `character` from PD2 itself and maps the items; the URL opens the planner with both (24 h). */
export function createSimExport(
  token: string,
  character: string,
  stashItems: GameStashItem[],
): Promise<{ url: string }> {
  return request('/api/sim/exports', token, {
    method: 'POST',
    body: JSON.stringify({ character, stashItems }),
  });
}

/** Gear a build can wear or carry: not runes, gems, potions, keys or other stackables. */
export function isSimCandidate(item: GameStashItem): boolean {
  return !item.is_simple && !item.is_ear && !item.base?.stackable;
}

/** True when the failure means the PD2 session is gone (offer sign-in). */
export function isSessionError(error: unknown): boolean {
  return error instanceof AuthenticationError || (error instanceof SimExportApiError && error.status === 401);
}

export function describeSimExportError(error: unknown): string {
  if (error instanceof AccountMismatchError) {
    return error.message || 'The selected account is not linked to your PD2 login. Check your account settings.';
  }
  if (isSessionError(error)) return 'Your PD2 session expired. Sign in again.';
  if (error instanceof SimExportApiError && error.status === 429) return 'Too many exports. Try again in a minute.';
  return error instanceof Error ? error.message : String(error);
}
