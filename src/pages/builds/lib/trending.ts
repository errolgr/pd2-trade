import type { MetaHistoryResponse } from '@/lib/builds-api';

export interface TrendingItem {
  key: string;
  name: string;
  quality: string;
  iconUrl: string | null;
  /** Share (0–100) at the earliest and the latest point. */
  from: number;
  to: number;
  /** to − from, in percentage points. */
  delta: number;
}

export interface Trending {
  rising: TrendingItem[];
  falling: TrendingItem[];
  /** The compared hours. */
  fromHour: string;
  toHour: string;
}

/**
 * Items whose share moved most between the earliest and the latest history point. An item missing from a point
 * counts as 0% there. Moves under `minDelta` points are noise. null with fewer than 2 points.
 */
export function computeTrending(
  history: Pick<MetaHistoryResponse, 'points' | 'items'>,
  { limit = 5, minDelta = 0.5 }: { limit?: number; minDelta?: number } = {},
): Trending | null {
  if (history.points.length < 2) return null;
  const hours = history.points.map((p) => p.hour).sort();
  const fromHour = hours[0];
  const toHour = hours[hours.length - 1];
  const moves: TrendingItem[] = history.items.map((item) => {
    const at = (hour: string) => item.series.find((s) => s.hour === hour)?.pct ?? 0;
    const from = at(fromHour);
    const to = at(toHour);
    return {
      key: item.key,
      name: item.name,
      quality: item.quality,
      iconUrl: item.iconUrl,
      from,
      to,
      delta: Math.round((to - from) * 100) / 100,
    };
  });
  const rising = moves
    .filter((m) => m.delta >= minDelta)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
  const falling = moves
    .filter((m) => m.delta <= -minDelta)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);
  return { rising, falling, fromHour, toHour };
}
