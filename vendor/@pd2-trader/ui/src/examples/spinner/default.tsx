import { Button, Spinner } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'In-button and inline',
  description: 'Spinner marks an action that is in flight: inside a button while it is pending, or next to a short inline status. Content areas use Skeleton instead.',
  order: 0,
};

export default function SpinnerExample() {
  const [pending, setPending] = useState(false);
  return (
    <div className="flex w-fit flex-col gap-3 rounded-lg border bg-surface p-4 text-xs">
      <Button size="sm"
        disabled={pending}
        onClick={() => {
          setPending(true);
          window.setTimeout(() => setPending(false), 1500);
        }}>
        {pending && <Spinner size="sm" />}
        {pending ? 'Listing…' : 'List Ber rune'}
      </Button>
      <p className="flex items-center gap-1.5 text-muted-foreground">
        <Spinner size="xs" /> Syncing stash…
      </p>
      <p className="flex items-center gap-2">
        <Spinner size="xs" />
        <Spinner size="sm" />
        <Spinner />
      </p>
    </div>
  );
}
