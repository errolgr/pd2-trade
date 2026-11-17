import React from 'react';
import { Check, Circle, Copy, MessageSquare, Tag, User as UserIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { WtbRequestResponses } from './WtbResponses';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { presenceLabel, traderPresence, useTraderProfile } from '@/pages/chat/hooks/useTraderProfile';
import { PRESENCE_TONE } from '@/pages/market/enrich/SellerCard';
import { useNow } from '@/pages/market/enrich/useNow';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { t as translate, useTranslation } from '@/i18n';
import { SellerName } from '../components/SellerName';
import { formatStat } from '../components/stat-text';
import { groupOf } from '../lib/stat-groups';
import { formatOffer, wtbDaysLeft, wtbStatRows, wtbWhisper, type WtbRequest } from '../lib/wtb';
import { itemRowValue, summaryRowText, wtbTitleColor } from './wtb-text';
import { WtbItemArt } from './WtbItemArt';
import { useWtbWhisper } from './useWtbWhisper';
import { ownerActionsFor, wtbTimes, wtbTimesLine } from './wtb-bump';
import { markFilledPatch, selectionContactItem } from './wtb-responses';
import { WtbOwnerActionButtons, type WtbOwnerActions } from './WtbOwnerActions';

/** What the drawer shows: a request, and what the user holds that matches it when known. */
export interface WtbSelection {
  request: WtbRequest;
  /** Which nice-to-have rows the user's item meets (from `/match`). */
  niceToHave?: { id: string; met: boolean }[];
  /** The stash item it fits (Fits my stash). */
  stashItem?: GameStashItem;
  /** The price-checked item's clipboard JSON: "List it at {offer}" opens the list item tab with it. */
  itemText?: string;
  /** The user's listing it was opened from (Listed items' "N buyers"): sent with a contact. */
  listingItem?: object;
}

/** The buyer: name (opens their Trader sidebar in Chat), in-game account and presence from their listings. */
function BuyerCard({ request }: { request: WtbRequest }) {
  const { t } = useTranslation('market');
  const { openPanel } = useOverlay();
  const now = useNow();
  const profile = useTraderProfile(request.buyer.userId, now);
  const presence = traderPresence(profile.listings, now);
  return (
    <section aria-label={t('wtb.drawer.buyer')}
      className="flex items-start gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <UserIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <SellerName
            className="text-sm font-semibold"
            onOpen={() =>
              openPanel(
                'chat',
                { userId: request.buyer.userId, userName: request.buyer.name, trader: true },
                { focus: true },
              )
            }
          >
            {request.buyer.name}
          </SellerName>
          <span className="truncate text-xs text-muted-foreground">*{request.whisperTo}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden
            className={cn('size-2 shrink-0 rounded-full', PRESENCE_TONE[presence.kind])} />
          {presenceLabel(presence, now)}
        </div>
      </div>
    </section>
  );
}

/** "Shared stash · page 3" / "Personal stash of sorc". */
function stashPlace(item: GameStashItem): string {
  if (item.character_id) return translate('market:wtb.drawer.personalStash', { name: item.character_id });
  return translate('market:wtb.drawer.sharedStash', { page: (item.location?.stash_page ?? 0) + 1 });
}

/**
 * Right pane of the Wanted source: one buy request, its buyer, what it wants (✓ met by the user's item with their
 * value, ○ nice-to-have it lacks), the matching stash item, and the ways to reach the buyer.
 */
export function WtbRequestDrawer({
  selection,
  own,
  owner,
  onListAt,
  onClose,
}: {
  selection: WtbSelection;
  /** The user's own request: their actions (Bump, Edit, Pause / Resume, Close) instead of whispering. */
  own: boolean;
  owner: WtbOwnerActions;
  /** "List it at {offer}" (offered with a price-checked or fitting stash item). */
  onListAt: (selection: WtbSelection) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('market');
  const now = useNow();
  const { whisper, copyWhisper } = useWtbWhisper('market');
  const token = useOptions().settings?.pd2Token || null;
  const { request, niceToHave, stashItem, itemText } = selection;
  const offer = formatOffer(request.offer);
  const days = wtbDaysLeft(request, now);
  const ownerActions = own ? ownerActionsFor(request, now) : null;
  const times = wtbTimesLine(wtbTimes(request, now));
  // Matched: every required row is met; nice-to-have rows as `/match` said
  const matched = !!niceToHave || !!stashItem;
  const niceMet = new Map((niceToHave ?? []).map((n) => [n.id, n.met]));
  const rows = wtbStatRows(request.filters);

  return (
    <aside
      aria-label={t('wtb.drawer.title')}
      className="flex h-full min-h-0 flex-col border-l border-border bg-card/40"
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {t('wtb.drawer.title')}
          {` · ${request.filters.ladder ? 'Ladder' : 'Non-ladder'} ${request.filters.hardcore ? 'HC' : 'SC'} · ${times}`}
        </span>
        <Button variant="ghost"
          size="sm"
          className="size-7 p-0"
          aria-label={t('detail.close')}
          onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        <div className="space-y-3 p-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <WtbItemArt filters={request.filters}
              className="size-12"
              artClassName="max-h-11 max-w-11" />
            <div className="flex min-w-0 items-baseline gap-2">
              <span className={cn('min-w-0 truncate text-sm font-semibold', wtbTitleColor(request.filters))}>
                {request.title}
              </span>
              {request.filters.corrupted === 'yes' && (
                <span className="shrink-0 text-[10px] text-q-corrupted">{t('wtb.corrupted')}</span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-muted/30 p-2">
            <div className="text-lg font-bold tabular-nums text-q-gold">{offer}</div>
            <div className="text-[11px] text-muted-foreground">
              {request.openToOffers
                ? t('wtb.drawer.openToOffersLeft', { count: days })
                : t('wtb.daysLeft', { count: days })}
            </div>
          </div>

          {own ? (
            <WtbRequestResponses
              request={request}
              token={token}
              onMarkFilled={(response) => owner.onPatch(request, markFilledPatch(response))}
            />
          ) : (
            <BuyerCard request={request} />
          )}

          {rows.length > 0 && (
            <section className="space-y-1">
              <h4 className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stashItem ? t('wtb.drawer.wantsYourItem') : t('wtb.drawer.wants')}
              </h4>
              <ul className="space-y-0.5">
                {rows.map((row) => {
                  const nice = request.niceToHaveIds.includes(row.id);
                  const required = !nice && groupOf(row) === 'and';
                  const met = matched && (required || niceMet.get(row.id) === true);
                  const value = met && stashItem ? itemRowValue(stashItem, row) : null;
                  return (
                    <li key={row.id}
                      className="flex min-w-0 items-center gap-1.5 text-xs">
                      {met ? (
                        <Check className="size-3 shrink-0 text-success"
                          aria-label={t('wtb.drawer.met')} />
                      ) : (
                        <Circle
                          className="size-3 shrink-0 text-muted-foreground"
                          aria-label={nice ? t('wtb.nice') : t('wtb.must')}
                        />
                      )}
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate',
                          met
                            ? row.kind === 'corruption'
                              ? 'text-q-corrupted'
                              : 'text-q-magic'
                            : 'text-muted-foreground',
                        )}
                      >
                        {summaryRowText(row)}
                      </span>
                      {nice && <span className="shrink-0 text-[10px] text-muted-foreground">{t('wtb.nice')}</span>}
                      {value !== null && (
                        <span className="shrink-0 tabular-nums text-foreground/85">{formatStat(value)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {stashItem && (
            <section className="space-y-1">
              <h4 className="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t('wtb.drawer.fromStash')}
              </h4>
              <div className="rounded-md border border-success/40 bg-success/5 px-2 py-1.5 text-xs">
                <div className={cn('truncate font-semibold', qualityColor(stashItem.quality?.name ?? ''))}>
                  {stashItem.name || stashItem.base?.name}
                </div>
                <div className="flex gap-1.5 text-[11px] text-muted-foreground">
                  {stashItem.base?.name && stashItem.base.name !== stashItem.name && <span>{stashItem.base.name}</span>}
                  <span>{stashPlace(stashItem)}</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      {own ? (
        <div className="space-y-1.5 border-t border-border p-2.5">
          {ownerActions && (
            <WtbOwnerActionButtons request={request}
              actions={ownerActions}
              owner={owner}
              layout="drawer" />
          )}
          <p className="text-center text-[11px] text-muted-foreground">{t('wtb.drawer.own')}</p>
        </div>
      ) : (
        <div className="space-y-1.5 border-t border-border p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => void whisper(request, selectionContactItem(selection))}
            >
              <MessageSquare className="size-3.5" />
              <span className="truncate">{t('wtb.whisperBuyer', { name: request.buyer.name })}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => void copyWhisper(request, selectionContactItem(selection))}
            >
              <Copy className="size-3.5" />
              {t('wtb.copyWhisper')}
            </Button>
            {(itemText || stashItem) && (
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 h-8 text-xs"
                onClick={() => onListAt(selection)}
              >
                <Tag className="size-3.5" />
                {t('wtb.listItAt', { offer })}
              </Button>
            )}
          </div>
          <p className="break-words text-[11px] text-muted-foreground">{wtbWhisper(request)}</p>
        </div>
      )}
    </aside>
  );
}
