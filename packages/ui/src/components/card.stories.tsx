import type { Story, StoryDefault } from '@ladle/react';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@pd2-trader/ui';

export default { title: 'Primitives / Card' } satisfies StoryDefault;

export const Default: Story = () => (
  <Card className="w-sidebar">
    <CardHeader>
      <CardTitle>Net worth</CardTitle>
      <CardDescription>Stash + equipped, priced from the last 7 days of trades.</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold tabular-nums">
        412.5 <span className="text-sm text-muted-foreground">HR</span>
      </p>
    </CardContent>
    <CardFooter className="justify-end">
      <Button size="sm"
        variant="outline">
        Rescan stash
      </Button>
    </CardFooter>
  </Card>
);
