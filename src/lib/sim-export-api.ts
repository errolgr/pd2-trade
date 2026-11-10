/**
 * Client for the Horadric Sim overlay export on pd2trader.com: `GET /api/sim/import/mine` (the signed-in
 * user's characters) and `POST /api/sim/exports` (character + items → planner URL).
 * Both take the user's PD2 token as bearer. `GET /api/sim/beta/status` says whether the sim is open to the user.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';
import { AccountMismatchError, AuthenticationError } from '@/hooks/pd2website/usePD2Website';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import type { Item as ClipboardItem } from '@/pages/price-check/lib/interfaces';
import type { SimGoal } from '@/lib/sim-preferences';

/** Items per export (stash and clipboard together); mirrors the server's MAX_STASH_ITEMS (its JSON body limit is 100 KB). */
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

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
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

/** What Horadric Sim's beta lets a PD2 login do; `null` from {@link getSimAccess} while the sim is off for it. */
export interface SimAccess {
  /** Open beta, or on the allowlist: may send items to the planner. Otherwise the overlay points at the waitlist. */
  canUse: boolean;
  /** The website's waitlist page. */
  waitlistUrl: string;
  /** The login's place on the waitlist while its sign-up awaits an invite. */
  waitlistPosition: number | null;
}

interface BetaStatus {
  canUseSim?: boolean;
  waitlist?: string;
  entry?: { position: number; status: string } | null;
}

/**
 * The sim's closed beta for the PD2 login (`token`; anonymous without one): `GET /api/sim/beta/status`, which the
 * server answers 404 while `sim.enabled` is off for the caller (then `null`).
 */
export async function getSimAccess(token: string | null): Promise<SimAccess | null> {
  let status: BetaStatus;
  try {
    status = await request<BetaStatus>('/api/sim/beta/status', token);
  } catch (error) {
    if (error instanceof SimExportApiError && error.status === 404) return null;
    throw error;
  }
  return {
    canUse: status.canUseSim === true,
    waitlistUrl: `${BACKEND_URL}${status.waitlist || '/sim/beta'}`,
    waitlistPosition: status.entry?.status === 'pending' ? status.entry.position : null,
  };
}

export interface SimExportItems {
  /** PD2's item JSON: from the stash, or a character's inventory, cube, gear or mercenary. */
  stashItems?: GameStashItem[];
  /** Items as the game's Ctrl+C put them on the clipboard, for ones PD2 hasn't saved yet; the server converts them. */
  clipboardItems?: ClipboardItem[];
  /** The one item the planner equips in its slot against the current gear (it stays a Top Gear candidate too). */
  try?: { stash: number } | { clipboard: number };
}

/**
 * The server imports `character` from PD2 itself and maps the items; the URL opens the planner with both (24 h).
 * Without `try` every item is only a candidate.
 */
export function createSimExport(
  token: string,
  character: string,
  { stashItems = [], clipboardItems = [], try: tried }: SimExportItems,
  goal?: SimGoal,
): Promise<{ url: string }> {
  return request('/api/sim/exports', token, {
    method: 'POST',
    body: JSON.stringify({
      character,
      stashItems,
      ...(clipboardItems.length > 0 && { clipboardItems }),
      ...(tried && ('stash' in tried ? { try: tried.stash } : { tryClipboard: tried.clipboard })),
      ...(goal && { goal }),
    }),
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
