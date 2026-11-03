import type { Story, StoryDefault } from '@ladle/react';
import { SparkChart } from '@pd2-trader/ui';

export default { title: 'Domain / SparkChart' } satisfies StoryDefault;

const UP = [0.42, 0.44, 0.43, 0.46, 0.45, 0.48, 0.5, 0.49, 0.51];
const DOWN = [1.4, 1.38, 1.35, 1.36, 1.3, 1.22, 1.25, 1.18, 1.1];

export const Tones: Story = () => (
  <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
    <SparkChart points={UP}
      aria-label="Ber, 30 days"
      changeTitle="0.42 → 0.51 HR" />
    <SparkChart points={DOWN}
      aria-label="Harlequin Crest, 30 days" />
    <SparkChart points={UP}
      tone="muted" />
    <SparkChart points={DOWN}
      tone="primary"
      showChange={false} />
    <SparkChart points={[0, 1, 2]}
      aria-label="From zero: no change %" />
    <p className="text-2xs text-muted-foreground">Fewer than two points renders nothing:</p>
    <SparkChart points={[1]} />
  </div>
);
