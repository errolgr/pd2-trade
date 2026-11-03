import React from 'react';
import { cn } from '@/lib/utils';
import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { itemCorruptions } from '@/lib/item-utils';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { ModMenu } from './ModMenu';

/** Name colour: rune colour for runes/runewords, else the quality colour. */
export const itemNameColor = (item: Pick<ItemDetail, 'is_runeword' | 'name' | 'quality'>) =>
  item.is_runeword || / Rune$/.test(item.name) ? 'text-q-rune' : qualityColor(item.quality?.name ?? '');

/** Mods in game order (highest priority first), without the bare "Corrupted" marker mod. */
export function displayMods(item: Pick<ItemDetail, 'modifiers'>): Modifier[] {
  return (item.modifiers ?? []).filter((m) => m.name !== 'corrupted').sort((a, b) => b.priority - a.priority);
}

const isCorruptedMod = (item: ItemDetail, mod: Modifier) =>
  mod.corrupted === true || itemCorruptions(item).includes(mod.name);

/** A mod line; on the market page it opens the filter/sort menu (ModMenu). */
function ModLine({ item, mod }: { item: ItemDetail; mod: Modifier }) {
  const range = mod.min != null && mod.max != null && mod.min !== mod.max;
  return (
    <ModMenu
      mod={mod}
      item={item}
      className={cn('rounded-sm text-q-magic', isCorruptedMod(item, mod) && 'text-q-corrupted')}
    >
      {mod.label}
      {range && (
        <span className="ml-1 text-[11px] text-muted-foreground tabular-nums">{`[${mod.min} - ${mod.max}]`}</span>
      )}
    </ModMenu>
  );
}

/**
 * In-game style item tooltip: name, base, defense, requirements, every mod with its roll range, sockets.
 * `compact` (result cards, whose header already names the item): no name/base, tighter and smaller.
 */
export function ItemTooltip({
  item,
  className,
  compact = false,
}: {
  item: ItemDetail;
  className?: string;
  compact?: boolean;
}) {
  const mods = displayMods(item);
  const req = item.requirements;
  const socketed = item.socketed ?? [];
  const showBase = item.base?.name && item.base.name !== item.name;
  return (
    <div
      className={cn(
        'rounded-md border border-border/70 bg-background/90 text-center shadow-inner',
        compact ? 'px-2 py-1.5 text-[11px] leading-[1.4]' : 'px-3 py-2.5 text-xs leading-[1.45]',
        className,
      )}
    >
      {!compact && (
        <>
          <div className={cn('text-sm font-semibold', itemNameColor(item))}
            style={{ fontFamily: 'DiabloFont' }}>
            {item.name}
          </div>
          {showBase && <div className={cn(itemNameColor(item), 'opacity-90')}>{item.base.name}</div>}
        </>
      )}
      {!item.is_identified && <div className="text-destructive">Unidentified</div>}

      <div className={cn('text-foreground/90', !compact && 'mt-1')}>
        {item.defense?.total != null && item.defense.total > 0 && (
          <div>
            Defense:{' '}
            <span className={cn(item.defense.total > item.defense.base ? 'text-q-magic' : 'text-foreground')}>
              {item.defense.total}
            </span>
          </div>
        )}
        {item.durability && item.durability.maximum > 0 && (
          <div>{`Durability: ${item.durability.current} of ${item.durability.maximum}`}</div>
        )}
        {req?.dexterity > 0 && <div>{`Required Dexterity: ${req.dexterity}`}</div>}
        {req?.strength > 0 && <div>{`Required Strength: ${req.strength}`}</div>}
        {req?.level > 0 && <div>{`Required Level: ${req.level}`}</div>}
        {item.item_level > 0 && <div className="text-muted-foreground">{`Item Level: ${item.item_level}`}</div>}
      </div>

      {mods.length > 0 && (
        <div className="mt-1.5">
          {mods.map((mod, i) => (
            <ModLine key={`${mod.name}-${i}`}
              item={item}
              mod={mod} />
          ))}
        </div>
      )}

      {(item.is_ethereal || item.socket_count > 0) && (
        <div className="mt-1 text-q-magic">
          {[
            item.is_ethereal && 'Ethereal (Cannot be Repaired)',
            item.socket_count > 0 && `Socketed (${item.socket_count})`,
          ]
            .filter(Boolean)
            .join(', ')}
        </div>
      )}
      {item.corrupted && <div className="mt-0.5 font-semibold text-q-corrupted">Corrupted</div>}
      {item.desecrated && <div className="mt-0.5 font-semibold text-q-corrupted">Desecrated</div>}

      {socketed.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2 text-left">
          {socketed.map((s, i) => (
            <div key={`${s.name}-${i}`}>
              <div className={cn('font-medium', itemNameColor(s))}>{s.name}</div>
              {displayMods(s).map((mod, j) => (
                <ModMenu
                  key={`${mod.name}-${j}`}
                  mod={mod}
                  item={item}
                  socketLine
                  className="rounded-sm pl-2 text-[11px] text-muted-foreground"
                >
                  {mod.label}
                </ModMenu>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
