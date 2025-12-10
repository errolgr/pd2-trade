/**
 * Service to fetch prices from the PD2 Price Crawler API
 */

const API_BASE_URL = 'https://pd2trader.com';

export interface AveragePriceResponse {
  typeCode: string;
  baseCode: string;
  itemName: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
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
}

/**
 * Fetch average price for a specific item (by baseCode only)
 */
export async function fetchItemPrice(
  baseCode: string,
  config: PriceApiConfig = {}
): Promise<AveragePriceResponse | null> {
  try {
    const params = new URLSearchParams({
      baseCode,
      ...(config.isLadder !== undefined && { isLadder: config.isLadder.toString() }),
      ...(config.isHardcore !== undefined && { isHardcore: config.isHardcore.toString() }),
      ...(config.hours !== undefined && { hours: config.hours.toString() }),
    });

    const response = await fetch(`${API_BASE_URL}/item-prices/average?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No data found
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching price for ${baseCode}:`, error);
    return null;
  }
}

/**
 * Fetch average prices for multiple items in a single batch request (by baseCode only)
 */
export async function fetchMultipleItemPrices(
  items: Array<{ baseCode: string }>,
  config: PriceApiConfig = {}
): Promise<Map<string, AveragePriceResponse>> {
  const results = new Map<string, AveragePriceResponse>();
  
  if (items.length === 0) {
    return results;
  }

  try {
    // Extract baseCodes
    const baseCodes = items.map(item => item.baseCode);

    // Make a single batch request
    const requestBody = {
      baseCodes,
      ...(config.isLadder !== undefined && { isLadder: config.isLadder }),
      ...(config.isHardcore !== undefined && { isHardcore: config.isHardcore }),
      ...(config.hours !== undefined && { hours: config.hours }),
    };

    const response = await fetch(`${API_BASE_URL}/item-prices/average/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const batchResponse = await response.json();
    
    // Map results by baseCode
    if (batchResponse.data && Array.isArray(batchResponse.data)) {
      batchResponse.data.forEach((price: AveragePriceResponse) => {
        results.set(price.baseCode, price);
      });
    }
  } catch (error) {
    console.error(`Error fetching batch prices:`, error);
    // Don't fallback to individual requests to avoid N+1 problem
    // Return empty results instead - the calling code should handle missing data
  }

  return results;
}

