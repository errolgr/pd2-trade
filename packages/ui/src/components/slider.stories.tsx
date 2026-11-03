import type { Story, StoryDefault } from '@ladle/react';
import { useState } from 'react';
import { Label, Slider } from '@pd2-trader/ui';

export default { title: 'Primitives / Slider' } satisfies StoryDefault;

export const States: Story = () => {
  const [value, setValue] = useState([35]);
  const [range, setRange] = useState([120, 141]);
  return (
    <div className="flex w-sidebar flex-col gap-5 rounded-lg border bg-surface p-4 text-xs">
      <div className="flex flex-col gap-2">
        <Label>Window transparency · {value[0]}%</Label>
        <Slider value={value}
          onValueChange={setValue}
          max={90}
          step={5} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>
          Defense {range[0]}–{range[1]}
        </Label>
        <Slider value={range}
          onValueChange={setRange}
          min={98}
          max={141} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Disabled</Label>
        <Slider defaultValue={[50]}
          disabled />
      </div>
    </div>
  );
};
