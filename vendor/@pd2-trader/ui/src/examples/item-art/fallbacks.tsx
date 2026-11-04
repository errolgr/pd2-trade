import { ItemArt } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets';

export const meta = {
  title: 'Art and fallbacks',
  description: 'Inventory art in its quality frame, a footprint taller than wide, the next URL when one fails, and quality initials when none loads.',
  order: 1,
};

export default function FallbacksExample() {
  return (
    <div className="flex w-popover items-end gap-3 rounded-lg border bg-surface p-4">
      <ItemArt name="Harlequin Crest"
        quality="Unique"
        src={`${ART}/items/invcapu.png`}
        size={40} />
      <ItemArt name="Enigma"
        quality="Normal"
        runeword
        src={`${ART}/items/invaaru.png`}
        size={40}
        height={60} />
      <ItemArt name="Stone of Jordan"
        quality="Unique"
        src={['/missing.png', `${ART}/items/invrin.png`]}
        size={28} />
      <ItemArt name="Grand Charm"
        quality="Magic"
        size={28}
        height={56} />
      <ItemArt name="Death's Web"
        quality="Unique"
        size={40} />
    </div>
  );
}
