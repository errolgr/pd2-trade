import React from 'react';
import { ChevronsUp, Pause, Pencil, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tip } from '@/components/ui/tooltip';
import { useTranslation } from '@/i18n';
import type { WtbPatch } from '../alerts/wtb-api';
import { iconActionClass } from '../components/ListingActions';
import type { WtbRequest } from '../lib/wtb';
import type { BumpState, OwnerActionSet } from './wtb-bump';

/** Owner actions on a request (handled by the market page: they update Mine and the shown results). */
export interface WtbOwnerActions {
  onEdit: (request: WtbRequest) => void;
  /** Resolves once done (a failure is toasted by the page). */
  onPatch: (request: WtbRequest, patch: WtbPatch) => Promise<void>;
  onBump: (request: WtbRequest) => void;
  /** The request an action is running on. */
  busyId: string | null;
}

/** "Bump", "Bump in 3h 20m" (cooling down) or "Bump to revive" (expired). */
export function useBumpLabel(): (state: BumpState) => string {
  const { t } = useTranslation('market');
  return (state) =>
    state.kind === 'cooldown'
      ? t('wtb.bump.in', { h: state.wait.hours, m: state.wait.minutes })
      : state.kind === 'revive'
        ? t('wtb.bump.revive')
        : t('wtb.bump.label');
}

/**
 * The owner's actions on a request: Bump (disabled while cooling down; "Bump to revive" on an expired one, its
 * primary action), Edit, Pause / Resume, Close. `card`: the card footer's text bump and icon buttons; `row`: the
 * bump alone, as an icon; `drawer`: full-width buttons.
 */
export function WtbOwnerActionButtons({
  request,
  actions,
  owner,
  layout,
}: {
  request: WtbRequest;
  actions: OwnerActionSet;
  owner: WtbOwnerActions;
  layout: 'card' | 'row' | 'drawer';
}) {
  const { t } = useTranslation('market');
  const bumpLabel = useBumpLabel();
  const busy = owner.busyId === request.id;
  const run = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
  };
  const { bump } = actions;
  const cooling = bump?.kind === 'cooldown';

  if (layout === 'row') {
    if (!bump) return null;
    const label = bumpLabel(bump);
    return (
      <Tip label={label}>
        {/* Disabled buttons swallow hover: the span keeps the cooldown tooltip */}
        <span className="shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={cn(iconActionClass, 'size-5', bump.kind === 'revive' && 'text-primary')}
            aria-label={label}
            disabled={busy || cooling}
            onClick={run(() => owner.onBump(request))}
          >
            <ChevronsUp className="size-3.5" />
          </Button>
        </span>
      </Tip>
    );
  }

  const drawer = layout === 'drawer';
  const bumpButton = bump && (
    <Tip label={cooling ? bumpLabel(bump) : undefined}>
      <span className={cn(drawer && 'col-span-2')}>
        <Button
          size="sm"
          variant={bump.kind === 'ready' && !drawer ? 'outline' : 'default'}
          className={cn('h-7 px-2.5 text-xs', drawer && 'h-8 w-full')}
          disabled={busy || cooling}
          onClick={run(() => owner.onBump(request))}
        >
          <ChevronsUp className="size-3.5" />
          {bumpLabel(bump)}
        </Button>
      </span>
    </Tip>
  );
  const action = (label: string, icon: React.ReactNode, onClick: () => void) =>
    drawer ? (
      <Button variant="outline"
        size="sm"
        className="h-8 text-xs"
        disabled={busy}
        onClick={run(onClick)}>
        {icon}
        {label}
      </Button>
    ) : (
      <Tip label={label}>
        <Button
          variant="ghost"
          size="sm"
          className={iconActionClass}
          aria-label={label}
          disabled={busy}
          onClick={run(onClick)}
        >
          {icon}
        </Button>
      </Tip>
    );
  const rest = (
    <>
      {actions.edit && action(t('wtb.mine.edit'), <Pencil className="size-3.5" />, () => owner.onEdit(request))}
      {actions.pause &&
        action(t('wtb.mine.pause'), <Pause className="size-3.5" />, () => owner.onPatch(request, { status: 'paused' }))}
      {actions.resume &&
        action(t('wtb.mine.resume'), <Play className="size-3.5" />, () => owner.onPatch(request, { status: 'open' }))}
      {actions.close &&
        action(t('wtb.mine.close'), <X className="size-3.5" />, () => owner.onPatch(request, { status: 'closed' }))}
    </>
  );
  return drawer ? (
    <div className="grid grid-cols-2 gap-1.5">
      {bumpButton}
      {rest}
    </div>
  ) : (
    <>
      {rest}
      {bumpButton}
    </>
  );
}
