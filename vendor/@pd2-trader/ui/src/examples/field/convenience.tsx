import { Field, Input, NumberInput, Switch, Textarea } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Label, hint and error',
  description:
    'Pass `label`, `hint`, `error` and `optional` with one control child: the label points at the control and the hint/error ids land in its `aria-describedby` (and `aria-invalid`). `orientation="horizontal"` puts the label beside the control.',
  order: 0,
};

export default function FieldConvenienceExample() {
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState(1);
  const [bump, setBump] = useState(true);
  return (
    <div className="flex w-popover flex-col gap-4 rounded-lg border bg-surface p-4">
      <Field label="Price (HR)"
        hint="Buyers see the price rounded to 0.05 HR."
        error={price !== '' && Number.isNaN(Number(price)) ? 'Enter a number, e.g. 2.5' : undefined}>
        <Input value={price}
          placeholder="2.5"
          onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label="Note"
        optional>
        <Textarea placeholder="Trades in Hell cows only" />
      </Field>
      <Field label="Quantity"
        orientation="horizontal">
        <NumberInput label="Quantity"
          value={qty}
          onChange={setQty}
          min={1}
          max={40} />
      </Field>
      <Field label="Auto-bump"
        orientation="horizontal"
        hint="Re-lists every 4 hours while the overlay runs.">
        <Switch checked={bump}
          onCheckedChange={setBump} />
      </Field>
    </div>
  );
}
