import React, { useState } from 'react';
import { ExternalLink, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openUrl } from '@/lib/browser-opener';
import { SIM_EXPORT_LINK_TTL_MS, simGoalLabel, type SimLastExport } from '@/lib/sim-preferences';
import { timeAgo } from '@/pages/builds/lib/format';

/**
 * "Last sent: Top Gear · HammerPal · 3 items · 2h ago" for the last export (price check or Net Worth), with a
 * Reopen planner button while its link still works (24 h).
 */
export function SimLastSent({ last, now: nowProp }: { last: SimLastExport | undefined; now?: number }) {
  // Read once per mount: the line is rendered fresh each time the tab opens
  const [mountedAt] = useState(() => Date.now());
  const now = nowProp ?? mountedAt;
  if (!last) return null;
  const fresh = now - Date.parse(last.sentAt) < SIM_EXPORT_LINK_TTL_MS;
  return (
    <div role="status"
      aria-label="Last sent"
      className="flex items-center gap-2 text-xs text-muted-foreground">
      <History className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        Last sent: {simGoalLabel(last.goal)} · {last.character} · {last.items} {last.items === 1 ? 'item' : 'items'} ·{' '}
        {timeAgo(last.sentAt, now)}
      </span>
      {fresh && (
        <Button size="sm"
          variant="outline"
          onClick={() => void openUrl(last.url)}>
          <ExternalLink className="size-3.5" />
          Reopen planner
        </Button>
      )}
    </div>
  );
}
