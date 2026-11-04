import React from 'react';
import { cn, itemQualityClass, ItemTooltip as D2ItemTooltip, type TooltipItem } from '@pd2-trader/ui';
import type { ItemDetail, Modifier } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { itemCorruptions } from '@/lib/item-utils';
import { ModMenu } from './ModMenu';

/** Name colour of a listed item (DS quality colour; runes and runewords in the rune colour). */
export const itemNameColor = (item: Pick<ItemDetail, 'is_runeword' | 'name' | 'quality'>) =>
  itemQualityClass(item.quality?.name, { runeword: item.is_runeword, name: item.name });

/** Mods in game order (highest priority first), without the bare "Corrupted" marker mod. */
export function displayMods(item: Pick<ItemDetail, 'modifiers'>): Modifier[] {
  return (item.modifiers ?? []).filter((m) => m.name !== 'corrupted').sort((a, b) => b.priority - a.priority);
}

const isCorruptedMod = (item: ItemDetail, mod: Modifier) =>
  mod.corrupted === true || itemCorruptions(item).includes(mod.name);

/** The tooltip's mod lines: `displayMods` minus lines the DS tooltip drops (a bare "Corrupted" label). */
const tooltipMods = (item: ItemDetail) => displayMods(item).filter((m) => !/^corrupted$/i.test(m.label));

/** A listed item in the DS tooltip's shape (mods in `displayMods` order, sockets as their fills). */
export function toTooltipItem(item: ItemDetail): TooltipItem {
  const req = item.requirements;
  return {
    name: item.name,
    base: item.base?.name,
    quality: item.quality?.name ?? null,
    runeword: item.is_runeword,
    unidentified: !item.is_identified,
    defense:
      item.defense?.total != null && item.defense.total > 0
        ? { value: item.defense.total, enhanced: item.defense.total > item.defense.base }
        : null,
    durability: item.durability ? [item.durability.current, item.durability.maximum] : null,
    requirements: { level: req?.level, strength: req?.strength, dexterity: req?.dexterity },
    itemLevel: item.item_level,
    mods: tooltipMods(item).map((mod) => ({
      text: mod.label,
      range: mod.min != null && mod.max != null ? [mod.min, mod.max] : null,
      corrupted: isCorruptedMod(item, mod),
    })),
    sockets: item.socket_count,
    socketed: (item.socketed ?? []).map((s) => ({ name: s.name, quality: s.quality?.name })),
    ethereal: item.is_ethereal,
    corrupted: item.corrupted,
  };
}

/**
 * In-game style item tooltip (DS `ItemTooltip`) for a listed item: every mod line opens the filter/sort menu
 * (ModMenu); the footer adds Desecrated and each socketed item with its own mods.
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
  const mods = tooltipMods(item);
  const socketed = item.socketed ?? [];
  const footer =
    item.desecrated || socketed.length > 0 ? (
      <>
        {item.desecrated && <div className="text-xs font-semibold text-q-corrupted">Desecrated</div>}
        {socketed.length > 0 && (
          <div className="space-y-1.5 text-left">
            {socketed.map((s, i) => (
              <div key={`${s.name}-${i}`}>
                <div className={cn('font-medium', itemNameColor(s))}>{s.name}</div>
                {displayMods(s).map((mod, j) => (
                  <ModMenu
                    key={`${mod.name}-${j}`}
                    mod={mod}
                    item={item}
                    socketLine
                    className="rounded-sm pl-2 text-2xs text-muted-foreground"
                  >
                    {mod.label}
                  </ModMenu>
                ))}
              </div>
            ))}
          </div>
        )}
      </>
    ) : undefined;
  return (
    <D2ItemTooltip
      item={toTooltipItem(item)}
      compact={compact}
      footer={footer}
      renderMod={(line, _mod, i) => (
        <ModMenu mod={mods[i]}
          item={item}
          className="rounded-sm">
          {line}
        </ModMenu>
      )}
      className={className}
    />
  );
}
