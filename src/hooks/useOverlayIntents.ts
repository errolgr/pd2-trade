/**
 * Horadric Sim intents from pd2trader.com (a sim started from an overlay export finished, failed or was cancelled,
 * or "open in overlay" on a report/planner): while signed in with sim access, listens on the intent stream, passes
 * each on to in-app listeners (the Sim panel) and shows it as a `sim` toast. Sims that finished while the overlay
 * was away arrive as one burst right after connecting; 2+ of them show as one summary toast. Mounted once, in
 * AppController.
 */
import { useEffect, useRef, useState } from 'react';
import { ToastActionType, type CustomToastPayload } from '@/common/types/Events';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { isToastEnabled } from '@/hooks/useSocketNotifications';
import { publishIntent, runIntentStream, SIM_RESULT_KINDS, type OverlayIntent } from '@/lib/overlay-intents';
import { showToast } from '@/overlay';

/** Long enough to read a sim summary and click through (hover pauses it). */
export const SIM_TOAST_DURATION_MS = 15_000;

/** How long after a connection opens replayed sim results are collected into one away summary. */
export const AWAY_BURST_MS = 1_500;
/** Titles listed in the away summary. */
const AWAY_LINES = 3;

export function intentToast(intent: OverlayIntent): CustomToastPayload {
  const open = { type: ToastActionType.OPEN_URL, data: { url: intent.url } };
  return {
    title: intent.title,
    description: intent.lines.slice(0, 3).join(' · ') || undefined,
    duration: SIM_TOAST_DURATION_MS,
    ...(intent.kind === 'job_failed' && { tone: 'error' as const }),
    ...(intent.kind === 'job_cancelled' && { tone: 'muted' as const }),
    action: { label: intent.kind === 'job_failed' ? 'Details' : 'Open', ...open },
  };
}

/** Sims that finished while the overlay was away: one as its own toast, 2+ as one summary opening the Sim panel. */
export function awayToast(intents: readonly OverlayIntent[]): CustomToastPayload | null {
  if (intents.length === 0) return null;
  if (intents.length === 1) return intentToast(intents[0]);
  return {
    title: `${intents.length} sims finished while you were away`,
    description: intents
      .slice(0, AWAY_LINES)
      .map((intent) => intent.title)
      .join('\n'),
    duration: SIM_TOAST_DURATION_MS,
    action: { label: 'View status', type: ToastActionType.OPEN_SIM_STATUS },
  };
}

export function useOverlayIntents(): void {
  const { settings, isLoading } = useOptions();
  const access = useSimAccess();
  const token = isLoading ? undefined : settings.pd2Token;
  /** The token the stream refused (401/403/404): not retried until it changes. */
  const [refusedToken, setRefusedToken] = useState<string | null>(null);
  const active = !!token && !!access?.canUse && token !== refusedToken;

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });
  /** Intent ids shown this session: a stream restart never shows one twice. */
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!active || !token) return;
    const controller = new AbortController();
    const show = (toast: CustomToastPayload | null) => {
      if (toast && isToastEnabled(settingsRef.current, 'sim')) showToast(toast);
    };
    /** Replayed sim results of the current connect burst; null outside a burst. */
    let away: OverlayIntent[] | null = null;
    let burst: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      const intents = away ?? [];
      away = null;
      show(awayToast(intents));
    };
    controller.signal.addEventListener('abort', () => clearTimeout(burst), { once: true });
    void runIntentStream({
      token,
      onConnect: () => {
        clearTimeout(burst);
        if (away) flush();
        away = [];
        burst = setTimeout(flush, AWAY_BURST_MS);
      },
      onIntent: (intent) => {
        publishIntent(intent);
        if (away && intent.replay && SIM_RESULT_KINDS.includes(intent.kind)) away.push(intent);
        else show(intentToast(intent));
      },
      onRefused: () => setRefusedToken(token),
      signal: controller.signal,
      seen: seen.current,
    });
    return () => controller.abort();
  }, [active, token]);
}
