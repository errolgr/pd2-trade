import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from '@pd2-trader/ui';

export const meta = {
  title: 'Filter form',
  description: 'A click-opened popover holding a small form. Use it for interactive content; for read-only previews on hover use HoverCard.',
  order: 0,
};

export default function PopoverPriceFilterExample() {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Price filter</Button>
        </PopoverTrigger>
        <PopoverContent align="start"
          className="flex w-60 flex-col gap-2">
          <Label htmlFor="popover-min">Min (HR)</Label>
          <Input id="popover-min"
            defaultValue="0.5" />
          <Label htmlFor="popover-max">Max (HR)</Label>
          <Input id="popover-max"
            placeholder="No limit" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
