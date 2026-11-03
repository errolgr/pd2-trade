import type { Story, StoryDefault } from '@ladle/react';
import { ArrowUp } from 'lucide-react';
import { Kbd, KbdGroup } from '@pd2-trader/ui';

export default { title: 'Primitives / Kbd' } satisfies StoryDefault;

export const Keycaps: Story = () => (
  <div className="flex w-fit flex-col gap-3 rounded-lg border bg-surface p-4 text-xs text-surface-foreground">
    <p className="flex items-center gap-2">
      Price check
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>D</Kbd>
      </KbdGroup>
    </p>
    <p className="flex items-center gap-2">
      Open market
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>M</Kbd>
      </KbdGroup>
    </p>
    <p className="flex items-center gap-2">
      Command palette
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>
          <ArrowUp />
        </Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </p>
    <p className="flex items-center gap-2">
      Close
      <Kbd>Esc</Kbd>
    </p>
  </div>
);
