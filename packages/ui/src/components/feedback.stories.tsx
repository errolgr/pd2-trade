import type { Story, StoryDefault } from '@ladle/react';
import { ErrorChip, SkeletonRows } from '@pd2-trader/ui';

export default { title: 'Domain / Feedback' } satisfies StoryDefault;

export const ErrorChips: Story = () => (
  <div className="flex w-sidebar flex-col items-start gap-3 rounded-lg border bg-surface p-4">
    <ErrorChip message="Couldn't load prices"
      onRetry={() => undefined} />
    <ErrorChip message="Market offline" />
    <ErrorChip message="Couldn't load the 30-day price history for Harlequin Crest"
      onRetry={() => undefined} />
  </div>
);

export const Loading: Story = () => (
  <div className="flex w-sidebar flex-col gap-4 rounded-lg border bg-surface p-4">
    <SkeletonRows />
    <SkeletonRows rows={6} />
  </div>
);
