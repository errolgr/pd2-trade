import { Toggle } from '@pd2-trader/ui';

import { Bold, Star } from 'lucide-react';

export const meta = {
  title: 'Variants',
  description:
    'Icon toggles, `outline` toggles in three sizes, and `chip` filter chips (pressed = primary tint).',
  order: 0,
};

export default function VariantsExample() {
  return (
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
}
