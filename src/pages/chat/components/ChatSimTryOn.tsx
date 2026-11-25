import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import { describeSimExportError } from '@/lib/sim-export-api';
import { defaultSimCharacter, savedSimCharacter, simListingPlanUrl } from '@/lib/sim-try-on';
import { trackMeasurement } from '@/lib/telemetry';
import { Tip } from '@/components/ui/tooltip';
import { showToast } from '@/overlay';

/** Opens a market listing in the Horadric Sim planner on the default character; null while Try on is off. */
type TryOnListing = (listingId: string) => Promise<void>;

const ChatSimTryOnContext = createContext<{ tryOn: TryOnListing; character: string } | null>(null);

/**
 * Turns on chat's Try on for listing links (the chat panel, for Horadric Sim beta users while signed in). Like the
 * market's Sim button, the planner opens with the listing on the default character (`import=<character>`).
 */
export function ChatSimTryOnProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useOptions();
  const access = useSimAccess();
  const token = settings.pd2Token || '';
  const latest = useRef(settings);
  useEffect(() => {
    latest.current = settings;
  });
  const tryOn = useCallback<TryOnListing>(
    async (listingId) => {
      const started = performance.now();
      const current = latest.current;
      const goal = current.simGoal ?? 'quick_sim';
      try {
        const character = await defaultSimCharacter(token, current);
        if (!character) {
          showToast({
            title: 'Horadric Sim',
            description: 'No ladder characters found on your PD2 accounts.',
            variant: 'error',
          });
          return;
        }
        await openUrl(simListingPlanUrl(listingId, character, current.simGoal));
        trackMeasurement(
          'sim_handoff',
          { duration_ms: performance.now() - started },
          { outcome: 'success', source: 'chat', goal },
        );
      } catch (error) {
        trackMeasurement(
          'sim_handoff',
          { duration_ms: performance.now() - started },
          { outcome: 'error', source: 'chat', goal },
        );
        showToast({ title: 'Horadric Sim', description: describeSimExportError(error), variant: 'error' });
      }
    },
    [token],
  );
  const canTry = !!access?.canUse && !!token;
  const character = savedSimCharacter(settings);
  const value = useMemo(() => (canTry ? { tryOn, character } : null), [canTry, tryOn, character]);
  return <ChatSimTryOnContext.Provider value={value}>{children}</ChatSimTryOnContext.Provider>;
}

/** "Try on" beside a chat listing link that resolved to a live listing; nothing outside ChatSimTryOnProvider. */
export function ChatSimTryOnButton({ listingId }: { listingId: string }) {
  const context = useContext(ChatSimTryOnContext);
  const [opening, setOpening] = useState(false);
  if (!context) return null;
  const label = context.character
    ? `Try on ${context.character} in the Horadric Sim planner`
    : 'Try on your character in the Horadric Sim planner';
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={opening}
        onClick={(e) => {
          e.stopPropagation();
          setOpening(true);
          void context.tryOn(listingId).finally(() => setOpening(false));
        }}
        className="mx-1 inline-flex cursor-pointer items-center gap-1 rounded-md border border-primary/60 bg-primary/10 px-1.5 py-px align-middle text-[11px] font-medium text-primary hover:bg-primary/20 disabled:cursor-default disabled:opacity-60"
      >
        {opening ? <Loader2 className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
        Try on
      </button>
    </Tip>
  );
}
