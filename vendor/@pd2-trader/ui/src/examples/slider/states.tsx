import { Label, Slider } from '@pd2-trader/ui';

import { useState } from 'react';

export const meta = {
  title: 'States',
  description:
    'A single-value slider, a two-thumb range (`value={[from, to]}`, thumbs named via `thumbProps`) and a disabled one.',
  order: 0,
};

export default function StatesExample() {
  const [value, setValue] = useState([35]);
  const [range, setRange] = useState([120, 141]);
  return (
    <div className="flex w-sidebar flex-col gap-5 rounded-lg border bg-surface p-4 text-xs">
      <div className="flex flex-col gap-2">
        <Label>Window transparency · {value[0]}%</Label>
        <Slider value={value}
          onValueChange={setValue}
          max={90}
          step={5}
          thumbProps={{ 'aria-label': 'Window transparency' }} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>
          Defense {range[0]}–{range[1]}
        </Label>
        <Slider value={range}
          onValueChange={setRange}
          min={98}
          max={141}
          thumbProps={(i) => ({ 'aria-label': i ? 'Maximum defense' : 'Minimum defense' })} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Disabled</Label>
        <Slider defaultValue={[50]}
          disabled
          thumbProps={{ 'aria-label': 'Disabled' }} />
      </div>
    </div>
  );
}
