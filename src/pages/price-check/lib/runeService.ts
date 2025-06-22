import { RUNE_API_MAP, RuneData, RuneValue, RuneCombination } from "./types";

export async function fetchRuneData(): Promise<Record<string, RuneData>> {
  const runePromises = Object.entries(RUNE_API_MAP).map(async ([runeName, apiId]) => {
    try {
      const response = await fetch(`https://api.pd2.tools/api/economy/item?item=${apiId}`);
      if (response.ok) {
        const data = await response.json();
        return [runeName, data];
      }
    } catch (error) {
      console.error(`Failed to fetch data for ${runeName}:`, error);
    }
    return [runeName, null];
  });

  const results = await Promise.all(runePromises);
  const runeDataMap: Record<string, RuneData> = {};
  results.forEach(([runeName, data]) => {
    if (data) {
      runeDataMap[runeName as string] = data as RuneData;
    }
  });
  return runeDataMap;
}

export function getLatestRuneData(runeData: Record<string, RuneData>, runeName: string) {
  const data = runeData[runeName];
  if (!data || !data.dataByIngestionDate.length) return null;
  return data.dataByIngestionDate[data.dataByIngestionDate.length - 1];
}

export function sortRunesByPrice(runeData: Record<string, RuneData>) {
  return Object.keys(RUNE_API_MAP)
    .map(runeName => ({
      name: runeName,
      data: getLatestRuneData(runeData, runeName)
    }))
    .filter(rune => rune.data !== null)
    .sort((a, b) => (b.data?.price || 0) - (a.data?.price || 0));
}

export function calculateRuneValues(sortedRunes: Array<{ name: string; data: any }>): RuneValue[] {
  const runeValues: RuneValue[] = [];

  sortedRunes.forEach((rune, index) => {
    const data = rune.data;
    if (!data) return;

    if (data.numListings >= 10) {
      // Use actual price if 10+ listings
      runeValues.push({
        name: rune.name,
        price: data.price,
        numListings: data.numListings,
        isCalculated: false
      });
    } else {
      // Use cascading pricing for low listings
      let calculatedPrice = data.price;
      let isCalculated = false;
      let originalPrice = data.price;

      // Look for the next rune above (regardless of listings) to calculate from
      if (index > 0) {
        const aboveRune = sortedRunes[index - 1];
        if (aboveRune.data) {
          // Get the price of the rune above (whether calculated or actual)
          const aboveRunePrice = runeValues.find(r => r.name === aboveRune.name)?.price || aboveRune.data.price;
          calculatedPrice = aboveRunePrice * 0.5;
          isCalculated = true;
        }
      }

      runeValues.push({
        name: rune.name,
        price: calculatedPrice,
        numListings: data.numListings,
        isCalculated,
        originalPrice
      });
    }
  });

  return runeValues;
}

export function getRuneBreakdown(targetRuneName: string, calculatedRuneValues: RuneValue[]): RuneCombination[] {
  const targetRune = calculatedRuneValues.find(r => r.name === targetRuneName);
  if (!targetRune) return [];

  const targetValue = targetRune.price;
  const combinations: RuneCombination[] = [];

  // Get all runes with lower or equal value
  const availableRunes = calculatedRuneValues
    .filter(r => r.price <= targetValue && r.name !== targetRuneName)
    .sort((a, b) => b.price - a.price);

  // Simple combination finder - try different combinations
  const findCombinations = (currentRunes: Array<{ name: string; price: number; count: number }>, remainingValue: number, startIndex: number) => {
    if (remainingValue <= 0.1) { // Allow small difference for rounding
      const totalValue = currentRunes.reduce((sum, r) => sum + (r.price * r.count), 0);
      combinations.push({
        runes: [...currentRunes],
        totalValue,
        difference: Math.abs(targetValue - totalValue)
      });
      return;
    }

    for (let i = startIndex; i < availableRunes.length; i++) {
      const rune = availableRunes[i];
      const maxCount = Math.floor(remainingValue / rune.price);
      
      for (let count = 1; count <= maxCount && count <= 3; count++) { // Limit to 3 of same rune
        const newRemaining = remainingValue - (rune.price * count);
        const existingRuneIndex = currentRunes.findIndex(r => r.name === rune.name);
        
        if (existingRuneIndex >= 0) {
          currentRunes[existingRuneIndex].count += count;
        } else {
          currentRunes.push({ name: rune.name, price: rune.price, count });
        }
        
        findCombinations(currentRunes, newRemaining, i + 1);
        
        if (existingRuneIndex >= 0) {
          currentRunes[existingRuneIndex].count -= count;
          if (currentRunes[existingRuneIndex].count <= 0) {
            currentRunes.splice(existingRuneIndex, 1);
          }
        } else {
          currentRunes.pop();
        }
      }
    }
  };

  findCombinations([], targetValue, 0);

  // Sort by difference (closest matches first) and limit results
  return combinations
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 5); // Show top 5 combinations
} 