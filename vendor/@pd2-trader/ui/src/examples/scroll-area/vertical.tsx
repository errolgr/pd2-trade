import { ScrollArea, Separator } from '@pd2-trader/ui';

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
  title: 'Vertical',
  description:
    'A fixed-height list with the themed scrollbar; give the ScrollArea a height (or `viewportClassName` a max height).',
  order: 0,
};

export default function VerticalExample() {
  return (
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
}
