import { BreakpointTable, type Breakpoint } from '@pd2-trader/ui';

export const meta = {
  title: 'Sorceress FCR and FHR',
  description: 'The steps a Sorceress reaches at 105% FCR (max for most gear) and 48% FHR, with what the next step needs.',
  order: 1,
};

const SORC_FCR: Breakpoint[] = [
  { value: 0, frames: 13 },
  { value: 9, frames: 12 },
  { value: 20, frames: 11 },
  { value: 37, frames: 10 },
  { value: 63, frames: 9 },
  { value: 105, frames: 8 },
  { value: 200, frames: 7 },
];
const SORC_FHR: Breakpoint[] = [
  { value: 0, frames: 15 },
  { value: 5, frames: 14 },
  { value: 9, frames: 13 },
  { value: 14, frames: 12 },
  { value: 20, frames: 11 },
  { value: 30, frames: 10 },
  { value: 42, frames: 9 },
  { value: 60, frames: 8 },
  { value: 86, frames: 7 },
  { value: 142, frames: 6 },
  { value: 280, frames: 5 },
];

export default function SorceressExample() {
  return (
    <div className="flex w-popover flex-col gap-4 rounded-lg border bg-surface p-4">
      <BreakpointTable kind="FCR"
        context="Sorceress"
        breakpoints={SORC_FCR}
        current={105} />
      <BreakpointTable kind="FHR"
        context="Sorceress"
        breakpoints={SORC_FHR}
        current={48} />
    </div>
  );
}
