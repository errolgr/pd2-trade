import React from 'react';
import { Loader2, Skull } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { installUpdateAndRelaunch } from '@/lib/updater';
import { RELEASE_PAGE_URL } from '@/lib/manual-update';
import { openUrl } from '@/lib/browser-opener';
import { CustomToastPayload, GenericToastPayload, ToastActionType } from '@/common/types/Events';
import { chatDockSize } from '@/pages/chat/chat-dock';
import { useOverlay, usePanelOpen } from './OverlayProvider';
import type { PanelPayloads } from './types';

const DEFAULT_TITLE = 'PD2 Trader';
const TOAST_MARGIN = 16;

export type ToastPayload = string | GenericToastPayload | CustomToastPayload;

/** Toast actions that open panels go through the overlay; OverlayProvider installs this bridge. */
interface ToastBridge {
  openChat(payload: PanelPayloads['chat']): void;
  openMarket(payload: PanelPayloads['market']): void;
}
let bridge: ToastBridge | null = null;
export function setToastBridge(next: ToastBridge | null): void {
  bridge = next;
}

const marketListingUrl = (listingId: string) => `https://www.projectdiablo2.com/market/listing/${listingId}`;

async function runToastAction(action: NonNullable<CustomToastPayload['action']>): Promise<void> {
  try {
    switch (action.type) {
      case ToastActionType.OPEN_MARKET_LISTING: {
        const listingId = action.data?.listingId;
        if (listingId) await openUrl(marketListingUrl(listingId));
        break;
      }
      case ToastActionType.OPEN_CHAT_CONVERSATION: {
        // Reply: the conversation (or a whisper sender's thread) with the composer focused
        const { conversationId, threadId } = action.data ?? {};
        if (conversationId || threadId) bridge?.openChat({ conversationId, threadId, reply: true });
        break;
      }
      case ToastActionType.OPEN_MARKET_PANEL:
        bridge?.openMarket(action.data);
        break;
      case ToastActionType.UPDATE_AVAILABLE:
        await installUpdateAndRelaunch();
        break;
      case ToastActionType.OPEN_RELEASE_PAGE:
        await openUrl(RELEASE_PAGE_URL);
        break;
      default:
        console.warn('Unknown toast action type:', action.type);
    }
  } catch (error) {
    console.error('Failed to handle toast action:', error);
    if (action.type === ToastActionType.OPEN_MARKET_LISTING && action.data?.listingId) {
      window.open(marketListingUrl(action.data.listingId), '_blank');
    }
  }
}

/** Show a toast in the overlay's ToastLayer. */
export function showToast(payload: ToastPayload): void {
  if (typeof payload === 'string') {
    toast(DEFAULT_TITLE, { description: payload, closeButton: true });
    return;
  }
  if (!payload || typeof payload !== 'object') return;

  if (!('action' in payload)) {
    const generic = payload as GenericToastPayload;
    const options = { description: generic.description, duration: generic.duration, closeButton: true };
    const title = generic.title || DEFAULT_TITLE;
    switch (generic.variant) {
      case 'error':
        toast.error(title, options);
        break;
      case 'success':
        toast.success(title, options);
        break;
      case 'warning':
        toast.warning(title, options);
        break;
      case 'info':
        toast.info(title, options);
        break;
      case 'corrupted-zone':
        // Not a sonner type: the class sets the accent (bar + icon) to the corrupted zone purple
        toast(title, { ...options, className: '[--toast-accent:var(--q-corrupted-zone)]', icon: <Skull /> });
        break;
      default:
        toast(title, options);
    }
    return;
  }

  const custom = payload as CustomToastPayload;
  const action = custom.action;
  if (!action) {
    // An object with a falsy `action` keeps the old ToastPage behaviour: a plain PD2 Trader toast.
    toast(DEFAULT_TITLE, { description: custom.description, closeButton: true });
    return;
  }
  toast(custom.title || DEFAULT_TITLE, {
    description: custom.description,
    duration: custom.duration,
    closeButton: true,
    action: {
      label: action.label,
      // sonner dismisses the toast after onClick
      onClick: () => void runToastAction(action),
    },
  });
}

/**
 * Success toast with an image preview (price check "Copy image"). Owns `imageUrl` (an object URL):
 * revoked when the toast closes.
 */
export function imageToast({ title, description, imageUrl }: { title: string; description?: string; imageUrl: string }): void {
  const revoke = () => URL.revokeObjectURL(imageUrl);
  toast.success(title, {
    description: (
      <span className="flex flex-col gap-2">
        {description && <span>{description}</span>}
        <img src={imageUrl}
          alt=""
          className="max-h-40 w-auto max-w-full self-start rounded border border-border object-contain" />
      </span>
    ),
    closeButton: true,
    onDismiss: revoke,
    onAutoClose: revoke,
  });
}

export interface ConfirmToastOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Default 'default'; 'warning' for destructive confirmations. */
  variant?: 'default' | 'warning';
  /** ms before the toast auto-dismisses (= cancelled). Default 5000. */
  duration?: number;
  onConfirm: () => void | Promise<void>;
}

/** In-overlay confirmation (never window.confirm: it wedges the non-focusable overlay window). */
export function confirmToast({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  duration = 5000,
  onConfirm,
}: ConfirmToastOptions): void {
  const show = variant === 'warning' ? toast.warning : toast;
  show(title, {
    description,
    duration,
    action: {
      label: confirmLabel,
      onClick: () => {
        Promise.resolve()
          .then(onConfirm)
          .catch((error) => console.error('[overlay] confirm action failed:', error));
      },
    },
    cancel: { label: cancelLabel, onClick: () => {} },
  });
}

export interface UndoToastOptions {
  title: string;
  description?: string;
  /** ms the Undo button stays. */
  duration: number;
  onUndo: () => void;
}

/** A toast with an Undo button; returns a function that dismisses it (e.g. once the undo window closed). */
export function undoToast({ title, description, duration, onUndo }: UndoToastOptions): () => void {
  const id = toast(title, { description, duration, action: { label: 'Undo', onClick: onUndo } });
  return () => toast.dismiss(id);
}

/**
 * Sonner toaster pinned to the bottom-right corner of the game rect while in game, otherwise of the overlay
 * (the screen's work area, just above the taskbar). In game the stack starts left of the chat dock's edge strip, so
 * a new-message toast never hides the dock's badges. Rendered by OverlayRoot.
 */
export function ToastLayer() {
  const { gameRect, gameFocused } = useOverlay();
  const dockShown = usePanelOpen('chatButton') && gameFocused;
  const anchor = gameFocused ? gameRect : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  const dock = chatDockSize(gameRect.height);

  const offset = {
    right:
      Math.max(0, window.innerWidth - (anchor.x + anchor.width)) +
      (dockShown ? dock.width + TOAST_MARGIN / 2 : TOAST_MARGIN),
    bottom: Math.max(0, window.innerHeight - (anchor.y + anchor.height)) + TOAST_MARGIN,
  };

  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      gap={10}
      offset={offset}
      mobileOffset={offset}
      style={TOAST_THEME_VARS}
      icons={{ loading: <Loader2 className="size-4 animate-spin text-muted-foreground" /> }}
      toastOptions={{
        classNames: {
          // pointer-events-auto: toasts stay clickable while a modal Radix layer sets body { pointer-events: none }
          toast:
            'group toast pointer-events-auto !rounded-lg !border backdrop-blur-md !gap-3 !py-3.5 !pl-4 !pr-4 ' +
            '!shadow-[inset_3px_0_0_var(--toast-accent,var(--glow)),var(--shadow-panel)]',
          // sonner always applies `default` too, so the neutral accent is the var() fallback instead
          success: '[--toast-accent:var(--success)]',
          error: '[--toast-accent:var(--destructive)]',
          warning: '[--toast-accent:var(--warning)]',
          info: '[--toast-accent:var(--info)]',
          loading: '[--toast-accent:var(--muted-foreground)]',
          title: '!text-sm !font-semibold !leading-tight tracking-tight',
          description: '!text-[13px] !leading-snug !text-popover-foreground/80',
          icon: '!size-4 text-[var(--toast-accent,var(--glow))] [&>svg]:!size-4',
          actionButton: ACTION_BUTTON_CLASS,
          cancelButton: CANCEL_BUTTON_CLASS,
          closeButton:
            '!border-border !bg-popover !text-muted-foreground transition-colors duration-(--dur-fast) hover:!bg-accent hover:!text-accent-foreground',
        },
      }}
    />
  );
}

const ACTION_BUTTON_CLASS =
  '!h-7 !rounded-md !bg-primary !px-2.5 !text-xs !font-semibold !text-primary-foreground transition-[filter,scale] duration-(--dur-fast) hover:brightness-110 active:scale-95';
const CANCEL_BUTTON_CLASS =
  '!h-7 !rounded-md !bg-muted !px-2.5 !text-xs !font-medium !text-muted-foreground transition-[color,scale] duration-(--dur-fast) hover:!text-foreground active:scale-95';

/**
 * Map sonner's palette variables onto the active theme tokens, so plain and richColors toasts
 * follow all themes instead of sonner's fixed light/dark palette. Inline styles on the
 * toaster beat sonner's `[data-sonner-theme]` rules.
 */
const tint = (token: string, amount: number) => `color-mix(in oklab, var(${token}) ${amount}%, var(--popover))`;
const TOAST_THEME_VARS = {
  '--normal-bg': 'color-mix(in oklab, var(--popover) var(--window-opacity-elevated), transparent)',
  '--normal-border': 'var(--border)',
  '--normal-text': 'var(--popover-foreground)',
  '--success-bg': tint('--success', 12),
  '--success-border': tint('--success', 40),
  '--success-text': 'var(--popover-foreground)',
  '--error-bg': tint('--destructive', 12),
  '--error-border': tint('--destructive', 40),
  '--error-text': 'var(--popover-foreground)',
  '--warning-bg': tint('--warning', 12),
  '--warning-border': tint('--warning', 40),
  '--warning-text': 'var(--popover-foreground)',
  '--info-bg': tint('--info', 12),
  '--info-border': tint('--info', 40),
  '--info-text': 'var(--popover-foreground)',
} as React.CSSProperties;
