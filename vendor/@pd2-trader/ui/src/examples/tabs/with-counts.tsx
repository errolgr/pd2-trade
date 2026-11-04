import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@pd2-trader/ui';

export const meta = {
  title: 'Full width with counts',
  description: 'A stretched list for a panel header, with a `Badge variant="count"` per tab. Use tabs for sibling views; use navigation for pages.',
  order: 1,
};

export default function TabsWithCountsExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-2">
      <Tabs defaultValue="offers">
        <TabsList className="w-full">
          <TabsTrigger value="offers">
            Offers <Badge variant="count">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="listings">
            Listings <Badge variant="count">12</Badge>
          </TabsTrigger>
          <TabsTrigger value="sold">Sold</TabsTrigger>
        </TabsList>
        <TabsContent value="offers"
          className="px-1 text-xs text-muted-foreground">
          3 open offers on Harlequin Crest, best 2.5 HR.
        </TabsContent>
        <TabsContent value="listings"
          className="px-1 text-xs text-muted-foreground">
          12 active listings in Hell ladder.
        </TabsContent>
        <TabsContent value="sold"
          className="px-1 text-xs text-muted-foreground">
          Nothing sold this season yet.
        </TabsContent>
      </Tabs>
    </div>
  );
}
