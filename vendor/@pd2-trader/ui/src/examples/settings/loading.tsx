import { SettingsSkeleton } from '@pd2-trader/ui';

export const meta = {
  title: 'Loading',
  description:
    'SettingsSkeleton stands in for a group of rows while settings load.',
  order: 2,
};

export default function LoadingExample() {
  return (
    <div className="w-popover rounded-lg border bg-surface p-4">
      <SettingsSkeleton rows={4} />
    </div>
  );
}
