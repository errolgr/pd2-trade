import { NumberInput } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Stepper',
  description:
    'Integer stepper: type freely (an in-range value applies at once, out-of-range text is flagged until Enter/blur clamps it), ↑/↓ or −/+ step by `step`, Shift by `bigStep`. `unit`, `prefix`, `emphasize` and the two sizes.',
  order: 0,
};

export default function NumberInputExample() {
  const [strength, setStrength] = useState(0);
  const [level, setLevel] = useState(85);
  const [fcr, setFcr] = useState(105);
  const [sockets, setSockets] = useState(4);
  return (
    <div className="flex w-fit flex-col items-start gap-4 rounded-lg border bg-surface p-4 text-xs">
      <div className="flex items-center gap-3">
        <span className="w-20 text-muted-foreground">Strength</span>
        <NumberInput label="Strength"
          value={strength}
          onChange={setStrength}
          max={500}
          bigStep={10}
          emphasize />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 text-muted-foreground">Character</span>
        <NumberInput label="Character level"
          prefix="Level"
          value={level}
          onChange={setLevel}
          min={1}
          max={99} />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 text-muted-foreground">Cast rate</span>
        <NumberInput label="Faster cast rate, percent"
          unit="%"
          value={fcr}
          onChange={setFcr}
          max={200}
          bigStep={20} />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 text-muted-foreground">Sockets</span>
        <NumberInput label="Sockets"
          size="sm"
          value={sockets}
          onChange={setSockets}
          max={6} />
        <NumberInput label="Sockets (disabled)"
          size="sm"
          value={2}
          onChange={() => undefined}
          disabled />
      </div>
    </div>
  );
}
