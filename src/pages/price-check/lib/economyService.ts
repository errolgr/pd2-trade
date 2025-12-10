import { RUNE_HIERARCHY } from '@/common/constants';
import { ECONOMY_API_MAP, FIXED_RUNE_PRICES, ALL_RUNE_HR_VALUES } from './constants';
import { EconomyData, EconomyValue, ItemData, ItemValue, RuneCombination } from './types';
import { fetchItemPrice, fetchMultipleItemPrices } from '../../currency/lib/price-api';
import { STASH_TO_API_MAP, RUNE_NAME_TO_BASE_CODE } from '../../currency/lib/api-mapping';
import { STASH_API_MAP } from '../../currency/lib/constants';

export async function fetchEconomyData(): Promise<{
  Runes: Record<string, ItemData>;
  Currency: Record<string, ItemData>;
  Ubers: Record<string, ItemData>;
}> {
  // Fetch from our own PD2 Price Crawler API
  // Default to ladder, non-hardcore, last 24 hours
  const config = {
    isLadder: true,
    isHardcore: false,
    hours: 168,
  };

  const results: {
    Runes: Record<string, ItemData>;
    Currency: Record<string, ItemData>;
    Ubers: Record<string, ItemData>;
  } = {
    Runes: {},
    Currency: {},
    Ubers: {},
  };

  try {
    // Fetch ALL rune prices using batch API - get all runes that have base codes
    const runeItems = RUNE_HIERARCHY
      .map((runeName) => RUNE_NAME_TO_BASE_CODE[runeName])
      .filter((baseCode): baseCode is string => !!baseCode)
      .map(baseCode => ({ baseCode }));

    const runePrices = await fetchMultipleItemPrices(runeItems, config);
    
    runePrices.forEach((price, baseCode) => {
      const runeName = price.itemName;
      if (runeName) {
        results.Runes[runeName] = {
          itemName: runeName,
          proper: runeName,
          dataByIngestionDate: [{
            date: price.timeRange.end,
            trueDate: price.timeRange.end,
            numListings: price.sampleCount,
            price: price.medianPrice,
          }],
        };
      }
    });

    // Fetch currency item prices - use STASH_API_MAP to determine which items belong to Currency category
    const currencyKeys = Object.keys(STASH_API_MAP.Currency);
    const currencyItems = currencyKeys
      .map(key => STASH_TO_API_MAP[key]?.baseCode)
      .filter((baseCode): baseCode is string => !!baseCode)
      .map(baseCode => ({ baseCode }));
    
    const currencyPrices = await fetchMultipleItemPrices(currencyItems, config);

    currencyPrices.forEach((price) => {
      const itemName = price.itemName;
      if (itemName) {
        results.Currency[itemName] = {
          itemName: itemName,
          proper: itemName,
          dataByIngestionDate: [{
            date: price.timeRange.end,
            trueDate: price.timeRange.end,
            numListings: price.sampleCount,
            price: price.medianPrice,
          }],
        };
      }
    });

    // Fetch uber item prices - use STASH_API_MAP to determine which items belong to Ubers category
    const uberKeys = Object.keys(STASH_API_MAP.Ubers);
    const uberItems = uberKeys
      .map(key => STASH_TO_API_MAP[key]?.baseCode)
      .filter((baseCode): baseCode is string => !!baseCode)
      .map(baseCode => ({ baseCode }));
    
    const uberPrices = await fetchMultipleItemPrices(uberItems, config);

    uberPrices.forEach((price) => {
      const itemName = price.itemName;
      if (itemName) {
        results.Ubers[itemName] = {
          itemName: itemName,
          proper: itemName,
          dataByIngestionDate: [{
            date: price.timeRange.end,
            trueDate: price.timeRange.end,
            numListings: price.sampleCount,
            price: price.medianPrice,
          }],
        };
      }
    });

  } catch (error) {
    console.error('Error fetching economy data from API:', error);
    // Return empty data on error - will fall back to fixed prices
  }

  return results;
}

export function getLatestRuneData(runeData: Record<string, ItemData>, runeName: string) {
  const data = runeData[runeName];
  if (!data || !data.dataByIngestionDate.length) return null;
  return data.dataByIngestionDate[data.dataByIngestionDate.length - 1];
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
  'El Rune', 'Eld Rune', 'Tir Rune', 'Nef Rune', 'Eth Rune', 'Ith Rune',
  'Tal Rune', 'Ral Rune', 'Ort Rune', 'Thul Rune', 'Amn Rune', 'Sol Rune',
  'Shael Rune', 'Dol Rune', 'Hel Rune', 'Io Rune', 'Lum Rune', 'Ko Rune',
  'Fal Rune', 'Lem Rune', 'Pul Rune', 'Um Rune', 'Mal Rune', 'Ist Rune',
  'Gul Rune', 'Vex Rune'
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
    if (!runeValues.find(r => r.name === runeName)) {
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
    if (!runeValues.find(r => r.name === runeName) && !FIXED_RUNE_PRICES[runeName]) {
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

export function calculateEconomyValues(input: EconomyData): EconomyValue {
  const economyValues: EconomyValue = {
    Runes: [],
    Currency: [],
    Ubers: [],
  };

  // --- Handle Runes ---
  const runeValues: ItemValue[] = [];
  const MIN_LISTINGS_FOR_API_PRICE = 10; // Minimum listings to trust API price

  // Low runes that should always use fixed prices (they don't change much)
  const LOW_RUNES = [
    'El Rune', 'Eld Rune', 'Tir Rune', 'Nef Rune', 'Eth Rune', 'Ith Rune',
    'Tal Rune', 'Ral Rune', 'Ort Rune', 'Thul Rune', 'Amn Rune', 'Sol Rune',
    'Shael Rune', 'Dol Rune', 'Hel Rune', 'Io Rune', 'Lum Rune', 'Ko Rune',
    'Fal Rune', 'Lem Rune', 'Pul Rune', 'Um Rune', 'Mal Rune', 'Ist Rune',
    'Gul Rune', 'Vex Rune'
  ];

  // First, add runes from API data (prioritize API prices)
  Object.entries(input.Runes).forEach(([name, data]) => {
    const isLowRune = LOW_RUNES.includes(name);
    const latestData = getLatestRuneData(input.Runes, name);
    
    // Low runes always use fixed prices
    if (isLowRune) {
      const fixedPrice = FIXED_RUNE_PRICES[name] || ALL_RUNE_HR_VALUES[name];
      if (fixedPrice) {
        runeValues.push({
          name,
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
          name,
          price: latestData.price,
          numListings: numListings,
          isCalculated: false,
          isFixed: false,
        });
      } else {
        // Not enough listings, use fixed price as fallback
        const fixedPrice = FIXED_RUNE_PRICES[name] || ALL_RUNE_HR_VALUES[name];
        if (fixedPrice) {
          runeValues.push({
            name,
            price: fixedPrice,
            numListings: numListings,
            isCalculated: false,
            isFixed: true,
          });
        }
      }
    } else {
      // No API data, use fixed price
      const fixedPrice = FIXED_RUNE_PRICES[name] || ALL_RUNE_HR_VALUES[name];
      if (fixedPrice) {
        runeValues.push({
          name,
          price: fixedPrice,
          numListings: -1,
          isCalculated: false,
          isFixed: true,
        });
      }
    }
  });

  // Add fixed prices for runes not in API data
  Object.entries(FIXED_RUNE_PRICES).forEach(([name, fixedPrice]) => {
    if (!runeValues.find(r => r.name === name)) {
      runeValues.push({
        name,
        price: fixedPrice,
        numListings: -1,
        isCalculated: false,
        isFixed: true,
      });
    }
  });

  // Add all runes from ALL_RUNE_HR_VALUES that aren't already added
  Object.entries(ALL_RUNE_HR_VALUES).forEach(([name, hrValue]) => {
    if (!runeValues.find(r => r.name === name) && !FIXED_RUNE_PRICES[name]) {
      runeValues.push({
        name,
        price: hrValue,
        numListings: -1,
        isCalculated: false,
        isFixed: true,
      });
    }
  });

  economyValues.Runes = runeValues.sort((a, b) => b.price - a.price);

  // --- Handle Currency ---
  const currencyValues: ItemValue[] = [];
  Object.entries(input.Currency).forEach(([name, data]) => {
    const latestData = data.dataByIngestionDate[data.dataByIngestionDate.length - 1];
    if (latestData && latestData.price > 0) {
      currencyValues.push({
        name,
        price: latestData.price,
        numListings: latestData.numListings,
        isCalculated: true,
        isFixed: false,
      });
    }
  });
  economyValues.Currency = currencyValues.sort((a, b) => b.price - a.price);

  // --- Handle Ubers ---
  const uberValues: ItemValue[] = [];
  Object.entries(input.Ubers).forEach(([name, data]) => {
    const latestData = data.dataByIngestionDate[data.dataByIngestionDate.length - 1];
    if (latestData && latestData.price > 0) {
      uberValues.push({
        name,
        price: latestData.price,
        numListings: latestData.numListings,
        isCalculated: true,
        isFixed: false,
      });
    }
  });
  economyValues.Ubers = uberValues.sort((a, b) => b.price - a.price);

  return economyValues;
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