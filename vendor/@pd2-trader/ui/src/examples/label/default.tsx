import { Checkbox, Input, Label } from '@pd2-trader/ui';

export const meta = {
  title: 'Default',
  description: 'Label bound to an input and a checkbox via `htmlFor`; clicking the label focuses or toggles the control.',
  order: 0,
};

export default function DefaultExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <Label htmlFor="lb-in">Minimum price (HR)</Label>
      <Input id="lb-in"
        defaultValue="0.25" />
      <div className="flex items-center gap-2">
        <Checkbox id="lb-cb" />
        <Label htmlFor="lb-cb">Hide sold</Label>
      </div>
    </div>
  );
}
