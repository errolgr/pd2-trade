import type { Story, StoryDefault } from '@ladle/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pd2-trader/ui';

export default { title: 'Primitives / Tabs' } satisfies StoryDefault;

export const Default: Story = () => (
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
