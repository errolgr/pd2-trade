import { BreakpointTable, type Breakpoint } from '@pd2-trader/ui';

export const meta = {
  title: 'Past the last step',
  description: 'Paladin block rate with a shield, past the last reachable step: every step reached, no next.',
  order: 2,
};

const PALA_FBR: Breakpoint[] = [
  { value: 0, frames: 5 },
  { value: 13, frames: 4 },
  { value: 32, frames: 3 },
  { value: 86, frames: 2 },
];

export default function MaxedExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-4">
      <BreakpointTable kind="FBR"
        context="Paladin, shield"
        breakpoints={PALA_FBR}
        current={86} />
    </div>
  );
}
