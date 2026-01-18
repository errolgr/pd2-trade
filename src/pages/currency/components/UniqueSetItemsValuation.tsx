import * as React from 'react';
import { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { usePd2Website, handleApiResponse } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { fetchItemPriceByName, AveragePriceResponse } from '../lib/price-api';
import { DataTable } from './DataTable';
import { createUniqueSetColumns, PricedItem } from '../Columns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatHr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { fetch as tauriFetch } from '@/lib/browser-http';

interface StashTabData {
  stashPage: number;
  items: PricedItem[];
  total: number;
}

export function UniqueSetItemsValuation() {
  const { authData } = usePd2Website();
  const { settings } = useOptions();
  const [stashTabs, setStashTabs] = React.useState<StashTabData[]>([]);
  const [selectedTab, setSelectedTab] = React.useState<string>('all');
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [totalItems, setTotalItems] = React.useState(0);
  const [processedItems, setProcessedItems] = React.useState(0);

  // Helper function to fetch stash data
  const fetchStashData = React.useCallback(async () => {
    if (!authData || !settings) {
      return null;
    }

    try {
      const is_hardcore = settings.mode === 'hardcore';
      const is_ladder = settings.ladder === 'ladder';
      const account = settings.account;

      const params = new URLSearchParams({
        account: account || '',
        softcore: (!is_hardcore).toString(),
        ladder: is_ladder.toString(),
      });

      const url = `https://api.projectdiablo2.com/game/stash/${account}?${params}`;
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });

      return await handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching stash data:', error);
      return null;
    }
  }, [authData, settings]);

  const fetchAndPriceItems = React.useCallback(async () => {
    if (!authData || !settings) {
      return;
    }

    setLoading(true);
    setProgress(0);
    setProcessedItems(0);

    try {
      const stashData = await fetchStashData();

      if (!stashData || !stashData.items) {
        setLoading(false);
        return;
      }

      // Filter for unique and set items
      const uniqueSetItems = stashData.items.filter(
        (item: GameStashItem) => item.quality?.name === 'Unique' || item.quality?.name === 'Set',
      );

      if (uniqueSetItems.length === 0) {
        setLoading(false);
        setStashTabs([]);
        return;
      }

      setTotalItems(uniqueSetItems.length);

      // Group items by stash page
      const itemsByStashPage = new Map<number, GameStashItem[]>();
      uniqueSetItems.forEach((item: GameStashItem) => {
        const stashPage = item.location?.stash_page ?? 0;
        if (!itemsByStashPage.has(stashPage)) {
          itemsByStashPage.set(stashPage, []);
        }
        itemsByStashPage.get(stashPage)!.push(item);
      });

      // Fetch prices for all items
      const isLadder = settings.ladder === 'ladder';
      const isHardcore = settings.mode === 'hardcore';

      const stashTabsData: StashTabData[] = [];
      let processed = 0;

      // Process each stash tab
      for (const [stashPage, items] of Array.from(itemsByStashPage.entries()).sort((a, b) => a[0] - b[0])) {
        const pricedItems: PricedItem[] = [];

        for (const item of items) {
          let priceData: AveragePriceResponse | null = null;

          if (item.name) {
            try {
              priceData = await fetchItemPriceByName(item.name, {
                isLadder,
                isHardcore,
              });
            } catch (error) {
              console.error(`Error fetching price for ${item.name}:`, error);
            }
          }

          const value = priceData?.medianPrice ?? priceData?.averagePrice ?? 0;
          pricedItems.push({
            item,
            priceData,
            value: Math.round(value * 100) / 100,
          });

          processed++;
          setProcessedItems(processed);
          setProgress((processed / uniqueSetItems.length) * 100);
        }

        const total = Math.round(pricedItems.reduce((sum, { value }) => sum + value, 0) * 100) / 100;

        stashTabsData.push({
          stashPage,
          items: pricedItems,
          total,
        });
      }

      setStashTabs(stashTabsData);
      if (stashTabsData.length > 0) {
        setSelectedTab('all');
      }
    } catch (error) {
      console.error('Error fetching and pricing items:', error);
    } finally {
      setLoading(false);
    }
  }, [authData, settings, fetchStashData]);

  React.useEffect(() => {
    if (authData && settings?.account) {
      fetchAndPriceItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authData, settings?.account]);

  const columns = createUniqueSetColumns();

  // Calculate totals
  const allItems = stashTabs.flatMap((tab) => tab.items);
  const grandTotal = Math.round(stashTabs.reduce((sum, tab) => sum + tab.total, 0) * 100) / 100;

  const selectedTabData =
    selectedTab === 'all'
      ? { items: allItems, total: grandTotal }
      : stashTabs.find((tab) => tab.stashPage.toString() === selectedTab) || {
          items: [],
          total: 0,
        };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">
              Pricing items... {processedItems} / {totalItems}
            </span>
            <span className="text-gray-400">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress}
            className="w-full" />
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (stashTabs.length === 0) {
    return <div className="text-center py-8 text-gray-400">No unique or set items found in your stash.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1" />
        <Button variant="outline"
          size="sm"
          onClick={fetchAndPriceItems}
          disabled={loading}
          className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Prices
        </Button>
      </div>
      <Tabs value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full">
        <div className="flex gap-4">
          <TabsList className="flex-col h-auto p-1">
            <TabsTrigger value="all"
              className="w-full justify-start">
              All Tabs
            </TabsTrigger>
            {stashTabs.map((tab) => (
              <TabsTrigger key={tab.stashPage}
                value={tab.stashPage.toString()}
                className="w-full justify-start">
                Tab {tab.stashPage + 1}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1">
            <TabsContent value={selectedTab}
              className="mt-0">
              <DataTable columns={columns}
                data={selectedTabData.items} />
              <div className="mt-4 space-y-1">
                <p className="text-sm text-gray-300">
                  {selectedTab === 'all' ? 'Total' : `Tab ${parseInt(selectedTab) + 1}`} Value:{' '}
                  <span className="text-gray-400">{formatHr(selectedTabData.total)}</span>
                </p>
                {selectedTab === 'all' && (
                  <p className="text-md text-gray-300">
                    Total Items: <span className="text-gray-400">{allItems.length}</span>
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
