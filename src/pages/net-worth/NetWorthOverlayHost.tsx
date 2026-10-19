import React, { useEffect, useRef } from 'react';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { useOptions } from '@/hooks/useOptions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { isToastEnabled } from '@/hooks/useSocketNotifications';
import { emit, listen } from '@/lib/browser-events';
import { openWindowCenteredOnDiablo, type BrowserWindow } from '@/lib/window';
import { WindowLabels, WindowTitles } from '@/lib/window-titles';
import type { SnapshotResponse, ValuationLine } from '@/lib/networth-api';
import type { GenericToastPayload } from '@/common/types/Events';
import { formatSignedHr, monitorWorkAreas, NETWORTH_TOGGLE_PANEL_EVENT, panelBesideTicker, pickArea } from './overlay';

const PANEL_SIZE = { width: 360, height: 420 };
/** Logical px between the ticker and the panel opened from it. */
const PANEL_GAP = 6;
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
 * Physical position for the mini panel next to the visible ticker (flipped above / right-aligned near screen
 * edges), or null when the ticker is not showing (the panel then opens centered on Diablo).
 */
async function panelPositionNearTicker(ticker: WebviewWindow | null): Promise<PhysicalPosition | null> {
  if (!ticker || !(await ticker.isVisible())) return null;
  const [position, size] = await Promise.all([ticker.outerPosition(), ticker.outerSize()]);
  const tickerRect = { x: position.x, y: position.y, width: size.width, height: size.height };
  const area = pickArea(tickerRect, await monitorWorkAreas());
  if (!area) return null;
  const panel = {
    width: Math.round(PANEL_SIZE.width * area.scaleFactor),
    height: Math.round(PANEL_SIZE.height * area.scaleFactor),
  };
  const { x, y } = panelBesideTicker(tickerRect, panel, area, Math.round(PANEL_GAP * area.scaleFactor));
  return new PhysicalPosition(x, y);
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

  // Snapshot toast: persisted, non-deduped snapshot whose change crosses the threshold. Only while the ticker is
  // on, so history saving in the background (on by default) shows nothing until the player opts into the overlay.
  useEffect(() => {
    const previous = previousLatestRef.current;
    previousLatestRef.current = latest;
    if (!latest || latest === previous || !latest.snapshotId || latest.deduped) return;

    const change = latest.delta.sincePrevious;
    const threshold = settingsRef.current.netWorthToastThresholdHr ?? 0.5;
    if (change === null || Math.abs(change) < threshold) return;
    if (settingsRef.current.netWorthTickerEnabled !== true || !isToastEnabled(settingsRef.current, 'networth')) return;

    const movers = previous ? describeTopChanges(previous.valuation.lines, latest.valuation.lines, change > 0) : '';
    const payload: GenericToastPayload = {
      title: 'Net Worth',
      description: `${formatSignedHr(change)} HR${movers ? ` · ${movers}` : ''}`,
      variant: change > 0 ? 'success' : 'warning',
    };
    emit('toast-event', payload);
  }, [latest]);

  // Mini panel: toggled by the ticker, opened next to it
  useEffect(() => {
    const togglePanel = async () => {
      const existing = panelWindowRef.current;
      if (existing) {
        try {
          if ('isVisible' in existing && (await existing.isVisible())) {
            await existing.hide();
          } else {
            if (existing instanceof WebviewWindow) {
              const position = await panelPositionNearTicker(tickerWindowRef.current).catch(() => null);
              if (position) await existing.setPosition(position);
            }
            await existing.show();
            await existing.setFocus();
          }
          return;
        } catch (error) {
          console.warn('[NetWorthOverlay] Panel window handle stale, recreating:', error);
          panelWindowRef.current = null;
        }
      }
      const position = isTauri() ? await panelPositionNearTicker(tickerWindowRef.current).catch(() => null) : null;
      const created = await openWindowCenteredOnDiablo(WindowLabels.NetWorthPanel, '/net-worth-panel', {
        // Next to the ticker: created hidden, then moved and shown (positions here are physical pixels)
        visible: position === null,
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
      if (position && created instanceof WebviewWindow) {
        created.once('tauri://created', async () => {
          try {
            await created.setPosition(position);
            await created.show();
            await created.setFocus();
          } catch (error) {
            console.warn('[NetWorthOverlay] Failed to place panel next to the ticker:', error);
          }
        });
      }
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

  // Ticker: off until turned on in Settings → Net Worth; visible only while signed in and in game context
  // (Diablo focused, or one of our windows focused from it)
  const tickerWanted = settings.netWorthTickerEnabled === true && !!settings.pd2Token;
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
