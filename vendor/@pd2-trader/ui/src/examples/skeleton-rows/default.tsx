import { SkeletonRows } from '@pd2-trader/ui';

export const meta = {
  title: 'Default',
  description: 'List or table placeholder: the default 3 rows and `rows={6}`.',
  order: 0,
};

export default function LoadingExample() {
  return (
    <div className="flex w-sidebar flex-col gap-4 rounded-lg border bg-surface p-4">
      <SkeletonRows />
      <SkeletonRows rows={6} />
    </div>
  );
}
