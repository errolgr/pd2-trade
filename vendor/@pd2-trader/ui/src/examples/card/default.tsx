import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@pd2-trader/ui';

export const meta = {
  title: 'Default',
  description: 'Card with header, title, description, content and footer: a self-contained summary block on the website or a settings page.',
  order: 0,
};

export default function DefaultExample() {
  return (
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
}
