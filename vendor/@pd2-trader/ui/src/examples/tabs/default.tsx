import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pd2-trader/ui';

export const meta = {
  title: 'Default',
  description: 'Switch between views of the same subject inside a panel; a disabled trigger stays visible but cannot be selected.',
  order: 0,
};

export default function TabsDefaultExample() {
  return (
    <Tabs defaultValue="trades"
      className="w-popover">
      <TabsList>
        <TabsTrigger value="trades">Trades</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="offers"
          disabled>
          Offers
        </TabsTrigger>
      </TabsList>
      <TabsContent value="trades"
        className="rounded-lg border bg-surface p-4 text-xs">
        12 recent trades for Harlequin Crest.
      </TabsContent>
      <TabsContent value="history"
        className="rounded-lg border bg-surface p-4 text-xs">
        Price history for the last 30 days.
      </TabsContent>
    </Tabs>
  );
}
