/**
 * Service to fetch prices from the PD2 Price Crawler API
 */

import { reportApiError } from '@/lib/error-reporting';

const API_BASE_URL = 'https://pd2trader.com';

export interface AveragePriceResponse {
  typeCode: string;
  baseCode: string;
  itemName: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  movingAverage7Days: number;
  trimmedMean7Days: number;
  lastDayPrice: number;
  sampleCount: number;
  hourlyVolumeAverage: number;
  priceChange7Days?: {
    change: number;
    changePercent: number;
    previousMedianPrice: number;
  };
  isLadder: boolean;
  isHardcore: boolean;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface PriceApiConfig {
  isLadder?: boolean;
  isHardcore?: boolean;
  hours?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch average price for a specific item (by baseCode only)
 */
export async function fetchItemPrice(
  baseCode: string,
  config: PriceApiConfig = {},
): Promise<AveragePriceResponse | null> {
  try {
    const params = new URLSearchParams({
      baseCode,
      ...(config.isLadder !== undefined && { isLadder: config.isLadder.toString() }),
      ...(config.isHardcore !== undefined && { isHardcore: config.isHardcore.toString() }),
      ...(config.startDate !== undefined && { startDate: config.startDate }),
      ...(config.endDate !== undefined && { endDate: config.endDate }),
      ...(!config.startDate && !config.endDate && config.hours !== undefined && { hours: config.hours.toString() }),
    });

    const response = await fetch(`${API_BASE_URL}/item-prices/average?${params}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No data found
      }
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      reportApiError(error, 'price-api', 'item-prices/average', response.status, {
        baseCode,
      });
      return null;
    }

    return await response.json();
  } catch (error) {
    const apiError = error instanceof Error ? error : new Error(String(error));
    reportApiError(apiError, 'price-api', 'item-prices/average', undefined, {
      baseCode,
    });
    return null;
  }
}

/**
 * Fetch average price for a specific item by itemName (for unique items)
 */
export async function fetchItemPriceByName(
  itemName: string,
  config: PriceApiConfig = {},
): Promise<AveragePriceResponse | null> {
  try {
    const params = new URLSearchParams({
      itemName,
      ...(config.isLadder !== undefined && { isLadder: config.isLadder.toString() }),
      ...(config.isHardcore !== undefined && { isHardcore: config.isHardcore.toString() }),
      ...(config.startDate !== undefined && { startDate: config.startDate }),
      ...(config.endDate !== undefined && { endDate: config.endDate }),
      ...(!config.startDate && !config.endDate && config.hours !== undefined && { hours: config.hours.toString() }),
    });

    const url = `${API_BASE_URL}/item-prices/average?${params}`;
    console.log('[fetchItemPriceByName] Fetching price data:', {
      itemName,
      config,
      url,
    });

    const response = await fetch(url);

    console.log('[fetchItemPriceByName] Response status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[fetchItemPriceByName] No price data found for:', itemName);
        return null; // No data found
      }
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      reportApiError(error, 'price-api', 'item-prices/average', response.status, {
        itemName,
      });
      return null;
    }

    const data = await response.json();
    console.log('[fetchItemPriceByName] Price data received:', {
      itemName: data.itemName,
      medianPrice: data.medianPrice,
      averagePrice: data.averagePrice,
      sampleCount: data.sampleCount,
    });

    return data;
  } catch (error) {
    const apiError = error instanceof Error ? error : new Error(String(error));
    reportApiError(apiError, 'price-api', 'item-prices/average', undefined, {
      itemName,
    });
    return null;
  }
}

/**
 * Fetch average prices for multiple items in a single batch request (by baseCode only)
 */
export async function fetchMultipleItemPrices(
  items: Array<{ baseCode: string }>,
  config: PriceApiConfig = {},
): Promise<Map<string, AveragePriceResponse>> {
  const results = new Map<string, AveragePriceResponse>();

  if (items.length === 0) {
    return results;
  }

  try {
    // Extract baseCodes
    const baseCodes = items.map((item) => item.baseCode);

    // Make a single batch request
    const requestBody = {
      baseCodes,
      ...(config.isLadder !== undefined && { isLadder: config.isLadder }),
      ...(config.isHardcore !== undefined && { isHardcore: config.isHardcore }),
      ...(config.startDate !== undefined && { startDate: config.startDate }),
      ...(config.endDate !== undefined && { endDate: config.endDate }),
      ...(!config.startDate && !config.endDate && config.hours !== undefined && { hours: config.hours }),
    };

    const response = await fetch(`${API_BASE_URL}/item-prices/average/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      reportApiError(error, 'price-api', 'item-prices/average/batch', response.status);
      return results;
    }

    const batchResponse = await response.json();

    // Map results by baseCode
    if (batchResponse.data && Array.isArray(batchResponse.data)) {
      batchResponse.data.forEach((price: AveragePriceResponse) => {
        results.set(price.baseCode, price);
      });
    }
  } catch (error) {
    const apiError = error instanceof Error ? error : new Error(String(error));
    reportApiError(apiError, 'price-api', 'item-prices/average/batch');
    // Don't fallback to individual requests to avoid N+1 problem
    // Return empty results instead - the calling code should handle missing data
  }

  return results;
}

export interface SocketPrice {
  socketCount: number;
  averagePrice: number;
  medianPrice: number;
  sampleCount: number;
}

export interface CorruptionPrice {
  corruptionKey: string[];
  corruptionName: string;
  averagePrice: number;
  medianPrice: number;
  sampleCount: number;
  socketPrices?: SocketPrice[];
}

export interface CorruptionPricesResponse {
  typeCode: string;
  baseCode: string;
  itemName: string;
  corruptionPrices: CorruptionPrice[];
}

/**
 * Fetch corruption prices for a unique item by itemName or baseCode
 */
export async function fetchCorruptionPrices(
  params: { itemName?: string; baseCode?: string },
  config: PriceApiConfig = {},
): Promise<CorruptionPricesResponse | null> {
  try {
    const queryParams = new URLSearchParams({
      ...(params.itemName && { itemName: params.itemName }),
      ...(params.baseCode && { baseCode: params.baseCode }),
      ...(config.isLadder !== undefined && { isLadder: config.isLadder.toString() }),
      ...(config.isHardcore !== undefined && { isHardcore: config.isHardcore.toString() }),
      ...(config.startDate !== undefined && { startDate: config.startDate }),
      ...(config.endDate !== undefined && { endDate: config.endDate }),
      ...(!config.startDate && !config.endDate && config.hours !== undefined && { hours: config.hours.toString() }),
    });

    const url = `${API_BASE_URL}/item-prices/corruption-prices?${queryParams}`;
    console.log('[fetchCorruptionPrices] Fetching corruption prices:', {
      params,
      config,
      url,
    });

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[fetchCorruptionPrices] No corruption price data found for:', params);
        return null;
      }
      const error = new Error(`API error: ${response.status} ${response.statusText}`);
      reportApiError(error, 'price-api', 'item-prices/corruption-prices', response.status, {
        ...params,
      });
      return null;
    }

    const data = await response.json();
    console.log('[fetchCorruptionPrices] Corruption prices received:', {
      itemName: data.itemName,
      corruptionCount: data.corruptionPrices?.length || 0,
    });

    return data;
  } catch (error) {
    const apiError = error instanceof Error ? error : new Error(String(error));
    reportApiError(apiError, 'price-api', 'item-prices/corruption-prices', undefined, {
      ...params,
    });
    return null;
  }
}
