import {
    SlotAction,
    SlotDivider,
    SlotList,
    SlotRow,
    SlotSection,
    SlotText
} from '@pd2-trader/ui';

export const meta = {
  title: 'Parts',
  description:
    'Every slot part: SlotRow and SlotText with tones, SlotList, SlotDivider and SlotAction (enabled and disabled). Props are plain data so the host can validate them.',
  order: 0,
};

export default function PartsExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3">
      <SlotSection title="SlotRow / SlotText">
        <SlotRow label="Estimated"
          value="1.45 HR"
          tone="success" />
        <SlotRow label="Roll"
          value="Perfect"
          tone="q-unique" />
        <SlotRow label="Untrusted tone falls back"
          value="default" />
        <SlotText text="Body text (md)" />
        <SlotText text="Caption text (sm, muted)"
          size="sm"
          tone="muted" />
      </SlotSection>
      <SlotSection title="SlotList / SlotDivider / SlotAction">
        <SlotList items={['Used in Enigma', 'Used in Infinity', 'Cube: 2 Ber → Jah']} />
        <SlotDivider />
        <SlotAction label="Open in market"
          onClick={() => undefined} />
        <SlotAction label="Disabled action"
          onClick={() => undefined}
          disabled />
      </SlotSection>
    </div>
  );
}
