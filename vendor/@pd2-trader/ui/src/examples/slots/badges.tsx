import {
    SLOT_TONES,
    SlotBadge,
    SlotSection
} from '@pd2-trader/ui';

export const meta = {
  title: 'Tones',
  description:
    'SlotBadge in every SLOT_TONES value: status tones plus the q-* item quality colors. Unknown tones from plugins fall back to `default`.',
  order: 1,
};

export default function BadgesExample() {
  return (
    <SlotSection title="SlotBadge tones"
      className="w-popover">
    <div className="flex flex-wrap gap-1.5">
      {SLOT_TONES.map((tone) => (
        <SlotBadge key={tone}
          text={tone}
          tone={tone} />
      ))}
    </div>
  </SlotSection>
  );
}
