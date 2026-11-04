import { ScrollArea, ScrollBar } from '@pd2-trader/ui';

const RUNES = [
  'El',
  'Eld',
  'Tir',
  'Nef',
  'Eth',
  'Ith',
  'Tal',
  'Ral',
  'Ort',
  'Thul',
  'Amn',
  'Sol',
  'Shael',
  'Dol',
  'Hel',
  'Io',
  'Lum',
  'Ko',
  'Fal',
  'Lem',
  'Pul',
  'Um',
  'Mal',
  'Ist',
  'Gul',
  'Vex',
  'Ohm',
  'Lo',
  'Sur',
  'Ber',
  'Jah',
  'Cham',
  'Zod',
];

export const meta = {
  title: 'Horizontal',
  description:
    'A one-line strip that scrolls sideways; add `<ScrollBar orientation="horizontal" />` for the horizontal bar.',
  order: 1,
};

export default function HorizontalExample() {
  return (
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
}
