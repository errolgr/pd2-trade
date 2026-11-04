import { ErrorChip } from '@pd2-trader/ui';

export const meta = {
  title: 'Default',
  description: 'Inline failure chips with and without a Retry action; long messages truncate.',
  order: 0,
};

export default function ErrorChipsExample() {
  return (
    <div className="flex w-sidebar flex-col items-start gap-3 rounded-lg border bg-surface p-4">
      <ErrorChip message="Couldn't load prices"
        onRetry={() => undefined} />
      <ErrorChip message="Market offline" />
      <ErrorChip message="Couldn't load the 30-day price history for Harlequin Crest"
        onRetry={() => undefined} />
    </div>
  );
}
