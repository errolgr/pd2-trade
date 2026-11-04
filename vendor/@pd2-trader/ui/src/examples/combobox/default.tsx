import { Combobox, type ComboboxOption, Field, RuneIcon } from '@pd2-trader/ui';
import { useState } from 'react';

const RUNES: ComboboxOption[] = (
  [
    ['El', 1], ['Tal', 7], ['Ral', 8], ['Ort', 9], ['Shael', 13], ['Pul', 21], ['Um', 22], ['Mal', 23], ['Ist', 24],
    ['Gul', 25], ['Vex', 26], ['Ohm', 27], ['Lo', 28], ['Sur', 29], ['Ber', 30], ['Jah', 31], ['Cham', 32], ['Zod', 33],
  ] as const
).map(([rune, n]) => ({
  value: rune,
  label: `${rune} Rune`,
  hint: `#${n}`,
  keywords: `${n} ${n >= 25 ? 'high rune hr' : 'low rune'}`,
  className: 'text-q-rune',
}));

export const meta = {
  title: 'Searchable picker',
  description:
    'The input is the field: typing filters on label, hint and keywords ("hr" finds high runes), matches are highlighted, ↑/↓ and Enter pick, Escape reverts. `renderIcon` draws art in rows and in the closed field; `clearable` adds ×.',
  order: 0,
};

export default function ComboboxDefaultExample() {
  const [rune, setRune] = useState<string | null>('Ber');
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <Field label="Rune"
        hint="Try “hr” or “30”.">
        <Combobox options={RUNES}
          value={rune}
          onChange={setRune}
          clearable
          renderIcon={(o, px) => <RuneIcon rune={String(o.value)}
            className={px > 20 ? 'size-6' : 'size-5'} />} />
      </Field>
    </div>
  );
}
