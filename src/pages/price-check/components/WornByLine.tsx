import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { BUILDS_MIN_LEVEL, type BuildsMode, type ItemUsage } from '@/lib/builds-api';
import { useOverlay } from '@/overlay';
import { findItemUsage, loadBuildUsage, usageQuality } from '../lib/build-usage';

/**
 * "Worn by 21.9% of level 80+ ladder characters" for a Unique, Set or runeword among the ladder's most worn items;
 * opens the builds meta filtered to it. Renders nothing while loading, when not among them, or when the builds
 * service doesn't answer.
 */
export function WornByLine({
  name,
  quality,
  isRuneword,
  mode,
}: {
  name: string | undefined;
  quality: string;
  isRuneword?: boolean;
  mode: BuildsMode;
}) {
  const { openPanel } = useOverlay();
  // Tagged with the item it was found for, so a different item never shows the previous one's line
  const itemKey = `${mode}|${quality}|${isRuneword ?? false}|${name ?? ''}`;
  const [found, setFound] = useState<{ itemKey: string; usage: ItemUsage | null } | null>(null);

  useEffect(() => {
    if (!name || !usageQuality({ quality, isRuneword })) return;
    let live = true;
    void loadBuildUsage(mode).then((result) => {
      if (live && result) setFound({ itemKey, usage: findItemUsage(result.items, { name, quality, isRuneword }) });
    });
    return () => {
      live = false;
    };
  }, [itemKey, name, quality, isRuneword, mode]);

  const usage = found?.itemKey === itemKey ? found.usage : null;
  if (!usage) return null;
  return (
    <button
      type="button"
      title="Show the builds that wear it"
      className="flex w-fit items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
      onClick={() => openPanel('builds', { tab: 'meta', filters: { items: [usage.key], mode } })}
    >
      <Shield className="size-3.5 shrink-0" />
      <span>
        Worn by <span className="font-semibold tabular-nums text-foreground">{usage.pct.toFixed(1)}%</span> of level{' '}
        {BUILDS_MIN_LEVEL}+ ladder characters
        <span className="tabular-nums"> ({usage.count.toLocaleString()})</span>
      </span>
    </button>
  );
}
