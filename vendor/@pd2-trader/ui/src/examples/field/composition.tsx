import {
  Button,
  Checkbox,
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  Input,
} from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Composed parts',
  description:
    'The shadcn parts for full control: `FieldSet` + `FieldLegend` around a `FieldGroup`, checkbox rows with `FieldContent`, a `FieldSeparator`, and `FieldError errors={[…]}` (several messages render as a list). Wire `id`/`htmlFor` yourself here.',
  order: 1,
};

export default function FieldCompositionExample() {
  const [account, setAccount] = useState('');
  const errors = account.length < 3 ? [{ message: 'At least 3 characters' }, { message: 'Use your in-game account name' }] : [];
  return (
    <div className="w-popover rounded-lg border bg-surface p-4">
      <FieldSet>
        <FieldLegend>Listing defaults</FieldLegend>
        <FieldDescription>Applied to every new listing; change them per item later.</FieldDescription>
        <FieldGroup>
          <Field data-invalid={errors.length > 0 || undefined}>
            <FieldLabel htmlFor="fc-account">Account</FieldLabel>
            <Input id="fc-account"
              value={account}
              aria-invalid={errors.length > 0 || undefined}
              aria-describedby="fc-account-error"
              onChange={(e) => setAccount(e.target.value)} />
            <FieldError id="fc-account-error"
              errors={errors} />
          </Field>
          <FieldSeparator>Visibility</FieldSeparator>
          <Field orientation="horizontal">
            <Checkbox id="fc-online"
              defaultChecked />
            <FieldContent>
              <FieldLabel htmlFor="fc-online">Only while online</FieldLabel>
              <FieldDescription>Hide listings when the overlay is closed.</FieldDescription>
            </FieldContent>
          </Field>
          <Field orientation="horizontal"
            data-disabled>
            <Checkbox id="fc-hc"
              disabled />
            <FieldLabel htmlFor="fc-hc">Mirror to Hardcore</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Button size="sm">Save defaults</Button>
            <Button size="sm"
              variant="ghost">
              Reset
            </Button>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}
