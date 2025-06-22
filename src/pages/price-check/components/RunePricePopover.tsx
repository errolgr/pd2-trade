import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { RuneValue, RuneCombination } from "../lib/types";

interface RunePricePopoverProps {
  loadingRunes: boolean;
  calculatedRuneValues: RuneValue[];
  selectedRuneBreakdown: string | null;
  selectedRuneCombinations: RuneCombination[];
  onRuneBreakdownSelect: (runeName: string | null) => void;
}

export function RunePricePopover({
  loadingRunes,
  calculatedRuneValues,
  selectedRuneBreakdown,
  selectedRuneCombinations,
  onRuneBreakdownSelect
}: RunePricePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 h-6">
          <ArrowRightLeft className="h-2 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 overflow-y-auto">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Current Rune Prices</h4>
          {loadingRunes ? (
            <div className="text-sm text-gray-500">Loading rune data...</div>
          ) : (
            <div className="space-y-1">
              {calculatedRuneValues.map((rune) => (
                <div key={rune.name} className="flex justify-between items-center text-sm">
                  <button
                    onClick={() => onRuneBreakdownSelect(selectedRuneBreakdown === rune.name ? null : rune.name)}
                    className={cn(
                      "font-medium text-left hover:text-blue-400 transition-colors",
                      selectedRuneBreakdown === rune.name && "text-blue-400"
                    )}
                  >
                    {rune.name}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      rune.isCalculated ? "text-yellow-500" : "text-green-500"
                    )}>
                      {rune.price} HR
                      {rune.isCalculated && <span className="text-xs ml-1">*</span>}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ({rune.numListings} listings)
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Breakdown combinations */}
              {selectedRuneBreakdown && selectedRuneCombinations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <h5 className="font-semibold text-sm mb-2">
                    {selectedRuneBreakdown} Breakdown:
                  </h5>
                  <div className="space-y-2">
                    {selectedRuneCombinations.map((combo, index) => (
                      <div key={index} className="text-xs bg-gray-800 p-2 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-300">
                            {combo.runes.map(r => `${r.count}x ${r.name}`).join(" + ")}
                          </span>
                          <span className="text-green-400">
                            = {combo.totalValue.toFixed(1)} HR
                          </span>
                        </div>
                        {combo.difference > 0.1 && (
                          <div className="text-gray-500">
                            Diff: {combo.difference.toFixed(1)} HR
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {calculatedRuneValues.some(r => r.isCalculated) && (
                <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                  * Calculated as 0.5x the value of the rune above (when &lt;10 listings)
                </div>
              )}
              
              {/* Attribution */}
              <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-600 text-center">
                Powered by <a href="https://pd2.tools" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">pd2.tools</a>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 