import { Label, Textarea } from '@pd2-trader/ui';

export const meta = {
  title: 'States',
  description:
    'Multi-line text (trade message templates, notes): filled, placeholder, disabled and invalid. It grows with its content (`field-sizing-content`).',
  order: 0,
};

export default function StatesExample() {
  return (
    <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-4">
      <Label htmlFor="ta-1">Trade message template</Label>
      <Textarea id="ta-1"
        defaultValue="WTS {item} for {price} HR, whisper *{account}" />
      <Textarea placeholder="Notes for this listing…" />
      <Textarea disabled
        defaultValue="Disabled" />
      <Textarea aria-invalid
        defaultValue="Message too long" />
    </div>
  );
}
