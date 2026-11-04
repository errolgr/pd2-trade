import { Field, NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Default',
  description:
    'The platform picker in a `Field`: option groups, the small size, disabled and invalid. Use it on the website where phones should get their native wheel; use `Select` for rich rows and in the overlay.',
  order: 0,
};

export default function NativeSelectExample() {
  const [realm, setRealm] = useState('sc-l');
  return (
    <div className="flex w-sidebar flex-col gap-4 rounded-lg border bg-surface p-4">
      <Field label="Realm"
        hint="Prices differ per realm.">
        <NativeSelect className="w-full"
          value={realm}
          onChange={(e) => setRealm(e.target.value)}>
          <NativeSelectOptGroup label="Ladder">
            <NativeSelectOption value="sc-l">Softcore Ladder</NativeSelectOption>
            <NativeSelectOption value="hc-l">Hardcore Ladder</NativeSelectOption>
          </NativeSelectOptGroup>
          <NativeSelectOptGroup label="Non-ladder">
            <NativeSelectOption value="sc">Softcore</NativeSelectOption>
            <NativeSelectOption value="hc"
              disabled>
              Hardcore (closed)
            </NativeSelectOption>
          </NativeSelectOptGroup>
        </NativeSelect>
      </Field>
      <div className="flex items-center gap-2">
        <NativeSelect size="sm"
          aria-label="Sort"
          defaultValue="price">
          <NativeSelectOption value="price">Price</NativeSelectOption>
          <NativeSelectOption value="age">Newest</NativeSelectOption>
        </NativeSelect>
        <NativeSelect size="sm"
          aria-label="Disabled"
          disabled>
          <NativeSelectOption>Disabled</NativeSelectOption>
        </NativeSelect>
      </div>
      <Field label="Currency"
        error="Pick a currency to list in.">
        <NativeSelect className="w-full"
          defaultValue="">
          <NativeSelectOption value=""
            disabled>
            Select…
          </NativeSelectOption>
          <NativeSelectOption value="hr">HR</NativeSelectOption>
          <NativeSelectOption value="gold">Gold</NativeSelectOption>
        </NativeSelect>
      </Field>
    </div>
  );
}
