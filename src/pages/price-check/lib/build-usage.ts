import { type BuildsMode, EMPTY_BUILDS_FILTERS, getBuildUsage, type ItemUsage } from '@/lib/builds-api';

/** How long a mode's ladder item usage is reused before it is fetched again. */
const USAGE_TTL_MS = 30 * 60 * 1000;

interface CachedUsage {
  at: number;
  request: Promise<{ total: number; items: ItemUsage[] } | null>;
}

const usageCache = new Map<BuildsMode, CachedUsage>();

/**
 * The most worn items (level 80+ ladder characters) of a mode and how many characters were counted, fetched once
 * per mode every 30 minutes. Never rejects: null when the builds service doesn't answer (retried on the next call).
 */
export function loadBuildUsage(
  mode: BuildsMode,
  now = Date.now(),
): Promise<{ total: number; items: ItemUsage[] } | null> {
  const cached = usageCache.get(mode);
  if (cached && now - cached.at < USAGE_TTL_MS) return cached.request;
  const request = getBuildUsage({ ...EMPTY_BUILDS_FILTERS, mode })
    .then(({ total, items }) => ({ total, items }))
    .catch(() => {
      usageCache.delete(mode);
      return null;
    });
  usageCache.set(mode, { at: now, request });
  return request;
}

/** Test seam: forget every cached mode. */
export function clearBuildUsageCache(): void {
  usageCache.clear();
}

/** The usage quality a price-checked item is counted under (`Runeword` for runewords); null for other items. */
export function usageQuality(item: { quality: string; isRuneword?: boolean }): string | null {
  const quality = item.isRuneword ? 'Runeword' : item.quality;
  return quality === 'Unique' || quality === 'Set' || quality === 'Runeword' ? quality : null;
}

/** The usage entry of a price-checked Unique, Set or runeword item: same name (any case) and quality. */
export function findItemUsage(
  items: readonly ItemUsage[],
  item: { name: string | undefined; quality: string; isRuneword?: boolean },
): ItemUsage | null {
  const quality = usageQuality(item);
  if (!item.name || !quality) return null;
  const name = item.name.trim().toLowerCase();
  return items.find((usage) => usage.quality === quality && usage.name.toLowerCase() === name) ?? null;
}
