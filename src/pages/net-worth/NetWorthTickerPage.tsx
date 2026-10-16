import React, { useEffect, useRef, useState } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalPosition, LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { OptionsProvider, useOptions, ISettings } from '@/hooks/useOptions';
import { ItemsProvider } from '@/hooks/useItems';
import { ChildPd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { ChildNetWorthProvider, useNetWorth } from '@/hooks/useNetWorth';
import { emit, listen } from '@/lib/browser-events';
import { MotionConfig } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedNumber, useChangeFlash } from '@/pages/currency/components/AnimatedNumber';
import { formatHr, formatSignedHr, NETWORTH_TOGGLE_PANEL_EVENT } from './overlay';

type TickerAnchor = NonNullable<ISettings['netWorthTickerAnchor']>;
type DiabloRect = { x: number; y: number; width: number; height: number };

const EDGE_MARGIN = 12;
/** Chat button window geometry used by LandingPage (240px window, 20px right / 10px bottom inset). */
const CHAT_BUTTON_WINDOW = { size: 240, right: 20, bottom: 10 };

/** Resizes the ticker window to its pill and moves it to the configured anchor on the Diablo frame. */
async function placeTickerWindow(anchor: TickerAnchor, width: number, height: number): Promise<void> {
  const win = getCurrentWebviewWindow();
  await win.setSize(new LogicalSize(width, height));
  const rect = await invoke<DiabloRect | null>('get_diablo_rect');
  if (!rect) return;

  if (anchor === 'above-chat') {
    // Mirror LandingPage's chat button placement, which feeds the Diablo rect straight into window coordinates.
    const chatX = rect.x + rect.width - CHAT_BUTTON_WINDOW.size - CHAT_BUTTON_WINDOW.right;
    const chatY = rect.y + rect.height - CHAT_BUTTON_WINDOW.size - CHAT_BUTTON_WINDOW.bottom;
    await win.setPosition(new LogicalPosition(chatX + CHAT_BUTTON_WINDOW.size - width, chatY - height - 4));
    return;
  }

  const scale = await win.scaleFactor();
  const physicalWidth = width * scale;
  const margin = EDGE_MARGIN * scale;
  const y = rect.y + margin;
  let x = rect.x + (rect.width - physicalWidth) / 2;
  if (anchor === 'top-left') x = rect.x + margin;
  if (anchor === 'top-right') x = rect.x + rect.width - physicalWidth - margin;
  await win.setPosition(new PhysicalPosition(Math.round(x), Math.round(y)));
}

const NetWorthTicker: React.FC = () => {
  const { settings } = useOptions();
  const { latest, status, lastSnapshotAt, currentSession } = useNetWorth();
  const pillRef = useRef<HTMLButtonElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const anchor = settings.netWorthTickerAnchor ?? 'top-center';

  // Re-evaluate freshness every 30s
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Keep the window exactly the size of the pill (the window is the click target) and anchored on the Diablo frame
  useEffect(() => {
    const pill = pillRef.current;
    if (!isTauri() || !pill) return;

    const place = () => {
      const { width, height } = pill.getBoundingClientRect();
      placeTickerWindow(anchor, Math.ceil(width), Math.ceil(height)).catch((error) =>
        console.warn('[NetWorthTicker] Failed to place ticker window:', error),
      );
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(pill);

    let unlisten: (() => void) | null = null;
    let cancelled = false;
    listen<boolean>('diablo-focus-changed', ({ payload: focused }) => {
      if (focused) place();
    }).then((off) => {
      if (cancelled) off();
      else unlisten = off;
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      unlisten?.();
    };
  }, [anchor]);

  const intervalMinutes = settings.netWorthAutoSnapshotMinutes || 15;
  const isFresh = lastSnapshotAt !== null && now - lastSnapshotAt < (intervalMinutes + 1) * 60_000;
  const failed = status === 'error' || status === 'signed-out';
  const dotClass = failed
    ? 'bg-destructive ring-destructive/25'
    : isFresh
      ? 'bg-success ring-success/25'
      : 'bg-warning ring-warning/25';
  const dotTitle = failed
    ? 'Snapshot failed'
    : lastSnapshotAt
      ? `Last snapshot ${new Date(lastSnapshotAt).toLocaleTimeString()}`
      : 'No snapshot yet';

  const total = latest?.valuation.totalHr ?? null;
  const flash = useChangeFlash(total);
  const sessionDelta = currentSession?.isOpen ? currentSession.endHr - currentSession.startHr : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="inline-block">
        {/* No transforms/shadows here: the window is sized to this pill's box, so it must not grow on hover. */}
        <button
          ref={pillRef}
          type="button"
          onClick={() => emit(NETWORTH_TOGGLE_PANEL_EVENT)}
          style={{ opacity: (settings.netWorthTickerOpacity ?? 90) / 100 }}
          className="group flex h-7 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface pl-3 pr-2.5 text-xs font-medium text-surface-foreground outline-none backdrop-blur-md transition-[background-color,border-color] duration-(--dur-fast) ease-out hover:border-ring/60 hover:bg-surface-elevated focus-visible:border-ring active:bg-muted"
          title="Net worth — click for details"
        >
          <span
            className={cn(
              'text-sm font-semibold tabular-nums transition-colors duration-(--dur-slow)',
              flash === 'up' && 'text-success',
              flash === 'down' && 'text-destructive',
            )}
          >
            {total !== null ? (
              <AnimatedNumber value={total}
                format={formatHr} />
            ) : status === 'loading' ? (
              '…'
            ) : (
              '—'
            )}{' '}
            <span className="text-[11px] font-medium text-muted-foreground">HR</span>
          </span>
          {sessionDelta !== null && (
            <>
              <span aria-hidden
                className="h-3 w-px bg-border" />
              <span className={cn('tabular-nums', sessionDelta >= 0 ? 'text-success' : 'text-destructive')}>
                <span className="text-[10px]">{sessionDelta >= 0 ? '▲' : '▼'}</span> {formatSignedHr(sessionDelta)}{' '}
                <span className="font-normal opacity-80">session</span>
              </span>
            </>
          )}
          {currentSession?.isOpen && (
            <>
              <span aria-hidden
                className="h-3 w-px bg-border" />
              <span className="tabular-nums text-muted-foreground">
                <span className="text-surface-foreground/90">{formatHr(currentSession.hrPerHour)}</span> HR/h
              </span>
            </>
          )}
          <span
            className={cn(
              'ml-0.5 size-2 shrink-0 rounded-full ring-[3px] transition-colors duration-(--dur-med)',
              dotClass,
              status === 'loading' && 'motion-safe:animate-pulse',
            )}
            title={dotTitle}
          />
        </button>
      </div>
    </MotionConfig>
  );
};

const NetWorthTickerPage: React.FC = () => (
  <OptionsProvider>
    <ItemsProvider>
      <ChildPd2WebsiteProvider>
        <ChildNetWorthProvider>
          <NetWorthTicker />
        </ChildNetWorthProvider>
      </ChildPd2WebsiteProvider>
    </ItemsProvider>
  </OptionsProvider>
);

export default NetWorthTickerPage;
