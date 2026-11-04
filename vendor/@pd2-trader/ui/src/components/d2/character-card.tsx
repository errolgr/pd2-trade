import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { ItemCard } from '../card';
import { CurrencyAmount, PriceTag, type PriceUnit } from '../price';
import { ClassIcon } from './class-icon';
import { CLASS_TEXT, toD2Class, type D2Class } from './data';
import { useD2Labels } from './labels';
import { ModeBadge } from './mode-badge';

interface CharacterCardProps {
  name: string;
  cls: D2Class | (string & {});
  level: number;
  ladder?: boolean;
  hardcore?: boolean;
  /** Classic (non-expansion) character. */
  classic?: boolean;
  season?: number | string;
  dead?: boolean;
  /** Guild tag or name. */
  guild?: React.ReactNode;
  /** Formatted by the host ("2h ago"). */
  lastSeen?: React.ReactNode;
  /** Build tag ("Blizzard", "Hammerdin"). */
  build?: React.ReactNode;
  /** Class portrait URL (see ClassIcon); `null` for the lettered tile. */
  portraitSrc?: string | null;
  /** Gear value, shown on the right. */
  value?: { amount: number; unit: PriceUnit; rune?: string; label?: React.ReactNode };
  /** Extra full-variant line (life / mana / attributes). */
  stats?: React.ReactNode;
  /** Trailing controls (follow, open). Full variant: header right; compact: after the meta. */
  actions?: React.ReactNode;
  /** `compact` one-line row for lists and search hits, `full` card for headers and grids. Default `compact`. */
  variant?: 'compact' | 'full';
  /** Makes the card a button (compact: ghost row; full: interactive card). */
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

/**
 * A PD2 character: class portrait, name, level and class in the class color, mode chips (ladder, hardcore,
 * season, dead), guild, build tag, last seen, gear value.
 */
function CharacterCard({
  name,
  cls,
  level,
  ladder,
  hardcore,
  classic,
  season,
  dead,
  guild,
  lastSeen,
  build,
  portraitSrc,
  value,
  stats,
  actions,
  variant = 'compact',
  onClick,
  selected,
  className,
}: CharacterCardProps) {
  const l = useD2Labels();
  const id = toD2Class(cls);
  const classLine = (
    <span className="whitespace-nowrap">
      <span className="text-foreground tabular-nums">{l.level(String(level))}</span>{' '}
      <span className={id ? CLASS_TEXT[id] : 'text-muted-foreground'}>{id ? l.className(id) : cls}</span>
    </span>
  );
  const buildTag = build && (
    <span className="truncate rounded-sm bg-muted/60 px-1.5 py-px text-2xs text-foreground">{build}</span>
  );

  if (variant === 'compact') {
    const body = (
      <>
        <ClassIcon cls={cls}
          src={portraitSrc}
          size={28} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className={cn('truncate text-sm font-medium', dead && 'text-muted-foreground line-through')}>
              {name}
            </span>
            {guild && <span className="shrink-0 truncate text-2xs text-muted-foreground">{guild}</span>}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
            {classLine}
            {buildTag}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 leading-tight">
          <ModeBadge ladder={ladder}
            hardcore={hardcore}
            classic={classic}
            season={season}
            dead={dead}
            size="short" />
          {(value || lastSeen) && (
            <span className="flex items-center gap-2 text-2xs text-muted-foreground">
              {value && <PriceTag amount={value.amount}
                unit={value.unit}
                rune={value.rune}
                className="font-medium text-q-gold" />}
              {lastSeen}
            </span>
          )}
        </span>
        {actions}
      </>
    );
    return onClick ? (
      <Button variant="ghost"
        size="row"
        data-slot="character-card"
        data-variant="compact"
        aria-current={selected || undefined}
        onClick={onClick}
        className={className}>
        {body}
      </Button>
    ) : (
      <div data-slot="character-card"
        data-variant="compact"
        className={cn('flex w-full items-center gap-2 px-2 py-1.5', className)}>
        {body}
      </div>
    );
  }

  return (
    <ItemCard
      data-slot="character-card"
      data-variant="full"
      tone={onClick ? (selected ? 'selected' : 'interactive') : 'static'}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
          : undefined
      }
      className={cn('flex flex-col gap-2', className)}
    >
      <div className="flex items-start gap-3">
        <ClassIcon cls={cls}
          src={portraitSrc}
          size={44} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span
              className={cn('truncate text-base leading-tight font-semibold', dead && 'text-muted-foreground')}
              style={{ fontFamily: 'DiabloFont' }}
            >
              {name}
            </span>
            <ModeBadge ladder={ladder}
              hardcore={hardcore}
              classic={classic}
              season={season}
              dead={dead} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {classLine}
            {guild && <span className="truncate">· {guild}</span>}
            {buildTag}
          </div>
          {stats && <div className="text-2xs text-muted-foreground tabular-nums">{stats}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {(value || lastSeen) && (
        <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-2">
          {value ? <CurrencyAmount amount={value.amount}
            unit={value.unit}
            rune={value.rune}
            label={value.label}
            size="sm" /> : <span />}
          {lastSeen && <span className="text-2xs text-muted-foreground">{lastSeen}</span>}
        </div>
      )}
    </ItemCard>
  );
}

export { CharacterCard };
export type { CharacterCardProps };
