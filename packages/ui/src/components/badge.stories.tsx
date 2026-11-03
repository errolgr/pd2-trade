import type { Story, StoryDefault } from '@ladle/react';
import { Badge } from '@pd2-trader/ui';

export default { title: 'Primitives / Badge' } satisfies StoryDefault;

export const Variants: Story = () => (
  <div className="flex w-fit items-center gap-2 rounded-lg border bg-surface p-4">
    <Badge>Ladder</Badge>
    <Badge variant="secondary">Softcore</Badge>
    <Badge variant="outline">Ethereal</Badge>
    <Badge variant="destructive">Corrupted</Badge>
  </div>
);

export const InContext: Story = () => (
  <div className="flex w-sidebar flex-col gap-2 rounded-lg border bg-surface p-4 text-sm">
    <div className="flex items-center justify-between">
      <span className="text-q-unique">Harlequin Crest</span>
      <Badge variant="outline">3 os</Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-q-set">Tal Rasha&apos;s Guardianship</span>
      <Badge variant="secondary">Set</Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-q-rare">Grim Shell</span>
      <Badge variant="destructive">Corrupted</Badge>
    </div>
  </div>
);
