import type { Story, StoryDefault } from '@ladle/react';
import { Bold, Star } from 'lucide-react';
import { Toggle } from '@pd2-trader/ui';

export default { title: 'Primitives / Toggle' } satisfies StoryDefault;

export const Variants: Story = () => (
  <div className="flex w-fit flex-col gap-4 rounded-lg border bg-surface p-4">
    <div className="flex items-center gap-2">
      <Toggle aria-label="Favorite">
        <Star />
      </Toggle>
      <Toggle aria-label="Favorite (pressed)"
        defaultPressed>
        <Star />
      </Toggle>
      <Toggle variant="outline"
        aria-label="Bold">
        <Bold />
      </Toggle>
      <Toggle variant="outline"
        size="sm"
        defaultPressed>
        Ethereal
      </Toggle>
      <Toggle variant="outline"
        size="lg"
        disabled>
        Disabled
      </Toggle>
    </div>
    <div className="flex items-center gap-2">
      <Toggle variant="chip">Uniques</Toggle>
      <Toggle variant="chip"
        defaultPressed>
        Sets
      </Toggle>
      <Toggle variant="chip">Runewords</Toggle>
      <Toggle variant="chip"
        disabled>
        Crafted
      </Toggle>
    </div>
  </div>
);
