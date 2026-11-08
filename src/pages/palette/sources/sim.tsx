import React, { useMemo, useState } from 'react';
import { Activity, FlaskConical, History, Send } from 'lucide-react';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import { SIM_EXPORT_LINK_TTL_MS, simGoalLabel } from '@/lib/sim-preferences';
import { savedSimCharacter, simPlannerUrl } from '@/lib/sim-try-on';
import { bestTier } from '../lib/match';
import type { PaletteItem, PaletteSource } from '../lib/types';

interface SimDef {
  key: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords: string[];
  run: PaletteItem['primary']['run'];
}

const ICON = 'h-4 w-4';

/**
 * Horadric Sim shortcuts, for beta users only (access known and granted): the sims' status, the planner on the
 * default character, the last export's planner link while it works (24 h), and Net Worth's Send to Simulator.
 */
export const useSimSource: PaletteSource = ({ query, scope, limit, refs }) => {
  const { settings } = useOptions();
  const access = useSimAccess();
  // The palette always opens fresh: "now" as of this opening
  const [now] = useState(() => Date.now());
  const canUse = access?.canUse === true;
  const character = savedSimCharacter(settings);
  const last = settings.simLastExport;

  const defs = useMemo<SimDef[]>(() => {
    if (!canUse) return [];
    const out: SimDef[] = [
      {
        key: 'status',
        label: 'Horadric Sim',
        icon: <Activity className={ICON} />,
        keywords: ['horadric', 'sim', 'status', 'results', 'report', 'jobs', 'queue', 'running', 'progress'],
        run: (ctx) => ctx.openPanel('sim'),
      },
    ];
    if (character) {
      out.push({
        key: 'planner',
        label: `Open planner · ${character}`,
        icon: <FlaskConical className={ICON} />,
        keywords: ['horadric', 'sim', 'planner', 'character', character],
        run: () => openUrl(simPlannerUrl(character)),
      });
    }
    if (last && now - Date.parse(last.sentAt) < SIM_EXPORT_LINK_TTL_MS) {
      out.push({
        key: 'lastReport',
        label: 'Last report',
        subtitle: `${simGoalLabel(last.goal)} · ${last.character}`,
        icon: <History className={ICON} />,
        keywords: ['horadric', 'sim', 'last', 'report', 'planner', 'reopen'],
        run: () => openUrl(last.url),
      });
    }
    out.push({
      key: 'sendStash',
      label: 'Send stash to Simulator',
      icon: <Send className={ICON} />,
      keywords: ['horadric', 'sim', 'stash', 'net worth', 'export', 'top gear'],
      run: (ctx) => ctx.openPanel('currency', { tab: 'simulator' }),
    });
    return out;
  }, [canUse, character, last, now]);

  return useMemo(() => {
    if (limit === 0 || defs.length === 0) return { items: [], loading: false };
    const toItem = (def: SimDef): PaletteItem => ({
      ref: { id: `sim:${def.key}`, group: 'sim', title: def.label },
      subtitle: def.subtitle,
      icon: def.icon,
      primary: { id: 'run', label: def.label, run: def.run },
    });
    if (!query) {
      if (scope) return { items: defs.map(toItem), loading: false };
      const byId = new Map(defs.map((def) => [`sim:${def.key}`, def]));
      return { items: refs.flatMap((ref) => (byId.has(ref.id) ? [toItem(byId.get(ref.id)!)] : [])), loading: false };
    }
    const ranked = defs
      .map((def, order) => ({ def, order, tier: bestTier([def.label, ...def.keywords], query) }))
      .filter((r) => r.tier > 0)
      .sort((a, b) => b.tier - a.tier || a.order - b.order)
      .slice(0, limit);
    return { items: ranked.map((r) => toItem(r.def)), loading: false };
  }, [defs, limit, query, refs, scope]);
};
