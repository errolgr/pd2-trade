import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  BadgeCheck,
  Check,
  Download,
  Globe,
  Minus,
  Plus,
  Puzzle,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { PERMISSIONS, type Permission } from '@pd2-trader/plugin-sdk';
import { Badge, Button, ToggleGroup, ToggleGroupItem, cn } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import type { Listing, ListingRating, PermissionChanges } from '../../marketplace/api';
import type { ListingState } from '../../marketplace/listing-state';
import { permissionKey } from '../permission-labels';
import type { Installer } from './installer';

/** Small building blocks of the marketplace views (cards, detail header, reviews). */

export const TONE_BADGE = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
  muted: 'border-border text-muted-foreground',
} as const;

export const CHIP_BADGE = 'rounded-sm px-1.5 py-0';

/** Read-only 0-5 stars (rounded to the nearest whole star). DS candidate: rating display. */
export function RatingStars({ value, className }: { value: number | null; className?: string }) {
  const { t } = useTranslation('plugins');
  const filled = Math.round(value ?? 0);
  return (
    <span
      role="img"
      aria-label={
        value == null ? t('marketplace.rating.none') : t('marketplace.rating.label', { value: value.toFixed(1) })
      }
      className={cn('inline-flex items-center gap-px', className)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn('size-3', i <= filled ? 'fill-current text-foreground' : 'text-muted-foreground/50')}
        />
      ))}
    </span>
  );
}

/** Average stars + count, or "No ratings" when nobody rated yet. */
export function RatingSummary({ rating }: { rating: ListingRating }) {
  const { t } = useTranslation('plugins');
  if (!rating.count) return <span className="text-muted-foreground">{t('marketplace.rating.none')}</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <RatingStars value={rating.average} />
      <span className="tabular-nums text-muted-foreground">
        {rating.average?.toFixed(1)} ({t('marketplace.rating.count', { count: rating.count })})
      </span>
    </span>
  );
}

/** 1-5 star picker (one ToggleGroup item per star; hovering previews). DS candidate: rating input. */
export function RatingInput({
  value,
  onChange,
  disabled,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
}) {
  const { t } = useTranslation('plugins');
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <ToggleGroup
      id={id}
      type="single"
      size="sm"
      value={value ? String(value) : ''}
      onValueChange={(v) => v && onChange(Number(v))}
      disabled={disabled}
      aria-label={t('marketplace.reviews.ratingLabel')}
      onPointerLeave={() => setHover(0)}
      className="gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <ToggleGroupItem
          key={i}
          value={String(i)}
          aria-label={t('marketplace.reviews.stars', { count: i })}
          onPointerEnter={() => setHover(i)}
          className="size-7 min-w-7 p-0 data-[state=on]:bg-transparent"
        >
          <Star
            aria-hidden
            className={cn('size-4', i <= shown ? 'fill-current text-foreground' : 'text-muted-foreground/60')}
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function ListingIcon({ listing, size = 'md' }: { listing: Pick<Listing, 'iconUrl'>; size?: 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false);
  const box = size === 'lg' ? 'size-12' : 'size-9';
  if (listing.iconUrl && !broken)
    return (
      <img
        src={listing.iconUrl}
        alt=""
        onError={() => setBroken(true)}
        className={cn(box, 'shrink-0 rounded-md border border-border object-cover')}
      />
    );
  return (
    <span className={cn(box, 'flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground')}>
      <Puzzle className="size-4"
        aria-hidden />
    </span>
  );
}

export function VerifiedBadge() {
  const { t } = useTranslation('plugins');
  return (
    <Badge variant="outline"
      className={cn(TONE_BADGE.success, CHIP_BADGE)}
      title={t('marketplace.verifiedHint')}>
      <BadgeCheck aria-hidden />
      {t('marketplace.verified')}
    </Badge>
  );
}

/** Two lines: "by author ✓ Verified", then "★ 4.5 (12 ratings) · 1,840 installs". */
export function ListingMeta({ listing }: { listing: Listing }) {
  const { t } = useTranslation('plugins');
  return (
    <div className="flex flex-col gap-0.5 text-muted-foreground">
      <div className="flex min-w-0 items-center gap-1.5">
        {listing.author && <span className="truncate">{t('marketplace.by', { author: listing.author })}</span>}
        {listing.verified && <VerifiedBadge />}
      </div>
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <RatingSummary rating={listing.rating} />
        <span aria-hidden>·</span>
        <span className="tabular-nums">{t('marketplace.installs', { count: listing.installs })}</span>
      </div>
    </div>
  );
}

/** Warning when the latest version needs another overlay SDK (`compatible === false`). */
export function CompatibilityNote({ listing }: { listing: Pick<Listing, 'compatible' | 'sdk'> }) {
  const { t } = useTranslation('plugins');
  if (listing.compatible !== false) return null;
  return (
    <p className="flex items-center gap-1 text-warning"
      role="note">
      <AlertTriangle className="size-3.5 shrink-0"
        aria-hidden />
      {t('marketplace.incompatible', { sdk: listing.sdk ?? '?' })}
    </p>
  );
}

export function AccessChips({
  permissions,
  network,
}: {
  permissions: readonly Permission[];
  network: readonly string[];
}) {
  const { t } = useTranslation('plugins');
  if (permissions.length === 0 && network.length === 0)
    return <span className="text-muted-foreground">{t('marketplace.noAccess')}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {permissions.map((p) => (
        <Badge
          key={p}
          variant="outline"
          className={cn(TONE_BADGE.muted, CHIP_BADGE)}
          title={t(permissionKey(p, 'description'))}
        >
          <ShieldCheck aria-hidden />
          {t(permissionKey(p, 'label'))}
        </Badge>
      ))}
      {network.map((host) => (
        <Badge
          key={host}
          variant="outline"
          className={cn(TONE_BADGE.warning, CHIP_BADGE)}
          title={t('consent.network', { host })}
        >
          <Globe aria-hidden />
          {host}
        </Badge>
      ))}
    </div>
  );
}

/** Install / Update / Installed / Blocked for one listing. Updates open the update sheet (`onUpdate`). */
export function ListingAction({
  listing,
  state,
  installer,
  onUpdate,
}: {
  listing: Pick<Listing, 'id' | 'name' | 'compatible'>;
  state: ListingState;
  installer: Installer;
  onUpdate: () => void;
}) {
  const { t } = useTranslation('plugins');
  const busy = installer.pending === listing.id;
  if (state.kind === 'blocked')
    return (
      <Badge
        variant="outline"
        className={TONE_BADGE.destructive}
        title={state.reason ? t('marketplace.blockedHint', { reason: state.reason }) : undefined}
      >
        <Ban aria-hidden />
        {t('marketplace.blocked')}
      </Badge>
    );
  if (state.kind === 'installed')
    return (
      <Badge variant="outline"
        className={TONE_BADGE.success}>
        <Check aria-hidden />
        {t('marketplace.installed')}
      </Badge>
    );
  if (state.kind === 'update')
    return (
      <Button size="sm"
        variant="secondary"
        onClick={onUpdate}>
        <Download className="size-4" />
        {t('marketplace.updateAvailable', { version: state.version })}
      </Button>
    );
  return (
    <Button
      size="sm"
      disabled={installer.pending !== null || state.kind === 'unavailable' || listing.compatible === false}
      onClick={() => void installer.install(listing)}
    >
      <Download className="size-4" />
      {busy ? t('marketplace.installing') : t('marketplace.install')}
    </Button>
  );
}

/** Label of a permission string from the server; one this app does not know (a newer SDK) shows as-is. */
export function usePermissionLabel(): (permission: string) => string {
  const { t } = useTranslation('plugins');
  return (permission) =>
    (PERMISSIONS as readonly string[]).includes(permission)
      ? t(permissionKey(permission as Permission, 'label'))
      : permission;
}

/** Added (warning) and removed (muted, struck) permissions and hosts of a version or an update. */
export function AccessChanges({ changes }: { changes: PermissionChanges }) {
  const { t } = useTranslation('plugins');
  const label = usePermissionLabel();
  const { permissionsAdded, permissionsRemoved, hostsAdded, hostsRemoved } = changes;
  if (!permissionsAdded.length && !permissionsRemoved.length && !hostsAdded.length && !hostsRemoved.length) return null;
  return (
    <ul className="flex flex-wrap gap-1"
      aria-label={t('marketplace.changes.label')}>
      {permissionsAdded.map((p) => (
        <li key={`+${p}`}>
          <Badge variant="outline"
            className={cn(TONE_BADGE.warning, CHIP_BADGE)}>
            <Plus aria-hidden />
            {t('marketplace.changes.added', { name: label(p) })}
          </Badge>
        </li>
      ))}
      {hostsAdded.map((h) => (
        <li key={`+${h}`}>
          <Badge variant="outline"
            className={cn(TONE_BADGE.warning, CHIP_BADGE)}>
            <Globe aria-hidden />
            {t('marketplace.changes.added', { name: h })}
          </Badge>
        </li>
      ))}
      {permissionsRemoved.map((p) => (
        <li key={`-${p}`}>
          <Badge variant="outline"
            className={cn(TONE_BADGE.muted, CHIP_BADGE, 'line-through')}>
            <Minus aria-hidden />
            {t('marketplace.changes.removed', { name: label(p) })}
          </Badge>
        </li>
      ))}
      {hostsRemoved.map((h) => (
        <li key={`-${h}`}>
          <Badge variant="outline"
            className={cn(TONE_BADGE.muted, CHIP_BADGE, 'line-through')}>
            <Minus aria-hidden />
            {t('marketplace.changes.removed', { name: h })}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
