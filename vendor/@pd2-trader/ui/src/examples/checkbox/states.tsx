import { Checkbox, Label } from '@pd2-trader/ui';

export const meta = {
  title: 'States',
  description:
    'Unchecked, checked, disabled and invalid checkboxes, each paired with a `Label htmlFor` so the label toggles it.',
  order: 0,
};

export default function StatesExample() {
  return (
    <div className="flex w-fit flex-col gap-3 rounded-lg border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Checkbox id="cb-eth" />
        <Label htmlFor="cb-eth">Ethereal only</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-ladder"
          defaultChecked />
        <Label htmlFor="cb-ladder">Ladder</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-hc"
          disabled />
        <Label htmlFor="cb-hc">Hardcore (disabled)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-corr"
          disabled
          defaultChecked />
        <Label htmlFor="cb-corr">Corrupted (checked, disabled)</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-err"
          aria-invalid />
        <Label htmlFor="cb-err">Invalid</Label>
      </div>
    </div>
  );
}
