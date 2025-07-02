import * as React from 'react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { Currency } from '@/common/types/pd2-website/GameStashResponse';
import { useRuneData } from '../price-check/hooks/useRuneData';
import { RUNE_HIERARCHY } from '../price-check/lib/runeService';

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

        <Button variant="ghost" size="icon" onClick={() => getCurrentWebviewWindow().close()} className="self-start">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator className="my-6" />
      <div className="flex space-y-8 lg:flex-row lg:gap-x-12 lg:gap-y-0">
        <div>
          {currency && !loadingRunes && (() => {
                const runeKeys = Object.keys(currency.runes).slice(19, 33).reverse();

                const totalHR =
                  Math.round(
                    runeKeys.reduce((acc, rune, i) => {
                      const amount = currency.runes[rune];
                      const price = calculatedRuneValues[i]?.price || 0;
                      return acc + amount * price;
                    }, 0) * 100,
                  ) / 100;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5 mb-6">
                      {runeKeys.map((rune, i) => (
                        <div
                          key={rune}
                          className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-xl transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-500/25"
                        >
                          <div className="font-bold text-gray-100 text-lg mb-1">
                            {RUNE_HIERARCHY[i].replace('Rune', '').trim()}
                          </div>
                          {calculatedRuneValues[i] && (
                            <div className="text-sm text-gray-400 space-y-1">
                              <div>
                                <span className="font-medium text-slate-400">Amount:</span> {currency.runes[rune]}
                              </div>
                              <div>
                                <span className="font-medium text-slate-400">Value:</span>{' '}
                                {Math.round(currency.runes[rune] * calculatedRuneValues[i].price * 100) / 100} HR
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xl font-bold text-gray-100 pt-2">
                      Total Value: <span className="text-slate-400">{totalHR} HR</span>
                    </p>
                  </>
                );
              })()}
        </div>
      </div>
    </div>
  );
}
