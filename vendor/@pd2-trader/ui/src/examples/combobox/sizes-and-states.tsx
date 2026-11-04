import { Combobox, type ComboboxOption, itemQualityClass } from '@pd2-trader/ui';
import { useState } from 'react';

const ITEMS: ComboboxOption[] = [
  { value: 'shako', label: 'Harlequin Crest', keywords: 'shako', className: itemQualityClass('unique') },
  { value: 'griffon', label: "Griffon's Eye", keywords: 'diadem', className: itemQualityClass('unique') },
  { value: 'tal-armor', label: "Tal Rasha's Guardianship", keywords: 'tal armor', className: itemQualityClass('set') },
  { value: 'enigma', label: 'Enigma', keywords: 'jah ith ber', className: itemQualityClass('runeword') },
  { value: 'cta', label: 'Call to Arms', keywords: 'cta amn ral mal ist ohm', className: itemQualityClass('runeword'), disabled: true },
];

export const meta = {
  title: 'Sizes and states',
  description:
    '`size="sm"` for dense rows, option `className` for quality colors (rows and closed field), a `disabled` option, a custom `emptyText`, and a disabled combobox.',
  order: 2,
};

export default function ComboboxSizesExample() {
  const [item, setItem] = useState<string | null>('shako');
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <Combobox size="sm"
        aria-label="Item"
        placeholder="Search items…"
        emptyText="No item by that name"
        options={ITEMS}
        value={item}
        onChange={setItem} />
      <Combobox aria-label="Disabled item"
        options={ITEMS}
        value={null}
        onChange={() => undefined}
        disabled />
    </div>
  );
}
