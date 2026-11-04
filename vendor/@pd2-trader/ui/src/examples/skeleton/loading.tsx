import { Skeleton } from '@pd2-trader/ui';

export const meta = {
  title: 'Loading',
  description: 'Compose Skeleton bars and tiles in the shape of the content that is loading, sized with `className`.',
  order: 0,
};

export default function LoadingExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-md" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
