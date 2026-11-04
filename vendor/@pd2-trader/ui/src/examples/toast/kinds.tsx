import { Button, toast } from '@pd2-trader/ui';

export const meta = {
  title: 'Kinds',
  description: '`toast()`, `toast.success`, `toast.error` and a toast with a description and action. The host mounts `<Toaster theme={mode} />` once.',
  order: 0,
};

export default function KindsExample() {
  return (
    <div className="flex w-fit flex-wrap gap-2 rounded-lg border bg-surface p-4">
      <Button variant="outline"
        onClick={() => toast('Trade message copied')}>
        Default
      </Button>
      <Button variant="outline"
        onClick={() => toast.success('Listed Harlequin Crest for 1.5 HR')}>
        Success
      </Button>
      <Button variant="outline"
        onClick={() => toast.error('Bump failed: cooldown active')}>
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast('Offer received', {
            description: 'HammerDin offers 1 HR + Um',
            action: { label: 'View', onClick: () => undefined },
          })
        }
      >
        With action
      </Button>
    </div>
  );
}
