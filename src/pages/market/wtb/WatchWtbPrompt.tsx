import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useOptions } from '@/hooks/useOptions';
import { useTranslation } from '@/i18n';
import { trackEvent } from '@/lib/telemetry';
import type { MarketFilters } from '../lib/types';
import type { WtbRequest } from '../lib/wtb';
import { shouldPromptWtb, WTB_PROMPT_MS } from './wtb-watch-prompt';

/** What Watch needs to offer "Also post a buy request?" once it starts watching. */
export interface WatchWtbPrompt {
  /** Starting a watch on `filters` offers a request (see shouldPromptWtb). */
  offer: (filters: MarketFilters) => boolean;
  /** "Post buy request": the post pane for the filters, prefilled as Want to buy opens it. */
  onPost: () => void;
  /** "Don't ask again": turns the prompt off (Settings → Market turns it back on). */
  onNever: () => void;
}

/** The Search tab's prompt after Watch: the user's settings and requests, and how to open the post pane. */
export function useWatchWtbPrompt({
  signedIn,
  posting,
  mine,
  onPost,
}: {
  signedIn: boolean;
  posting: boolean;
  mine: readonly WtbRequest[];
  onPost: () => void;
}): WatchWtbPrompt {
  const { settings, updateSettings } = useOptions();
  const enabled = settings?.marketWtbPromptEnabled !== false;
  return {
    offer: (filters) => shouldPromptWtb({ filters, signedIn, enabled, posting, mine, now: Date.now() }),
    onPost,
    onNever: () => void updateSettings({ marketWtbPromptEnabled: false }),
  };
}

type DismissReason = 'not_now' | 'never' | 'timeout' | 'escape' | 'outside';

/**
 * "Also post a buy request?" under the Watch button (`children`) while `open`: never takes focus or blocks typing,
 * goes away after WTB_PROMPT_MS unless the pointer or focus is on it, on Escape and on a click elsewhere.
 */
export function WtbPromptPopover({
  open,
  prompt,
  onClose,
  children,
}: {
  open: boolean;
  prompt: WatchWtbPrompt;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('market');
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = hovered || focused;
  // Each showing starts unheld (the content unmounts while closed, so no leave / blur arrives)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setHovered(false);
    setFocused(false);
  }

  // One close per showing (a click on "Not now" must not also count as a click outside)
  const closed = useRef(false);
  useEffect(() => {
    if (!open) return;
    closed.current = false;
    trackEvent('market_wtb_prompt_shown');
  }, [open]);
  const dismiss = useCallback(
    (reason: DismissReason) => {
      if (closed.current) return;
      closed.current = true;
      trackEvent('market_wtb_prompt_dismissed', { reason });
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open || held) return;
    const timer = window.setTimeout(() => dismiss('timeout'), WTB_PROMPT_MS);
    return () => window.clearTimeout(timer);
  }, [open, held, dismiss]);

  const post = () => {
    if (closed.current) return;
    closed.current = true;
    trackEvent('market_wtb_prompt_accepted');
    onClose();
    prompt.onPost();
  };
  const never = () => {
    prompt.onNever();
    dismiss('never');
  };

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <span className="inline-flex shrink-0">{children}</span>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        role="dialog"
        aria-label={t('watch.wtbPrompt.title')}
        className="w-80 p-3"
        // Not a dialog that takes over: the search keeps focus, typing and tabbing don't close it
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          dismiss('outside');
        }}
        onEscapeKeyDown={(e) => {
          // Escape closes just the prompt, not the panel behind it
          e.preventDefault();
          e.stopPropagation();
          dismiss('escape');
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
        }}
      >
        <div className="flex items-start gap-2">
          <ShoppingCart className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{t('watch.wtbPrompt.title')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('watch.wtbPrompt.description')}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Button size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={post}>
            {t('watch.wtbPrompt.post')}
          </Button>
          <Button size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs"
            onClick={() => dismiss('not_now')}>
            {t('watch.wtbPrompt.notNow')}
          </Button>
          <button
            type="button"
            onClick={never}
            className="ml-auto whitespace-nowrap rounded-sm text-[11px] text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {t('watch.wtbPrompt.never')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
