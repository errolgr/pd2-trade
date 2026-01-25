import { formatHr } from './utils';
import { AveragePriceResponse } from '@/pages/currency/lib/price-api';

/**
 * Formats price data in a compact format: "~X HR (N samples)"
 * Returns "No price data" if price data is null/undefined
 */
export function formatCompactPrice(priceData: AveragePriceResponse | null | undefined): string {
  if (!priceData) {
    return 'No price data';
  }

  const price = priceData.medianPrice ?? priceData.averagePrice ?? 0;
  const sampleCount = priceData.sampleCount ?? 0;

  if (price === 0 || sampleCount === 0) {
    return 'No price data';
  }

  const formattedPrice = formatHr(price);
  return `~${formattedPrice} (${sampleCount} samples)`;
}
