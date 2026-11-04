import { RuneIcon } from '@pd2-trader/ui';

export const meta = {
  title: 'Runes and sizes',
  description: 'Rune art by name (with or without " Rune"), sized with `size-*`; a missing image collapses to the initial tile.',
  order: 1,
};

const RUNES = ['El', 'Tal', 'Shael', 'Ist', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];

export default function RunesExample() {
  return (
    <div className="flex w-popover flex-col gap-4 rounded-lg border bg-surface p-4 text-xs">
      <div className="flex flex-wrap gap-3">
        {RUNES.map((rune) => (
          <span key={rune}
            className="flex items-center gap-1 text-q-rune">
            <RuneIcon rune={`${rune} Rune`} /> {rune}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-3">
        <RuneIcon rune="Ber"
          className="size-4" />
        <RuneIcon rune="Ber"
          className="size-6" />
        <RuneIcon rune="Ber"
          className="size-8" />
        <RuneIcon rune="Ber"
          className="size-12" />
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <RuneIcon rune="Ber"
          src="/missing.png"
          className="size-6" /> Missing art: initial tile
      </div>
    </div>
  );
}
