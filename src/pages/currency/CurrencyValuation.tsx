import * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronDown, Loader2, X } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { Currency } from '@/common/types/pd2-website/GameStashResponse';
import { useRuneData } from '../price-check/hooks/useRuneData';
import { EconomyValue, RUNE_HIERARCHY } from '../price-check/lib/economyService';
import { DataTable } from './components/DataTable';
import { createColumns } from './Columns';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STASH_API_MAP } from '../price-check/lib/types';

export function CurrencyValuation() {
  const [currency, setCurrency] = React.useState<Currency>();
  const [selectedCategory, setSelectedCategory] = React.useState<FormattedStashCategory>('runes');
  const categoryOptions: FormattedStashCategory[] = ['currency', 'runes', 'ubers'];
  const [data, setData] = React.useState<FormattedStashData>();
  const { getCurrencyTab } = usePd2Website();
  const columns = createColumns(selectedCategory);

  const { calculatedEconomyValues, loadingRunes } = useRuneData();

  const fetchCurrency = async () => {
    const curr = await getCurrencyTab();
    setCurrency(curr);
  };

  React.useEffect(() => {
    if (!currency) {
      fetchCurrency();
    }
  }, [currency, fetchCurrency]);

  React.useEffect(() => {
    if (currency && calculatedEconomyValues) {
      const formatted = formattedEconomyData(currency, calculatedEconomyValues);
      setData(formatted);
    }
  }, [currency, calculatedEconomyValues]);

  type FormattedStashData = {
    currency: { items: FormattedItem[]; total: number };
    runes: { items: FormattedItem[]; total: number };
    ubers: { items: FormattedItem[]; total: number };
  };

  type FormattedStashCategory = keyof FormattedStashData;

  type FormattedItem = {
    key: string;
    item: string;
    amount: number;
    price: number;
    value: number;
  };

  function formatEconomyCategoryAmounts(
    category: keyof EconomyValue,
    currency: Currency,
    calculatedEconomyValues: EconomyValue,
    runeHierarchy?: string[],
  ): { items: FormattedItem[]; total: number } {
    let items: FormattedItem[] = [];

    if (category === 'Runes' && runeHierarchy) {
      const runeKeys = Object.keys(currency.runes).slice(19, 33).reverse(); // r20 to r33

      items = runeKeys.map((runeKey, i) => {
        const amount = currency.runes[runeKey];
        const item = runeHierarchy[i];
        const match = calculatedEconomyValues.Runes.find((r) => r.name === item);
        const price = match?.price ?? 0;
        const value = Math.round(amount * price * 100) / 100;

        return { key: runeKey, item, amount, price: Math.round(price * 100) / 100, value };
      });
    } else {
      const source =
        category === 'Ubers'
          ? {
              black_soulstone: currency.boss.dclone.black_soulstone,
              insignia: currency.boss.lucion.insignia,
              flesh: currency.boss.lucion.flesh,
              ashes: currency.boss.rathma.ashes,
              prime_evil_soul: currency.boss.dclone.prime_evil_soul,
              pure_demonic_essence: currency.boss.dclone.pure_demonic_essence,
              korlic: currency.boss.uber_ancients.korlic,
              madawc: currency.boss.uber_ancients.madawc,
              talic: currency.boss.uber_ancients.talic,
              splinter: currency.boss.rathma.splinter,
              twss: currency.twss,
              talisman: currency.boss.lucion.talisman,
              jawbone: currency.boss.rathma.jawbone,
            }
          : {
              demonic_cube: currency.demonic_cube,
              puzzlebox: currency.puzzlebox,
              puzzlepiece: currency.puzzlepiece,
              catalyst: currency.map.catalyst,
              standard: currency.map.standard,
              destruction: currency.essence.destruction,
              hatred: currency.essence.hatred,
              suffering: currency.essence.suffering,
              terror: currency.essence.terror,
            };

      const map = STASH_API_MAP[category];

      items = Object.entries(source).map(([key, amount]) => {
        const item = map[key];
        const match = calculatedEconomyValues[category].find((val) => val.name === item);
        const price = match?.price ?? 0;
        const value = Math.round(amount * price * 100) / 100;

        return { key, item, amount, price: Math.round(price * 100) / 100, value };
      });
    }

    const total = Math.round(items.reduce((sum, { value }) => sum + value, 0) * 100) / 100;
    return { items, total };
  }

  function formattedEconomyData(currency: Currency, calculatedValues: EconomyValue): FormattedStashData {
    const runes = formatEconomyCategoryAmounts('Runes', currency, calculatedValues, RUNE_HIERARCHY);
    const ubers = formatEconomyCategoryAmounts('Ubers', currency, calculatedValues);
    const currencyItems = formatEconomyCategoryAmounts('Currency', currency, calculatedValues);

    return {
      runes,
      ubers,
      currency: currencyItems,
    };
  }

  function getGrandTotal(data: FormattedStashData): number {
    return data.currency.total + data.runes.total + data.ubers.total;
  }

  return (
    <div className="min-h-screen w-full space-y-6 p-10 md:block bg-background">
      <div className="flex flex-row justify-between">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold">Currency Valuation</h2>
          <div className="text-xs text-gray-500 mt-3 border-gray-600 -mb-3">
            Powered by{' '}
            <a
              href="https://pd2.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              pd2.tools
            </a>
          </div>
        </div>

        <Button variant="ghost"
          size="icon"
          onClick={() => getCurrentWebviewWindow().close()}
          className="self-start">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="" />
      {currency && !loadingRunes && (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="outline"
              className="ml-auto w-32 justify-between capitalize">
              {selectedCategory} <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {categoryOptions.map((category) => (
              <DropdownMenuItem key={category}
                className="capitalize"
                onClick={() => setSelectedCategory(category)}>
                <div className="w-full flex items-center justify-between">
                  <p>{category}</p> {category === selectedCategory && <CheckIcon />}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex flex-col flex-grow min-h-[400px]">
        {data ? (
          (() => {
            return (
              <>
                <DataTable columns={columns}
                  data={data[selectedCategory].items} />
                <p className="text-sm text-gray-300 pt-4 capitalize">
                  {selectedCategory} Value: <span className="text-gray-400">{data[selectedCategory].total} HR</span>
                </p>
                <p className="text-md text-gray-300 pt-1">
                  Estimated Stash Value: <span className="text-gray-400">{getGrandTotal(data)} HR</span>
                </p>
              </>
            );
          })()
        ) : (
          <div className="flex flex-grow items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
