import { RUNE_HIERARCHY } from '@/common/constants';
import { ECONOMY_API_MAP, FIXED_RUNE_PRICES, ALL_RUNE_HR_VALUES } from './constants';
import { EconomyData, ItemData, ItemValue, RuneCombination } from './types';
import { fetchMultipleItemPrices, PriceApiConfig } from '../../currency/lib/price-api';
import { RUNE_NAME_TO_BASE_CODE } from '../../currency/lib/api-mapping';

/** Rune prices for the Rune Exchange popover. Stash valuation is done server-side (net worth API). */
export async function fetchEconomyData(config: PriceApiConfig = {}): Promise<EconomyData> {
  const effectiveConfig: PriceApiConfig = {
    isLadder: config.isLadder ?? true,
    isHardcore: config.isHardcore ?? false,
    hours: 168,
    ...(config.startDate && { startDate: config.startDate }),
    ...(config.endDate && { endDate: config.endDate }),
  };

  const results: EconomyData = { Runes: {} };

  try {
    // Fetch ALL rune prices using batch API - get all runes that have base codes
    const runeItems = RUNE_HIERARCHY.map((runeName) => RUNE_NAME_TO_BASE_CODE[runeName])
      .filter((baseCode): baseCode is string => !!baseCode)
      .map((baseCode) => ({ baseCode }));

    const runePrices = await fetchMultipleItemPrices(runeItems, effectiveConfig);

    runePrices?.forEach((price) => {
      const runeName = price.itemName;
      if (runeName) {
        results.Runes[runeName] = {
          itemName: runeName,
          proper: runeName,
          dataByIngestionDate: [
            {
              date: price.timeRange.end,
              trueDate: price.timeRange.end,
              numListings: price.sampleCount,
              price: price.movingAverage7Days ?? price.medianPrice,
            },
          ],
        };
      }
    });
  } catch (error) {
    console.error('Error fetching economy data from API:', error);
    // Return empty data on error - will fall back to fixed prices
  }

  return results;
}

export function sortItemsByPrice(runeData: Record<string, ItemData>) {
  // Map rune names to their data from the API
  return Object.keys(ECONOMY_API_MAP.Runes)
    .map((runeName) => ({
      name: runeName,
      data: runeData[runeName] || null, // Use API data if available
    }))
    .sort((a, b) => {
      const aIndex = RUNE_HIERARCHY.indexOf(a.name);
      const bIndex = RUNE_HIERARCHY.indexOf(b.name);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      const aPrice = FIXED_RUNE_PRICES[a.name] || ALL_RUNE_HR_VALUES[a.name] || 0;
      const bPrice = FIXED_RUNE_PRICES[b.name] || ALL_RUNE_HR_VALUES[b.name] || 0;
      return bPrice - aPrice;
    });
}

// Low runes that should always use fixed prices (they don't change much)
const LOW_RUNES = [
  'El Rune',
  'Eld Rune',
  'Tir Rune',
  'Nef Rune',
  'Eth Rune',
  'Ith Rune',
  'Tal Rune',
  'Ral Rune',
  'Ort Rune',
  'Thul Rune',
  'Amn Rune',
  'Sol Rune',
  'Shael Rune',
  'Dol Rune',
  'Hel Rune',
  'Io Rune',
  'Lum Rune',
  'Ko Rune',
  'Fal Rune',
  'Lem Rune',
  'Pul Rune',
  'Um Rune',
  'Mal Rune',
  'Ist Rune',
  'Gul Rune',
  'Vex Rune',
];

export function calculateRuneValues(sortedRunes: Array<{ name: string; data: any }>): ItemValue[] {
  const runeValues: ItemValue[] = [];
  const MIN_LISTINGS_FOR_API_PRICE = 10; // Minimum listings to trust API price

  // First, add runes from API data (prioritize API prices)
  sortedRunes.forEach((rune) => {
    const isLowRune = LOW_RUNES.includes(rune.name);
    const latestData = rune.data?.dataByIngestionDate?.[0];

    // Low runes always use fixed prices
    if (isLowRune) {
      const fixedPrice = FIXED_RUNE_PRICES[rune.name] || ALL_RUNE_HR_VALUES[rune.name];
      if (fixedPrice) {
        runeValues.push({
          name: rune.name,
          price: fixedPrice,
          numListings: latestData?.numListings || -1,
          isCalculated: false,
          isFixed: true,
        });
      }
      return;
    }

    // For high runes, use API data if available
    if (latestData && latestData.price > 0) {
      const numListings = latestData.numListings || 0;

      // Use API price if we have enough listings, otherwise fall back to fixed
      if (numListings >= MIN_LISTINGS_FOR_API_PRICE) {
        runeValues.push({
          name: rune.name,
          price: latestData.price,
          numListings: numListings,
          isCalculated: false,
          isFixed: false,
        });
      } else {
        // Not enough listings, use fixed price as fallback
        const fixedPrice = FIXED_RUNE_PRICES[rune.name] || ALL_RUNE_HR_VALUES[rune.name];
        if (fixedPrice) {
          runeValues.push({
            name: rune.name,
            price: fixedPrice,
            numListings: numListings,
            isCalculated: false,
            isFixed: true,
          });
        }
      }
    } else {
      // No API data, use fixed price
      const fixedPrice = FIXED_RUNE_PRICES[rune.name] || ALL_RUNE_HR_VALUES[rune.name];
      if (fixedPrice) {
        runeValues.push({
          name: rune.name,
          price: fixedPrice,
          numListings: -1,
          isCalculated: false,
          isFixed: true,
        });
      }
    }
  });

  // Add any runes from FIXED_RUNE_PRICES that weren't in sortedRunes
  Object.entries(FIXED_RUNE_PRICES).forEach(([runeName, fixedPrice]) => {
    if (!runeValues.find((r) => r.name === runeName)) {
      runeValues.push({
        name: runeName,
        price: fixedPrice,
        numListings: -1,
        isCalculated: false,
        isFixed: true,
      });
    }
  });

  // Add any runes from ALL_RUNE_HR_VALUES that weren't already added
  Object.entries(ALL_RUNE_HR_VALUES).forEach(([runeName, hrValue]) => {
    if (!runeValues.find((r) => r.name === runeName) && !FIXED_RUNE_PRICES[runeName]) {
      runeValues.push({
        name: runeName,
        price: hrValue,
        numListings: -1,
        isCalculated: false,
        isFixed: true,
      });
    }
  });

  return runeValues.sort((a, b) => b.price - a.price);
}

export function getRuneBreakdown(targetRuneName: string, calculatedRuneValues: ItemValue[]): RuneCombination[] {
  const targetRune = calculatedRuneValues.find((r) => r.name === targetRuneName);
  if (!targetRune || targetRuneName === 'Lem Rune') return [];

  const targetValue = targetRune.price;
  const combinations: RuneCombination[] = [];

  const availableRunes = calculatedRuneValues
    .filter((r) => r.price <= targetValue && r.name !== targetRuneName)
    .sort((a, b) => b.price - a.price);

  const findCombinations = (
    currentRunes: Array<{ name: string; price: number; count: number }>,
    remainingValue: number,
    startIndex: number,
  ) => {
    const tolerance = Math.max(0.01, targetValue * 0.05);

    if (remainingValue <= tolerance) {
      const totalValue = currentRunes.reduce((sum, r) => sum + r.price * r.count, 0);
      combinations.push({
        runes: [...currentRunes],
        totalValue,
        difference: Math.abs(targetValue - totalValue),
      });
      return;
    }

    for (let i = startIndex; i < availableRunes.length; i++) {
      const rune = availableRunes[i];
      const maxCount = Math.floor(remainingValue / rune.price);
      const maxSameRune = targetValue < 0.1 ? 5 : 3;

      for (let count = 1; count <= maxCount && count <= maxSameRune; count++) {
        const newRemaining = remainingValue - rune.price * count;
        const existingRuneIndex = currentRunes.findIndex((r) => r.name === rune.name);

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

  return combinations.sort((a, b) => a.difference - b.difference).slice(0, 5);
}
