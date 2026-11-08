/**
 * Horadric Sim intents from pd2trader.com (a finished sim started from an overlay export, or "open in overlay"
 * on a report/planner): while signed in with sim access, listens on the intent stream and shows each as a `sim`
 * toast with an Open action (the page in the browser). Mounted once, in AppController.
 */
import { useEffect, useRef, useState } from 'react';
import { ToastActionType, type CustomToastPayload } from '@/common/types/Events';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { isToastEnabled } from '@/hooks/useSocketNotifications';
import { runIntentStream, type OverlayIntent } from '@/lib/overlay-intents';
import { showToast } from '@/overlay';

/** Long enough to read a sim summary and click through (hover pauses it). */
export const SIM_TOAST_DURATION_MS = 15_000;

export function intentToast(intent: OverlayIntent): CustomToastPayload {
  return {
    title: intent.title,
    description: intent.lines.slice(0, 3).join(' · ') || undefined,
    duration: SIM_TOAST_DURATION_MS,
    action: { label: 'Open', type: ToastActionType.OPEN_URL, data: { url: intent.url } },
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
    void runIntentStream({
      token,
      onIntent: (intent) => {
        if (isToastEnabled(settingsRef.current, 'sim')) showToast(intentToast(intent));
      },
      onRefused: () => setRefusedToken(token),
      signal: controller.signal,
      seen: seen.current,
    });
    return () => controller.abort();
  }, [active, token]);
}
