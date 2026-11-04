import type { Story, StoryDefault } from '@ladle/react';
import { Button, toast } from '@pd2-trader/ui';

export default { title: 'Primitives / Toast' } satisfies StoryDefault;

/** The catalog provider mounts `<Toaster />`; click to fire each kind. */
export const Kinds: Story = () => (
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
