import * as React from 'react';

import { cn } from '../../lib/utils';
import { itemQualityClass, type ItemQuality } from '../item-name';
import { StatLine } from '../rows';
import { useD2Labels } from './labels';
import { qualityKey } from './quality-badge';
import { SocketRow, type SocketFill } from './socket-row';

export interface TooltipMod {
  /** The line as the game prints it ("+165% Enhanced Defense"). */
  text: string;
  /** Rolled value inside `text`; marked when the mod rolls. */
  value?: number | null;
  /** Roll range when the mod rolls (min ≠ max). */
  range?: readonly [number, number] | null;
  /** Added by corruption. */
  corrupted?: boolean;
  /** A key stat for this item (a guide's matcher): drawn semibold. */
  highlight?: boolean;
}

export interface TooltipSetBonus {
  /** Pieces needed, or `full` for the full-set bonus. */
  items: number | 'full';
  text: string;
  /** Lit when the bonus is active; `null` when unknown (drawn as active). */
  active?: boolean | null;
}

export interface TooltipSet {
  name?: string | null;
  bonuses: readonly TooltipSetBonus[];
  /** Set pieces with whether each is worn. */
  pieces?: readonly { name: string; worn?: boolean | null }[];
}

export interface TooltipDamage {
  kind: 'one-hand' | 'two-hand' | 'throw';
  min: number;
  max: number;
  /** Enhanced damage on the item: the line reads in the magic color, like the game. */
  enhanced?: boolean;
}

/**
 * Normalized item of `ItemTooltip`; adapters map each API onto it (website `itemTooltipModel.js` uses the same
 * field names). Only `name` and `quality` are required.
 */
export interface TooltipItem {
  name: string;
  /** Base type under the name; skipped when it repeats the name. */
  base?: string | null;
  quality: ItemQuality | (string & {}) | null;
  runeword?: boolean;
  /** `enhanced`: higher than the base (magic color). */
  defense?: { value: number; enhanced?: boolean } | null;
  damage?: readonly TooltipDamage[];
  requirements?: { level?: number | null; strength?: number | null; dexterity?: number | null };
  /** [current, maximum]. */
  durability?: readonly [number, number] | null;
  mods?: readonly TooltipMod[];
  sockets?: number;
  socketed?: readonly SocketFill[];
  /** Runeword runes in socket order ("Jah", "Ith", "Ber"). */
  runes?: readonly string[];
  ethereal?: boolean;
  corrupted?: boolean;
  unidentified?: boolean;
  set?: TooltipSet | null;
  itemLevel?: number | null;
}

interface ItemTooltipProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  item: TooltipItem;
  /** Below a hairline at the bottom: market price, actions. */
  footer?: React.ReactNode;
  /** Result cards whose header already names the item: no name/base, smaller text. */
  compact?: boolean;
  /** Item name in the DiabloFont face, like the game. Default true. */
  diabloFont?: boolean;
  /** Wraps each mod line (filter/sort menus on the market); default renders the line as is. */
  renderMod?: (line: React.ReactNode, mod: TooltipMod, index: number) => React.ReactNode;
}

/**
 * The in-game item stat block: quality-colored name and base, runes, defense / damage, durability and
 * requirements, every mod with its roll range (rolled value marked), sockets, ethereal, corrupted, set bonuses.
 * Hosts float it with `HoverCard` (`HoverCardContent variant="bare"`).
 */
function ItemTooltip({
  item,
  footer,
  compact = false,
  diabloFont = true,
  renderMod,
  className,
  ...props
}: ItemTooltipProps) {
  const l = useD2Labels();
  const key = qualityKey(item.quality, { runeword: item.runeword, name: item.name });
  const nameClass = itemQualityClass(key);
  const fmt = (n: number) => n.toLocaleString();
  const req = item.requirements ?? {};
  const mods = (item.mods ?? []).filter((m) => !/^corrupted$/i.test(m.text));
  const showBase = item.base && item.base !== item.name;
  const sockets = item.sockets ?? 0;
  const damageLabel = { 'one-hand': l.oneHandDamage, 'two-hand': l.twoHandDamage, throw: l.throwDamage } as const;

  return (
    <div
      data-slot="item-tooltip"
      data-quality={key}
      className={cn(
        'rounded-md border border-border bg-popover/95 text-center text-popover-foreground shadow-panel',
        compact ? 'px-2 py-1.5 text-2xs leading-snug' : 'w-72 max-w-full px-3 py-2.5 text-xs leading-normal',
        className,
      )}
      {...props}
    >
      {!compact && (
        <>
          <div className={cn('text-sm font-semibold', nameClass)}
            style={diabloFont ? { fontFamily: 'DiabloFont' } : undefined}>
            {item.name}
          </div>
          {showBase && <div className={cn(key === 'runeword' ? 'text-muted-foreground' : nameClass)}>{item.base}</div>}
        </>
      )}
      {item.runes && item.runes.length > 0 && (
        <div className="text-2xs text-q-rune">{`'${item.runes.map((r) => r.replace(/ Rune$/, '')).join('')}'`}</div>
      )}
      {item.unidentified && <div className="text-destructive">{l.unidentified}</div>}

      <div className={cn('text-foreground', !compact && 'mt-1')}>
        {item.defense && (
          <div>
            {l.defense}:{' '}
            <span className={cn('tabular-nums', item.defense.enhanced && 'text-q-magic')}>{fmt(item.defense.value)}</span>
          </div>
        )}
        {item.damage?.map((d) => (
          <div key={d.kind}>
            {damageLabel[d.kind]}:{' '}
            <span className={cn('tabular-nums', d.enhanced && 'text-q-magic')}>{`${fmt(d.min)} to ${fmt(d.max)}`}</span>
          </div>
        ))}
        {item.durability && item.durability[1] > 0 && (
          <div>{l.durability(fmt(item.durability[0]), fmt(item.durability[1]))}</div>
        )}
        {req.dexterity ? <div>{l.requiredDexterity(fmt(req.dexterity))}</div> : null}
        {req.strength ? <div>{l.requiredStrength(fmt(req.strength))}</div> : null}
        {req.level ? <div>{l.requiredLevel(fmt(req.level))}</div> : null}
        {item.itemLevel ? <div className="text-muted-foreground">{l.itemLevel(fmt(item.itemLevel))}</div> : null}
      </div>

      {mods.length > 0 && (
        <div className={cn(!compact && 'mt-1.5')}>
          {mods.map((mod, i) => {
            const line = (
              <StatLine
                range={mod.range ?? undefined}
                value={mod.value ?? undefined}
                corrupted={mod.corrupted}
                className={cn(mod.highlight && 'font-semibold')}
              >
                {mod.text}
              </StatLine>
            );
            return <React.Fragment key={i}>{renderMod ? renderMod(line, mod, i) : line}</React.Fragment>;
          })}
        </div>
      )}

      {(item.ethereal || sockets > 0) && (
        <div className="mt-1 text-q-magic">
          {[item.ethereal && l.ethereal, sockets > 0 && l.socketed(String(sockets))].filter(Boolean).join(', ')}
        </div>
      )}
      {sockets > 0 && (item.socketed?.length ?? 0) > 0 && (
        <SocketRow sockets={sockets}
          filled={item.socketed}
          size={compact ? 16 : 20}
          className="mt-1 justify-center" />
      )}
      {item.corrupted && <div className="mt-0.5 font-semibold text-q-corrupted">{l.corrupted}</div>}

      {item.set && item.set.bonuses.length > 0 && (
        <div data-slot="item-tooltip-set"
          className="mt-2 border-t border-border/60 pt-1.5">
          {item.set.name && <div className="font-medium text-q-set">{item.set.name}</div>}
          {item.set.bonuses.map((b, i) => (
            <div key={i}
              data-active={b.active !== false || undefined}
              className={b.active === false ? 'text-muted-foreground' : 'text-q-set'}>
              {b.text}{' '}
              <span className="text-2xs opacity-75">{b.items === 'full' ? '' : l.setPieces(String(b.items))}</span>
            </div>
          ))}
          {item.set.pieces && item.set.pieces.length > 0 && (
            <div className="mt-1 space-y-px text-2xs">
              {item.set.pieces.map((p) => (
                <div key={p.name}
                  className={p.worn ? 'text-q-set' : 'text-muted-foreground'}>
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {footer && <div className="mt-2 border-t border-border/60 pt-1.5 text-2xs">{footer}</div>}
    </div>
  );
}

export { ItemTooltip };
export type { ItemTooltipProps };
