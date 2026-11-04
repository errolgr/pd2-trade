import * as React from 'react';

import { cn } from '../lib/utils';
import { Badge } from './badge';
import { Button } from './button';
import { Separator } from './separator';
import { PopoverSectionTitle } from './popover-parts';
import { DataRow } from './rows';

/*
 * Slot components: the only building blocks a plugin slot renders (plugin runtime contract). Props are plain
 * data so the host can validate and serialise them; tones map to theme tokens.
 */

export const SLOT_TONES = [
  'default',
  'muted',
  'success',
  'warning',
  'danger',
  'q-unique',
  'q-set',
  'q-rare',
  'q-magic',
  'q-crafted',
  'q-rune',
] as const;

export type SlotTone = (typeof SLOT_TONES)[number];

export function isSlotTone(value: unknown): value is SlotTone {
  return typeof value === 'string' && (SLOT_TONES as readonly string[]).includes(value);
}

const TONE_CLASS: Record<SlotTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  'q-unique': 'text-q-unique',
  'q-set': 'text-q-set',
  'q-rare': 'text-q-rare',
  'q-magic': 'text-q-magic',
  'q-crafted': 'text-q-crafted',
  'q-rune': 'text-q-rune',
};

/** Text colour class for a tone; unknown values (untrusted plugin input) fall back to `default`. */
export function slotToneClass(tone: unknown): string {
  return TONE_CLASS[isSlotTone(tone) ? tone : 'default'];
}

const TONE_BADGE: Record<SlotTone, string> = {
  default: 'border-border bg-secondary text-secondary-foreground',
  muted: 'border-border bg-muted text-muted-foreground',
  success: 'border-success/35 bg-success/15 text-success',
  warning: 'border-warning/35 bg-warning/15 text-warning',
  danger: 'border-destructive/35 bg-destructive/15 text-destructive',
  'q-unique': 'border-q-unique/35 bg-q-unique/10 text-q-unique',
  'q-set': 'border-q-set/35 bg-q-set/10 text-q-set',
  'q-rare': 'border-q-rare/35 bg-q-rare/10 text-q-rare',
  'q-magic': 'border-q-magic/35 bg-q-magic/10 text-q-magic',
  'q-crafted': 'border-q-crafted/35 bg-q-crafted/10 text-q-crafted',
  'q-rune': 'border-q-rune/35 bg-q-rune/10 text-q-rune',
};

/** Titled card of slot content (a plugin's section in the price-check popover). */
function SlotSection({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      data-slot="slot-section"
      className={cn('flex flex-col rounded-md border border-border bg-card/60 p-2', className)}
    >
      <PopoverSectionTitle className="mb-1">{title}</PopoverSectionTitle>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

/** Label / value row; `tone` colours the value. */
function SlotRow({ label, value, tone }: { label: React.ReactNode; value: React.ReactNode; tone?: SlotTone }) {
  return <DataRow label={label}
    value={value}
    valueClassName={cn('font-medium', slotToneClass(tone))} />;
}

/** Short status pill ("Underpriced", "Perfect roll"). */
function SlotBadge({ text, tone }: { text: string; tone?: SlotTone }) {
  return (
    <Badge
      variant="outline"
      data-slot="slot-badge"
      className={cn('rounded-sm px-1.5 py-0 text-2xs', TONE_BADGE[isSlotTone(tone) ? tone : 'default'])}
    >
      {text}
    </Badge>
  );
}

/** A line of text: `md` body (default) or `sm` caption. */
function SlotText({ text, tone, size = 'md' }: { text: string; tone?: SlotTone; size?: 'sm' | 'md' }) {
  return (
    <p data-slot="slot-text"
      className={cn(size === 'md' ? 'text-xs' : 'text-2xs', slotToneClass(tone))}>
      {text}
    </p>
  );
}

/** Stacks slot content vertically. */
function SlotColumn({ children }: { children: React.ReactNode }) {
  return (
    <div data-slot="slot-column"
      className="flex flex-col gap-2">
      {children}
    </div>
  );
}

/** Bulleted list of short items. */
function SlotList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul data-slot="slot-list"
      className="flex list-disc flex-col gap-0.5 pl-4 text-xs marker:text-muted-foreground">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function SlotDivider() {
  return <Separator data-slot="slot-divider"
    className="my-1" />;
}

/** The slot's one action button. */
function SlotAction({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="outline"
      size="xs"
      data-slot="slot-action"
      className="self-start"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export { SlotSection, SlotRow, SlotBadge, SlotText, SlotColumn, SlotList, SlotDivider, SlotAction };
