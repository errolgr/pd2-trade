import * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { Currency } from '@/common/types/pd2-website/GameStashResponse';
import { useRuneData } from '../price-check/hooks/useRuneData';
import { RUNE_HIERARCHY } from '../price-check/lib/runeService';
import { RuneValue } from '../price-check/components';
import RuneCard from './RuneCard';

export function CurrencyValuation() {
  const [currency, setCurrency] = React.useState<Currency>();
  const { getCurrencyTab } = usePd2Website();

  const fetchCurrency = async () => {
    const curr = await getCurrencyTab();
    setCurrency(curr);
  };

  React.useEffect(() => {
    if (!currency) fetchCurrency();
  }, [fetchCurrency]);

  const { calculatedRuneValues, loadingRunes } = useRuneData();

  function getHighRunesData(currency: Currency, calculatedRuneValues: RuneValue[], runeHierarchy: string[]) {
    const runeKeys = Object.keys(currency.runes).slice(19, 33).reverse();

    const runeData = runeKeys.map((runeKey, i) => {
      const amount = currency.runes[runeKey];
      const runeName = runeHierarchy[i];
      const matchedRune = calculatedRuneValues.find((val) => val.name === runeName);

      const value = matchedRune ? Math.round(amount * matchedRune.price * 100) / 100 : 0;

      return {
        key: runeKey,
        displayName: matchedRune?.name.replace('Rune', '').trim() ?? runeName,
        amount,
        price: matchedRune?.price ?? 0,
        value,
      };
    });

    const totalValue = Math.round(runeData.reduce((acc, rune) => acc + rune.value, 0) * 100) / 100;

    return { runeData, totalValue };
  }

  return (
    <div className="min-h-screen w-full space-y-6 p-10 md:block bg-background">
      <div className="flex flex-row justify-between">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Currency Tab Valuation</h2>
          <div className="text-xs text-gray-500 mt-3 pt-2 border-gray-600">
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

      <Separator className="my-6" />
      <div className="flex flex-col flex-grow min-h-[400px]">
        {currency && !loadingRunes ? (
          (() => {
            const { runeData, totalValue } = getHighRunesData(currency, calculatedRuneValues, RUNE_HIERARCHY);
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 mb-3">
                  {runeData.map((rune) => (
                    <RuneCard
                      key={rune.key}
                      name={rune.displayName}
                      price={rune.price}
                      amount={rune.amount}
                      value={rune.value}
                    />
                  ))}
                </div>
                <p className="text-xl font-bold text-gray-100 pt-2">
                  Total Value: <span className="text-slate-400">{totalValue} HR</span>
                </p>
              </>
            );
          })()
        ) : (
          <div className="flex flex-grow items-center justify-center min-h-[300px]">
            <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
