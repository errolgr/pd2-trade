/**
 * Client for the pd2-price-crawler net worth API (`/api/networth/*`, `/api/seasons`).
 * Wire contract: PRD-stash-net-worth.md §8.3.
 */
import { fetch } from '@/lib/browser-http';
import { BACKEND_URL } from '@/lib/pkce';

export type NetWorthCategory = 'runes' | 'currency' | 'ubers' | 'gems' | 'mats' | 'uniques' | 'sets' | 'other';
export type PriceConfidence = 'ok' | 'low' | 'fixed' | 'none';
export type SnapshotTrigger = 'manual' | 'interval' | 'startup' | 'web';

export const NET_WORTH_CATEGORIES: NetWorthCategory[] = [
  'runes',
  'currency',
  'ubers',
  'gems',
  'mats',
  'uniques',
  'sets',
  'other',
];

export interface ValuationLine {
  key: string;
  name: string;
  category: NetWorthCategory;
  qty: number;
  unitPrice: number | null;
  value: number;
  confidence: PriceConfidence;
  sampleCount: number;
  priceChange7dPercent: number | null;
  tab: string | null;
  iconPath: string | null;
}

export interface Valuation {
  account: string;
  isLadder: boolean;
  isHardcore: boolean;
  seasonId: string;
  takenAt: string;
  priceDay: string;
  priceSource: 'market' | 'ladder-fallback';
  totalHr: number;
  uncertainHr: number;
  unpricedCount: number;
  gold: number;
  byCategory: Record<NetWorthCategory, number>;
  byTab: Record<string, number>;
  lines: ValuationLine[];
}

export interface SnapshotResponse {
  valuation: Valuation;
  snapshotId: string | null;
  deduped: boolean;
  delta: { sincePrevious: number | null; previousTakenAt: string | null };
}

export interface NetWorthPoint {
  snapshotId: string;
  takenAt: string;
  lastConfirmedAt: string;
  trigger: SnapshotTrigger;
  priceDay: string;
  totalHr: number;
  uncertainHr: number;
  unpricedCount: number;
  gold: number;
  byCategory: Record<NetWorthCategory, number>;
  hasHoldings: boolean;
}

export interface DiffLine {
  key: string;
  name: string;
  category: NetWorthCategory;
  qtyFrom: number;
  qtyTo: number;
  qtyDelta: number;
  unitPrice: number | null;
  valueDelta: number;
}

export interface DiffResponse {
  from: { snapshotId: string; takenAt: string; totalHr: number };
  to: { snapshotId: string; takenAt: string; totalHr: number };
  priceBasis: 'then' | 'now';
  farmedHr: number;
  marketDriftHr: number;
  lines: DiffLine[];
}

export interface SessionSummary {
  id: string;
  start: string;
  end: string;
  durationMinutes: number;
  startHr: number;
  endHr: number;
  farmedHr: number;
  marketDriftHr: number;
  hrPerHour: number;
  snapshotCount: number;
  manual: boolean;
  isOpen: boolean;
  topGains: { key: string; name: string; qtyDelta: number; valueDelta: number }[];
}

export interface Season {
  id: string;
  label: string;
  startDate: string;
  endDate: string | null;
}

export interface NetWorthOwner {
  account: string;
  isLadder: boolean;
  isHardcore: boolean;
}

export class NetWorthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'NetWorthApiError';
  }
}

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Net worth API ${response.status}`;
    try {
      const body = await response.json();
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
    } catch {
      // non-JSON error body
    }
    throw new NetWorthApiError(message, response.status);
  }
  return (await response.json()) as T;
}

function ownerQuery(owner: NetWorthOwner, extra: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams({
    account: owner.account,
    isLadder: String(owner.isLadder),
    isHardcore: String(owner.isHardcore),
  });
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}

/** The server fetches the stash from PD2 with this token; clients never upload stash contents. */
export function syncSnapshot(
  token: string,
  owner: NetWorthOwner,
  trigger: SnapshotTrigger,
  persist: boolean,
): Promise<SnapshotResponse> {
  return request('/api/networth/sync', token, {
    method: 'POST',
    body: JSON.stringify({ ...owner, trigger, persist }),
  });
}

export function getPoints(
  token: string,
  owner: NetWorthOwner,
  opts: { seasonId?: string; from?: string; to?: string; resolution?: 'raw' | 'hour' | 'day' } = {},
): Promise<{ points: NetWorthPoint[] }> {
  return request(`/api/networth/points?${ownerQuery(owner, opts)}`, token);
}

export function getSnapshot(
  token: string,
  snapshotId: string,
): Promise<{ snapshotId: string; takenAt: string; priceDay: string; valuation: Valuation }> {
  return request(`/api/networth/snapshots/${encodeURIComponent(snapshotId)}`, token);
}

export function getDiff(
  token: string,
  owner: NetWorthOwner,
  from: string,
  to: string,
  priceBasis: 'then' | 'now' = 'then',
): Promise<DiffResponse> {
  return request(`/api/networth/diff?${ownerQuery(owner, { from, to, priceBasis })}`, token);
}

export function getSessions(
  token: string,
  owner: NetWorthOwner,
  seasonId?: string,
): Promise<{ sessions: SessionSummary[] }> {
  return request(`/api/networth/sessions?${ownerQuery(owner, { seasonId })}`, token);
}

export function postSessionMarker(token: string, owner: NetWorthOwner, type: 'start' | 'stop'): Promise<{ ok: true }> {
  return request('/api/networth/sessions/markers', token, {
    method: 'POST',
    body: JSON.stringify({ ...owner, type }),
  });
}

export function deleteHistory(
  token: string,
  owner: NetWorthOwner,
  seasonId?: string,
): Promise<{ deletedPoints: number; deletedSnapshots: number }> {
  return request(`/api/networth?${ownerQuery(owner, { seasonId })}`, token, { method: 'DELETE' });
}

export function getSeasons(): Promise<{ seasons: Season[]; currentId: string }> {
  return request('/api/seasons', null);
}

/** Leaderboard / public profile settings (per PD2 login). */
export interface ProfileSettings {
  optedIn: boolean;
  displayName: string | null;
  slug: string | null;
  showHoldings: boolean;
  /** Game account names the login may appear as. */
  displayNameOptions: string[];
}

/** 404 until the server enables leaderboards (LEADERBOARD_PUBLIC). */
export function getProfileSettings(token: string): Promise<ProfileSettings> {
  return request('/api/networth/profile', token);
}

export function updateProfileSettings(
  token: string,
  update: { optedIn: boolean; showHoldings?: boolean; displayName?: string },
): Promise<ProfileSettings> {
  return request('/api/networth/profile', token, { method: 'PUT', body: JSON.stringify(update) });
}
