import type { ChatMessage } from '@pd2-trader/plugin-sdk';

export interface AlertSettings {
  keywords: string[];
  minPriceHr: number;
  notify: boolean;
}

export function parseSettings(values: Record<string, unknown>): AlertSettings {
  const keywords = typeof values.keywords === 'string' ? values.keywords : '';
  const min = Number(values.minPriceHr);
  return {
    keywords: keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
    minPriceHr: Number.isFinite(min) && min > 0 ? min : 0,
    notify: values.notify !== false,
  };
}

/** "2 hr", "1.5HR", "3 hrs" → HR amount; null when the text names no HR price. */
export function parsePriceHr(text: string): number | null {
  const match = /(\d+(?:[.,]\d+)?)\s*hrs?\b/i.exec(text);
  return match ? Number(match[1].replace(',', '.')) : null;
}

/** The keyword an incoming message matches, or null. A parseable price below the minimum never matches. */
export function matchMessage(message: ChatMessage, settings: AlertSettings): string | null {
  if (message.direction !== 'in' || !settings.keywords.length) return null;
  const haystack = `${message.text} ${message.itemName ?? ''}`.toLowerCase();
  const keyword = settings.keywords.find((k) => haystack.includes(k));
  if (!keyword) return null;
  if (settings.minPriceHr > 0) {
    const price = parsePriceHr(message.priceText ?? '') ?? parsePriceHr(message.text);
    if (price !== null && price < settings.minPriceHr) return null;
  }
  return keyword;
}
