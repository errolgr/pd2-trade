import type { Story, StoryDefault } from '@ladle/react';
import { Label, RadioGroup, RadioGroupItem } from '@pd2-trader/ui';

export default { title: 'Primitives / RadioGroup' } satisfies StoryDefault;

const MODES = [
  { id: 'sc', label: 'Softcore' },
  { id: 'hc', label: 'Hardcore' },
  { id: 'nl', label: 'Non-ladder', disabled: true },
];

export const Modes: Story = () => (
  <div className="w-fit rounded-lg border bg-surface p-4 text-surface-foreground">
    <RadioGroup defaultValue="sc"
      aria-label="Game mode">
      {MODES.map((m) => (
        <div key={m.id}
          className="flex items-center gap-2">
          <RadioGroupItem id={`mode-${m.id}`}
            value={m.id}
            disabled={m.disabled} />
          <Label htmlFor={`mode-${m.id}`}>{m.label}</Label>
        </div>
      ))}
    </RadioGroup>
  </div>
);
