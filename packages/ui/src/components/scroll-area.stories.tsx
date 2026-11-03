import type { Story, StoryDefault } from '@ladle/react';
import { ScrollArea, ScrollBar, Separator } from '@pd2-trader/ui';

export default { title: 'Primitives / ScrollArea' } satisfies StoryDefault;

const RUNES = ['El', 'Eld', 'Tir', 'Nef', 'Eth', 'Ith', 'Tal', 'Ral', 'Ort', 'Thul', 'Amn', 'Sol', 'Shael', 'Dol', 'Hel', 'Io', 'Lum', 'Ko', 'Fal', 'Lem', 'Pul', 'Um', 'Mal', 'Ist', 'Gul', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];

export const Vertical: Story = () => (
  <ScrollArea className="h-60 w-48 rounded-md border bg-surface">
    <div className="p-3 text-xs">
      {RUNES.map((rune) => (
        <div key={rune}>
          <div className="py-1 text-q-rune">{rune} Rune</div>
          <Separator />
        </div>
      ))}
    </div>
  </ScrollArea>
);

export const Horizontal: Story = () => (
  <ScrollArea className="w-sidebar rounded-md border bg-surface whitespace-nowrap">
    <div className="flex gap-2 p-3">
      {RUNES.map((rune) => (
        <span key={rune}
          className="rounded-sm border px-2 py-1 text-xs text-q-rune">
          {rune}
        </span>
      ))}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);
