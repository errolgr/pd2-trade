import { Button, ButtonGroup } from '@pd2-trader/ui';

export const meta = {
  title: 'Vertical',
  description: '`orientation="vertical"` stacks related actions into one block, e.g. listing actions in a narrow column.',
  order: 1,
};

export default function VerticalExample() {
  return (
    <div className="w-fit rounded-lg border bg-surface p-4">
      <ButtonGroup orientation="vertical">
        <Button variant="outline"
          size="sm">
          Bump
        </Button>
        <Button variant="outline"
          size="sm">
          Edit price
        </Button>
        <Button variant="outline"
          size="sm">
          Delist
        </Button>
      </ButtonGroup>
    </div>
  );
}
