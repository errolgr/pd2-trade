import React, { useEffect, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useTranslation } from '@/i18n';
import { trackEvent } from '@/lib/telemetry';

/**
 * Set once the user has met buy requests: dismissed the callout, opened the post pane, looked at the Wanted source or
 * got the "Also post a buy request?" prompt after Watch. The callout shows only before that.
 */
export const WTB_CALLOUT_STORAGE_KEY = 'pd2-wtb-callout-seen';

function readSeen(): boolean {
  try {
    return localStorage.getItem(WTB_CALLOUT_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

let seen = readSeen();
const listeners = new Set<() => void>();

/** Buy requests are no longer new to this user: the callout goes away for good. */
export function markWtbCalloutSeen(): void {
  if (seen) return;
  seen = true;
  try {
    localStorage.setItem(WTB_CALLOUT_STORAGE_KEY, '1');
  } catch {
    // storage unavailable: it shows again next launch
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The one-time "NEW · Buy requests" callout under Want to buy (`children`) while `show` and not seen yet. Stays until
 * dismissed (✕) or until buy requests are used (markWtbCalloutSeen); never takes focus or closes on a click elsewhere.
 */
export function WtbNewCallout({ show, children }: { show: boolean; children: React.ReactNode }) {
  const { t } = useTranslation('market');
  const isSeen = useSyncExternalStore(subscribe, () => seen);
  const open = show && !isSeen;
  useEffect(() => {
    if (open) trackEvent('market_wtb_callout_shown');
  }, [open]);

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <span className="inline-flex shrink-0">{children}</span>
      </PopoverAnchor>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        role="note"
        aria-label={t('wtb.callout.title')}
        className="w-80 border-primary p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold tracking-wider text-primary-foreground">
            {t('wtb.callout.badge')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{t('wtb.callout.title')}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('wtb.callout.description', { wanted: t('filters.source.short.wanted') })}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('wtb.callout.dismiss')}
            onClick={() => {
              trackEvent('market_wtb_callout_dismissed');
              markWtbCalloutSeen();
            }}
            className="cursor-pointer rounded p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
