import React, { useEffect, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { isToastEnabled } from '@/hooks/useSocketNotifications';
import { emit, listen } from '@/lib/browser-events';
import { openWindowCenteredOnDiablo, type BrowserWindow } from '@/lib/window';
import { WindowLabels, WindowTitles } from '@/lib/window-titles';
import type { SnapshotResponse, ValuationLine } from '@/lib/networth-api';
import type { GenericToastPayload } from '@/common/types/Events';
import { formatSignedHr, NETWORTH_TOGGLE_PANEL_EVENT } from './overlay';

const PANEL_SIZE = { width: 360, height: 420 };
const FOCUS_LOSS_HIDE_DELAY_MS = 500;

/**
 * Names the holdings that moved the most between two valuations, in the direction of the total change,
 * e.g. `Ber, 2× Ist`.
 */
function describeTopChanges(previous: ValuationLine[], next: ValuationLine[], gained: boolean): string {
  const qtyBefore = new Map(previous.map((line) => [line.key, line.qty]));
  const changes = new Map<string, { name: string; qtyDelta: number; valueDelta: number }>();
  const nextKeys = new Set<string>();
  for (const line of next) {
    nextKeys.add(line.key);
    const qtyDelta = line.qty - (qtyBefore.get(line.key) ?? 0);
    if (qtyDelta !== 0)
      changes.set(line.key, { name: line.name, qtyDelta, valueDelta: qtyDelta * (line.unitPrice ?? 0) });
  }
  for (const line of previous) {
    if (!nextKeys.has(line.key)) {
      changes.set(line.key, { name: line.name, qtyDelta: -line.qty, valueDelta: -line.value });
    }
  }
  return [...changes.values()]
    .filter((c) => (gained ? c.valueDelta > 0 : c.valueDelta < 0))
    .sort((a, b) => Math.abs(b.valueDelta) - Math.abs(a.valueDelta))
    .slice(0, 3)
    .map((c) => (Math.abs(c.qtyDelta) === 1 ? c.name : `${Math.abs(c.qtyDelta)}× ${c.name}`))
    .join(', ');
}

/**
 * Lives in the main window inside the host NetWorthProvider. Owns the net worth overlay windows
 * (ticker + mini panel) and the snapshot toasts.
 */
const NetWorthOverlayHost: React.FC = () => {
  const { settings } = useOptions();
  const { latest } = useNetWorth();
  const tickerWindowRef = useRef<WebviewWindow | null>(null);
  const panelWindowRef = useRef<WebviewWindow | BrowserWindow | null>(null);
  const panelVisibleBeforeBlurRef = useRef(false);
  const previousLatestRef = useRef<SnapshotResponse | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Snapshot toast: persisted, non-deduped snapshot whose change crosses the threshold
  useEffect(() => {
    const previous = previousLatestRef.current;
    previousLatestRef.current = latest;
    if (!latest || latest === previous || !latest.snapshotId || latest.deduped) return;

    const change = latest.delta.sincePrevious;
    const threshold = settingsRef.current.netWorthToastThresholdHr ?? 0.5;
    if (change === null || Math.abs(change) < threshold) return;
    if (!isToastEnabled(settingsRef.current, 'networth')) return;

    const movers = previous ? describeTopChanges(previous.valuation.lines, latest.valuation.lines, change > 0) : '';
    const payload: GenericToastPayload = {
      title: 'Net Worth',
      description: `${formatSignedHr(change)} HR${movers ? ` · ${movers}` : ''}`,
      variant: change > 0 ? 'success' : 'warning',
    };
    emit('toast-event', payload);
  }, [latest]);

  // Mini panel: toggled by the ticker
  useEffect(() => {
    const togglePanel = async () => {
      const existing = panelWindowRef.current;
      if (existing) {
        try {
          if ('isVisible' in existing && (await existing.isVisible())) {
            await existing.hide();
          } else {
            await existing.show();
            await existing.setFocus();
          }
          return;
        } catch (error) {
          console.warn('[NetWorthOverlay] Panel window handle stale, recreating:', error);
          panelWindowRef.current = null;
        }
      }
      const created = await openWindowCenteredOnDiablo(WindowLabels.NetWorthPanel, '/net-worth-panel', {
        title: WindowTitles.NetWorthPanel,
        decorations: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        shadow: false,
        focusable: true,
        resizable: false,
        ...PANEL_SIZE,
      });
      if (!created) return;
      panelWindowRef.current = created;
      created.onCloseRequested(() => {
        panelWindowRef.current = null;
      });
    };

    let unlisten: (() => void) | null = null;
    let cancelled = false;
    listen(NETWORTH_TOGGLE_PANEL_EVENT, () => {
      togglePanel().catch((error) => console.error('[NetWorthOverlay] Failed to toggle panel:', error));
    }).then((off) => {
      if (cancelled) off();
      else unlisten = off;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // Ticker: visible only while enabled, signed in and Diablo (or one of our windows) is focused
  const tickerWanted = settings.netWorthTickerEnabled !== false && !!settings.pd2Token;
  useEffect(() => {
    if (!isTauri()) return;

    let hideTimer: number | undefined;
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    const setTickerVisible = async (visible: boolean) => {
      if (!visible) {
        await tickerWindowRef.current?.hide();
        return;
      }
      if (!tickerWindowRef.current) {
        // The ticker page sizes and anchors its own window once it has rendered
        tickerWindowRef.current = new WebviewWindow(WindowLabels.NetWorthTicker, {
          url: '/net-worth-ticker',
          title: WindowTitles.NetWorthTicker,
          width: 320,
          height: 32,
          decorations: false,
          transparent: true,
          skipTaskbar: true,
          alwaysOnTop: true,
          shadow: false,
          focus: false,
          focusable: false,
          resizable: false,
          visible: true,
        });
        return;
      }
      await tickerWindowRef.current.show();
    };

    const applyFocus = (focused: boolean) => {
      window.clearTimeout(hideTimer);
      const panel = panelWindowRef.current;
      if (focused) {
        setTickerVisible(tickerWanted).catch((error) => {
          console.warn('[NetWorthOverlay] Ticker window not found, recreating on next focus:', error);
          tickerWindowRef.current = null;
        });
        if (panel && panelVisibleBeforeBlurRef.current) panel.show().catch(() => (panelWindowRef.current = null));
        panelVisibleBeforeBlurRef.current = false;
        return;
      }
      // Debounced like the main visibility manager to avoid flicker while focus moves between our windows
      hideTimer = window.setTimeout(async () => {
        await setTickerVisible(false).catch(() => (tickerWindowRef.current = null));
        if (panel && 'isVisible' in panel) {
          try {
            panelVisibleBeforeBlurRef.current = await panel.isVisible();
            await panel.hide();
          } catch {
            panelWindowRef.current = null;
          }
        }
      }, FOCUS_LOSS_HIDE_DELAY_MS);
    };

    invoke<boolean>('is_diablo_focused')
      .then((focused) => {
        if (!cancelled) applyFocus(focused);
      })
      .catch((error) => console.warn('[NetWorthOverlay] Initial focus check failed:', error));

    listen<boolean>('diablo-focus-changed', ({ payload }) => applyFocus(payload)).then((off) => {
      if (cancelled) off();
      else unlisten = off;
    });

    return () => {
      cancelled = true;
      window.clearTimeout(hideTimer);
      unlisten?.();
    };
  }, [tickerWanted]);

  return null;
};

export default NetWorthOverlayHost;
