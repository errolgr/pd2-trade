import { ToggleGroup, ToggleGroupItem } from '@pd2-trader/ui';

export const meta = {
  title: 'Segmented',
  description:
    '`type="single"` segmented control (time range) and `type="multiple"` group with a disabled item.',
  order: 0,
};

export default function SegmentedExample() {
  return (
    <div className="flex w-fit flex-col gap-4 rounded-lg border bg-surface p-4">
      <ToggleGroup type="single"
        defaultValue="7d"
        variant="outline"
        size="sm">
        <ToggleGroupItem value="24h">24h</ToggleGroupItem>
        <ToggleGroupItem value="7d">7d</ToggleGroupItem>
        <ToggleGroupItem value="30d">30d</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="multiple"
        defaultValue={['sc']}>
        <ToggleGroupItem value="sc">Softcore</ToggleGroupItem>
        <ToggleGroupItem value="hc">Hardcore</ToggleGroupItem>
        <ToggleGroupItem value="nl"
          disabled>
          Non-ladder
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
