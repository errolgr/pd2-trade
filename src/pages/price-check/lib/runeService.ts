import { RUNE_API_MAP, RuneData, RuneValue, RuneCombination } from "./types";

// Fixed pricing for lower runes
const FIXED_RUNE_PRICES: Record<string, number> = {
  "Vex Rune": 0.5,
  "Gul Rune": 0.25,
  "Ist Rune": 0.15,
  "Mal Rune": 0.1,
  "Um Rune": 0.05,
  "Pul Rune": 0.03,
  "Lem Rune": 0.01
};

// Rune hierarchy order (highest to lowest)
const RUNE_HIERARCHY = [
  "Zod Rune", "Cham Rune", "Jah Rune", "Ber Rune", "Sur Rune", "Lo Rune", "Ohm Rune", "Vex Rune",
  "Gul Rune", "Ist Rune", "Mal Rune", "Um Rune", "Pul Rune", "Lem Rune", "Fal Rune", "Ko Rune",
  "Lum Rune", "Io Rune", "Hel Rune", "Dol Rune", "Shael Rune", "Sol Rune", "Amn Rune", "Thul Rune",
  "Ort Rune", "Ral Rune", "Tal Rune", "Ith Rune", "Eth Rune", "Nef Rune", "Tir Rune", "Eld Rune", "El Rune"
];

export async function fetchRuneData(): Promise<Record<string, RuneData>> {
  const runePromises = Object.entries(RUNE_API_MAP)
    .filter(([runeName]) => !FIXED_RUNE_PRICES[runeName]) // Skip fixed-price runes
    .map(async ([runeName, apiId]) => {
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
    .sort((a, b) => {
      // Sort by rune hierarchy first, then by price for same hierarchy level
      const aIndex = RUNE_HIERARCHY.indexOf(a.name);
      const bIndex = RUNE_HIERARCHY.indexOf(b.name);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex; // Lower index = higher in hierarchy
      }
      
      // Fallback to price sorting for any runes not in hierarchy
      const aPrice = FIXED_RUNE_PRICES[a.name] || a.data?.price || 0;
      const bPrice = FIXED_RUNE_PRICES[b.name] || b.data?.price || 0;
      return bPrice - aPrice;
    });
}

export function calculateRuneValues(sortedRunes: Array<{ name: string; data: any }>): RuneValue[] {
  const runeValues: RuneValue[] = [];

  // First, add all fixed-price runes
  Object.entries(FIXED_RUNE_PRICES).forEach(([runeName, fixedPrice]) => {
    const runeData = sortedRunes.find(r => r.name === runeName);
    runeValues.push({
      name: runeName,
      price: fixedPrice,
      numListings: -1, // Special value for fixed runes (no API data)
      isCalculated: false,
      isFixed: true
    });
  });

  // Then add non-fixed runes
  sortedRunes.forEach((rune, index) => {
    const data = rune.data;
    if (!data) return;

    // Skip if this rune already has a fixed price
    if (FIXED_RUNE_PRICES[rune.name]) {
      return;
    }

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

  // Sort by price (highest first)
  return runeValues.sort((a, b) => b.price - a.price);
}

export function getRuneBreakdown(targetRuneName: string, calculatedRuneValues: RuneValue[]): RuneCombination[] {
  const targetRune = calculatedRuneValues.find(r => r.name === targetRuneName);
  if (!targetRune) return [];

  // Don't show breakdown for Lem as it's the lowest rune
  if (targetRuneName === "Lem Rune") return [];

  const targetValue = targetRune.price;
  const combinations: RuneCombination[] = [];

  // Get all runes with lower or equal value
  const availableRunes = calculatedRuneValues
    .filter(r => r.price <= targetValue && r.name !== targetRuneName)
    .sort((a, b) => b.price - a.price);

  // Simple combination finder - try different combinations
  const findCombinations = (currentRunes: Array<{ name: string; price: number; count: number }>, remainingValue: number, startIndex: number) => {
    // Adjust tolerance based on target value - smaller tolerance for smaller values
    const tolerance = Math.max(0.01, targetValue * 0.05); // At least 0.01 HR tolerance
    
    if (remainingValue <= tolerance) { // Allow small difference for rounding
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
      
      // For very small target values, allow more of the same rune
      const maxSameRune = targetValue < 0.1 ? 5 : 3;
      
      for (let count = 1; count <= maxCount && count <= maxSameRune; count++) {
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