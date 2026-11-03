import type { Story, StoryDefault } from '@ladle/react';
import {
  CurrencyAmount,
  ItemName,
  PanelSurface,
  PopoverKeyValue,
  PopoverSectionTitle,
  PopoverTile,
  SLOT_TONES,
  SlotAction,
  SlotBadge,
  SlotColumn,
  SlotDivider,
  SlotList,
  SlotRow,
  SlotSection,
  SlotText,
  SparkChart,
  StatLine,
} from '@pd2-trader/ui';

export default { title: 'Plugin slots / Slot components' } satisfies StoryDefault;

export const Parts: Story = () => (
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

export const Badges: Story = () => (
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

/** How plugin slots render inside the price-check popover: host content first, then each plugin's SlotSection. */
export const SlotPreviews: Story = () => (
  <PanelSurface className="w-popover gap-3 p-3">
    <div className="flex flex-col items-center gap-0.5 text-center text-xs">
      <ItemName name="Harlequin Crest"
        quality="Unique"
        className="text-sm font-semibold" />
      <span className="text-muted-foreground">Shako</span>
      <StatLine range={[1, 148]}>+1.5 to Maximum Life (Based on Character Level)</StatLine>
      <StatLine>+2 to All Skills</StatLine>
      <StatLine corrupted>Corrupted: +20% Faster Cast Rate</StatLine>
    </div>
    <PopoverSectionTitle aside="24 trades · 7 days">Market price</PopoverSectionTitle>
    <div className="grid grid-cols-3 gap-2">
      <PopoverTile label="Average"
        emphasis>
        1.45 HR
      </PopoverTile>
      <PopoverTile label="Low">1.10 HR</PopoverTile>
      <PopoverTile label="High">2.00 HR</PopoverTile>
    </div>
    <SparkChart points={[1.2, 1.25, 1.3, 1.28, 1.35, 1.4, 1.45]}
      aria-label="30-day price" />
    <div className="space-y-1 border-t border-border pt-2 text-xs">
      <PopoverKeyValue label="Samples">24</PopoverKeyValue>
    </div>
    <SlotSection title="Roll Grader">
      <SlotColumn>
        <div className="flex items-center gap-1.5">
          <SlotBadge text="Perfect roll"
            tone="success" />
          <SlotBadge text="Top 3%"
            tone="q-unique" />
        </div>
        <SlotRow label="Life roll"
          value="148 / 148"
          tone="success" />
        <SlotRow label="Corruption"
          value="+20% FCR"
          tone="q-magic" />
        <SlotText text="Perfect Shakos trade ~40% above the average."
          size="sm"
          tone="muted" />
      </SlotColumn>
    </SlotSection>
    <SlotSection title="Flip Finder">
      <SlotRow label="Underpriced listings"
        value="3"
        tone="warning" />
      <SlotList items={['Sorc_Errol · 1.10 HR', 'HammerDin · 1.15 HR', 'Javazon_77 · 1.20 HR']} />
      <SlotDivider />
      <SlotAction label="Whisper cheapest"
        onClick={() => undefined} />
    </SlotSection>
    <SlotSection title="Net worth">
      <CurrencyAmount label="Stash after sale"
        amount={413.95}
        unit="hr"
        delta={1.45}
        size="sm" />
    </SlotSection>
  </PanelSurface>
);
