import type { Story, StoryDefault } from '@ladle/react';
import { RuneIcon } from '@pd2-trader/ui';

export default { title: 'Domain / RuneIcon' } satisfies StoryDefault;

const RUNES = ['El', 'Tal', 'Shael', 'Ist', 'Vex', 'Ohm', 'Lo', 'Sur', 'Ber', 'Jah', 'Cham', 'Zod'];

/** Art is served from the overlay's public/runes (the catalog shares that public dir). */
export const Runes: Story = () => (
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
        className="size-6" /> Missing art → initial tile
      <RuneIcon rune="Ber"
        src="/missing.png"
        className="size-4" />
    </div>
  </div>
);
