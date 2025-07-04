import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRightLeft, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemValue, RuneCombination } from "../lib/types";

interface RunePricePopoverProps {
  loadingRunes: boolean;
  calculatedRuneValues: ItemValue[];
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
  const [showMore, setShowMore] = useState(false);

  // Separate high and low runes
  const highRunes = calculatedRuneValues.filter(rune => 
    !["Gul Rune", "Ist Rune", "Mal Rune", "Um Rune", "Pul Rune", "Lem Rune"].includes(rune.name)
  );
  const lowRunes = calculatedRuneValues.filter(rune => 
    ["Gul Rune", "Ist Rune", "Mal Rune", "Um Rune", "Pul Rune", "Lem Rune"].includes(rune.name)
  );

  // Determine which runes to display
  const displayedRunes = showMore ? calculatedRuneValues : highRunes;

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
              {displayedRunes.map((rune) => (
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
                      rune.isFixed ? "text-gray-400" : rune.isCalculated ? "text-yellow-500" : "text-green-500"
                    )}>
                      {rune.price} HR
                      {(rune.isCalculated || rune.isFixed) && <span className="text-xs ml-1">*</span>}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ({rune.isFixed ? "fixed" : `${rune.numListings} listings`})
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Show More/Less Button */}
              {lowRunes.length > 0 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="w-full text-xs text-gray-400 hover:text-gray-300 flex items-center justify-center gap-1 py-1 mt-2"
                >
                  {showMore ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show More ({lowRunes.length} lower runes)
                    </>
                  )}
                </button>
              )}
              
              {/* Breakdown combinations */}
              {selectedRuneBreakdown && selectedRuneCombinations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <h5 className="font-semibold text-sm mb-2">
                    {selectedRuneBreakdown} Breakdown:
                  </h5>
                  <div className="space-y-2">
                    {selectedRuneCombinations.map((combo, index) => {
                      const targetValue = calculatedRuneValues.find(r => r.name === selectedRuneBreakdown)?.price || 0;
                      return (
                        <div key={index} className="text-xs bg-gray-800 p-2 rounded">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-300">
                              {combo.runes.map(r => `${r.count}x ${r.name.replace(' Rune', '')}`).join(" + ")}
                            </span>
                            <span className={cn(
                              "text-green-400",
                              combo.difference > targetValue * 0.2 && "text-yellow-400",
                              combo.difference > targetValue * 0.4 && "text-gray-400"
                            )}>
                              = {combo.totalValue.toFixed(2)} HR
                            </span>
                          </div>
                          {combo.difference > 0.1 && (
                            <div className={cn(
                              "text-gray-500",
                              combo.difference > targetValue * 0.2 && "text-yellow-500",
                              combo.difference > targetValue * 0.4 && "text-gray-600"
                            )}>
                              Diff: {combo.difference.toFixed(2)} HR
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {(calculatedRuneValues.some(r => r.isCalculated) || calculatedRuneValues.some(r => r.isFixed)) && (
                <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
                  * Calculated as 0.5x the value of the rune above (when &lt;10 listings) or fixed pricing for lower runes
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