import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@/lib/browser-events';
import { chatPrefsLoaded, useChatPrefs } from '@/lib/chat-prefs';
import { holdListener } from '@/lib/listener';
import { setBadgeCount } from '@/overlay';
import {
  createHistorySaver,
  dismissTrade,
  EMPTY_HISTORY,
  forgetPerson,
  loadWhisperHistory,
  markRead,
  recordCopiedWhisper,
  recordTrade,
  recordWhisper,
  saveWhisperHistory,
  settleTrade,
  type TradeOutcome,
  type TradeMessageEvent,
  type WhisperEvent,
  type WhisperHistory,
  type WhisperPerson,
} from '@/lib/whisper-history';
import { newTrades } from '@/pages/chat/lib/offers-seen';

type HistoryAction =
  | { type: 'loaded'; history: WhisperHistory }
  | { type: 'trade'; event: TradeMessageEvent; now: number }
  | { type: 'whisper'; event: WhisperEvent; now: number }
  | { type: 'copied'; target: { accountName?: string; playerName: string }; message: string; now: number }
  | { type: 'dismissTrade'; key: string; tradeId: string }
  | { type: 'settleTrade'; key: string; tradeId: string; outcome: TradeOutcome; now: number }
  | { type: 'markRead'; keys: readonly string[] }
  | { type: 'forget'; key: string };

interface HistoryState {
  history: WhisperHistory;
  loaded: boolean;
  /** Bumped by every change after the load; a change schedules a save. */
  revision: number;
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'loaded') return { history: action.history, loaded: true, revision: 0 };
  let history: WhisperHistory;
  switch (action.type) {
    case 'trade':
      history = recordTrade(state.history, action.event, action.now);
      break;
    case 'whisper':
      history = recordWhisper(state.history, action.event, action.now);
      break;
    case 'copied':
      history = recordCopiedWhisper(state.history, action.target, action.message, action.now);
      break;
    case 'dismissTrade':
      history = dismissTrade(state.history, action.key, action.tradeId);
      break;
    case 'settleTrade':
      history = settleTrade(state.history, action.key, action.tradeId, action.outcome, action.now);
      break;
    case 'markRead':
      history = markRead(state.history, action.keys);
      break;
    case 'forget':
      history = forgetPerson(state.history, action.key);
      break;
  }
  return history === state.history ? state : { ...state, history, revision: state.revision + 1 };
}

export interface WhisperHistoryApi {
  people: Record<string, WhisperPerson>;
  /** The saved history has been read (listeners start then). */
  loaded: boolean;
  /** Records a whisper copied to the clipboard as `/w *target message`. */
  recordCopied: (target: { accountName?: string; playerName: string }, message: string) => void;
  dismissTrade: (key: string, tradeId: string) => void;
  /** Closes an open trade as sold, rejected or delisted: it moves from the pinned deals into the conversation. */
  settleTrade: (key: string, tradeId: string, outcome: TradeOutcome) => void;
  markRead: (keys: readonly string[]) => void;
  forget: (key: string) => void;
}

/** How often open trades are re-evaluated for the badge (they stop being open after OPEN_TRADE_MS). */
const CLOCK_TICK_MS = 60_000;

const WhisperHistoryContext = createContext<WhisperHistoryApi | null>(null);

/**
 * Owns the whisper history: loads whisper-history.json, records the chat watcher's `trade-message` and
 * `whisper-received` events (Tauri only), saves debounced, and publishes the open trade whispers received since
 * they were last looked at (see trades-seen) as the `whisperTrades` badge. Mounted once at the app root so
 * whispers are recorded with chat closed.
 */
export function WhisperHistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(historyReducer, { history: EMPTY_HISTORY, loaded: false, revision: 0 });
  const { history, loaded, revision } = state;

  useEffect(() => {
    let cancelled = false;
    loadWhisperHistory(Date.now()).then((loadedHistory) => {
      if (!cancelled) dispatch({ type: 'loaded', history: loadedHistory });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen once loaded, so nothing recorded meanwhile is overwritten by the load
  useEffect(() => {
    if (!loaded || !isTauri()) return;
    const releases = [
      holdListener(
        listen<TradeMessageEvent>('trade-message', (event) =>
          dispatch({ type: 'trade', event: event.payload, now: Date.now() }),
        ),
        'trade-message',
      ),
      holdListener(
        listen<WhisperEvent>('whisper-received', (event) =>
          dispatch({ type: 'whisper', event: event.payload, now: Date.now() }),
        ),
        'whisper-received',
      ),
    ];
    return () => releases.forEach((release) => release());
  }, [loaded]);

  const [saver] = useState(() => createHistorySaver((h) => saveWhisperHistory(h, Date.now())));
  useEffect(() => {
    if (revision > 0) saver.schedule(history);
  }, [saver, history, revision]);
  useEffect(() => () => void saver.flush(), [saver]);

  // A clock, so trades that age out of the open window leave the badge without any other history change
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  const chatPrefs = useChatPrefs();
  useEffect(() => {
    // Until the saved chat prefs are in, every trade would look new
    if (!chatPrefsLoaded()) return;
    setBadgeCount('whisperTrades', newTrades(chatPrefs, Object.values(history.people), now).length);
  }, [history.people, now, chatPrefs]);

  // Stable across history changes (dispatch never changes), so consumers can use them as effect deps
  const [actions] = useState(() => ({
    recordCopied: (target: { accountName?: string; playerName: string }, message: string) =>
      dispatch({ type: 'copied', target, message, now: Date.now() }),
    dismissTrade: (key: string, tradeId: string) => dispatch({ type: 'dismissTrade', key, tradeId }),
    settleTrade: (key: string, tradeId: string, outcome: TradeOutcome) =>
      dispatch({ type: 'settleTrade', key, tradeId, outcome, now: Date.now() }),
    markRead: (keys: readonly string[]) => dispatch({ type: 'markRead', keys }),
    forget: (key: string) => dispatch({ type: 'forget', key }),
  }));
  const api = useMemo<WhisperHistoryApi>(
    () => ({ people: history.people, loaded, ...actions }),
    [history.people, loaded, actions],
  );

  return <WhisperHistoryContext.Provider value={api}>{children}</WhisperHistoryContext.Provider>;
}

export function useWhisperHistory(): WhisperHistoryApi {
  const api = useContext(WhisperHistoryContext);
  if (!api) throw new Error('useWhisperHistory must be used inside <WhisperHistoryProvider>');
  return api;
}
