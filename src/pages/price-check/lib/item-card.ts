import type { AveragePriceResponse } from '@/pages/currency/lib/price-api';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { AppraisedStat, RareAppraisal } from '@/lib/rare-appraisal-api';
import { bandRange, rankText, SLOT_PLURALS, VERDICT_LABELS } from '@/components/rares/rares-format';
import type { Item } from './interfaces';
import { tooltipLines, type TooltipColor, type TooltipLine, type TooltipLines } from './tooltip-lines';

/** One price fact under the tooltip, e.g. "7-day avg · 3.25 HR". */
export interface ItemCardPrice {
  label: string;
  value: string;
  detail?: string;
  /** Verdict rows draw the label as a coloured badge. */
  tone?: 'keep' | 'check' | 'vendor';
}

export interface ItemCard {
  tooltip: TooltipLines;
  /** Appraisal stars per stat line (index into `tooltip.stats`). */
  stars?: ReadonlyMap<number, number>;
  prices: ItemCardPrice[];
  /** Right side of the footer, e.g. "Alliance (S14) · Softcore Ladder · Oct 23, 2026". */
  context: string;
}

export interface ItemCardInput {
  item: Item;
  /** Unique/set market price and the label of the basis it is shown on ("7-day avg", "7-day avg (S13)"). */
  average?: { data: AveragePriceResponse; headline: number; basis: string } | null;
  appraisal?: RareAppraisal | null;
  /** Appraised stat per price check row key (matchRareStats). */
  rareStats?: ReadonlyMap<string, AppraisedStat>;
  /** Current market search results, when a search ran. */
  listings?: { entries: MarketListingEntry[]; total: number; archived: boolean } | null;
  context: string;
}

const hr = (n: number) => `${n >= 10 ? n.toFixed(1) : n.toFixed(2)} HR`;

/** Price check state → what the shared image shows. */
export function buildItemCard({ item, average, appraisal, rareStats, listings, context }: ItemCardInput): ItemCard {
  const tooltip = tooltipLines(item);
  const stars = new Map<number, number>();
  if (rareStats?.size) {
    tooltip.stats.forEach((line, i) => {
      const best = Math.max(0, ...line.keys.map((k) => rareStats.get(k)?.stars ?? 0));
      if (best) stars.set(i, best);
    });
  }

  const prices: ItemCardPrice[] = [];
  if (average) {
    const { data } = average;
    const change = data.priceChange7Days;
    const detail = [
      `median ${hr(data.medianPrice)}`,
      `${data.sampleCount} sales`,
      change ? `${change.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(change.changePercent).toFixed(0)}% 7d` : null,
    ].filter(Boolean);
    prices.push({ label: average.basis, value: hr(average.headline), detail: detail.join(' · ') });
  }
  if (appraisal) {
    const slots = (SLOT_PLURALS[appraisal.slot] ?? 'items').toLowerCase();
    prices.push({
      label: VERDICT_LABELS[appraisal.verdict],
      tone: appraisal.verdict,
      value: `${rankText(appraisal.rank)} of ${slots}`,
      detail: appraisal.market
        ? `usually listed ${bandRange(appraisal.market.lowHr, appraisal.market.highHr)} HR`
        : undefined,
    });
  }
  const priced = (listings?.entries ?? [])
    .map((l) => (listings?.archived ? (l.sell_hr_price ?? l.hr_price) : l.hr_price))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (listings && priced.length) {
    const median = priced[Math.floor(priced.length / 2)];
    const count = Math.max(listings.total, priced.length);
    prices.push({
      label: listings.archived ? 'Recently sold' : 'Listed now',
      value: `from ${hr(priced[0])}`,
      detail: `${count} ${listings.archived ? 'sold' : count === 1 ? 'listing' : 'listings'} · median ${hr(median)}`,
    });
  }

  return { tooltip, stars, prices, context };
}

/** D2 tooltip palette. */
const COLORS: Record<TooltipColor, string> = {
  white: '#e6e6e6',
  gray: '#8a8a8a',
  magic: '#7878ff',
  rare: '#ffff64',
  set: '#00e000',
  unique: '#c7b377',
  crafted: '#ffa800',
  corrupted: '#ff5050',
};
const TONES: Record<NonNullable<ItemCardPrice['tone']>, string> = {
  keep: '#4ade80',
  check: '#facc15',
  vendor: '#f87171',
};
const GOLD = '#c7b377';
const MUTED = '#8a8a8a';
const BACKGROUND = '#0a0a0a';
const BORDER = '#3b3428';
const STAR = '★';

const FONT = 'DiabloFont';
const UI_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const TITLE_SIZE = 18;
const LINE_SIZE = 15;
const LINE_HEIGHT = 20;
const PAD_X = 22;
const PAD_Y = 16;
const MIN_WIDTH = 300;
const MAX_WIDTH = 440;
const LOGO_SIZE = 16;
const BRAND = 'PD2 Trader';
const CONTEXT_FONT = `400 10px ${UI_FONT}`;

const font = (size: number, family = FONT) => `${size}px ${family}, ${UI_FONT}`;

/** Greedy word wrap to `width` (a single overlong word stays on its own line). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

interface Row {
  lines: string[];
  color: string;
  size: number;
  stars: number;
}

/** A piece of a tooltip line drawn in one font and colour. */
interface Run {
  text: string;
  font: string;
  color: string;
}

/**
 * Tooltip line → runs. DiabloFont (AvQest) draws "+" as a star-like glyph, so plus signs use the UI font;
 * appraisal stars follow in gold.
 */
function lineRuns(text: string, size: number, color: string, stars = 0): Run[] {
  const runs: Run[] = text
    .split(/(\+)/)
    .filter(Boolean)
    .map((part) => ({ text: part, font: part === '+' ? `600 ${size}px ${UI_FONT}` : font(size), color }));
  if (stars) runs.push({ text: ` ${STAR.repeat(stars)}`, font: `${size - 1}px ${UI_FONT}`, color: GOLD });
  return runs;
}

function runsWidth(ctx: CanvasRenderingContext2D, runs: Run[]): number {
  let w = 0;
  for (const run of runs) {
    ctx.font = run.font;
    w += ctx.measureText(run.text).width;
  }
  return w;
}

/**
 * Draws the item as a PD2-style tooltip with the price check underneath and returns it as a PNG.
 * `scale` is the device pixel ratio of the image (2 = crisp on HiDPI and after Discord's downscale).
 */
export async function renderItemCard(card: ItemCard, scale = 2): Promise<Blob> {
  await Promise.all([
    document.fonts.load(font(TITLE_SIZE)),
    document.fonts.load(font(LINE_SIZE)),
  ]).catch(() => undefined);
  const logo = await loadImage('/logo2.png');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');

  // Measure: widest tooltip line decides the width (clamped), long lines wrap.
  const { tooltip } = card;
  const stars = card.stars ?? new Map<number, number>();
  const sized: Array<{ line: TooltipLine; size: number; stars: number }> = [
    ...tooltip.title.map((line) => ({ line, size: TITLE_SIZE, stars: 0 })),
    ...tooltip.base.map((line) => ({ line, size: LINE_SIZE, stars: 0 })),
    ...tooltip.stats.map((line, i) => ({ line, size: LINE_SIZE, stars: stars.get(i) ?? 0 })),
    ...tooltip.footer.map((line) => ({ line, size: LINE_SIZE, stars: 0 })),
  ];
  let contentWidth = MIN_WIDTH - PAD_X * 2;
  for (const s of sized) {
    const w = runsWidth(ctx, lineRuns(s.line.text, s.size, '', s.stars));
    contentWidth = Math.max(contentWidth, w);
  }
  // Footer: logo + brand + context on one line.
  ctx.font = font(13);
  const brandWidth = LOGO_SIZE + 6 + ctx.measureText(BRAND).width;
  ctx.font = CONTEXT_FONT;
  contentWidth = Math.max(contentWidth, brandWidth + 16 + ctx.measureText(card.context).width);
  contentWidth = Math.min(Math.ceil(contentWidth), MAX_WIDTH - PAD_X * 2);
  const width = contentWidth + PAD_X * 2;

  const rows: Array<Row | 'gap'> = sized.map(({ line, size, stars: rowStars }) => {
    const starWidth = rowStars ? runsWidth(ctx, lineRuns('', size, '', rowStars)) : 0;
    ctx.font = font(size);
    return { lines: wrap(ctx, line.text, contentWidth - starWidth), color: COLORS[line.color], size, stars: rowStars };
  });
  // D2 leaves no gaps; one small gap after the title block reads better at share size.
  if (tooltip.title.length && rows.length > tooltip.title.length) rows.splice(tooltip.title.length, 0, 'gap');
  const GAP = 6;
  const lineHeight = (size: number) => (size === TITLE_SIZE ? 23 : LINE_HEIGHT);
  const tooltipHeight = rows.reduce((h, r) => h + (r === 'gap' ? GAP : r.lines.length * lineHeight(r.size)), 0);

  // Price rows: label left, value right, optional detail line below.
  const PRICE_ROW = 22;
  const DETAIL_ROW = 16;
  const pricesHeight = card.prices.reduce((h, p) => h + PRICE_ROW + (p.detail ? DETAIL_ROW : 0), 0) + (card.prices.length ? 6 : 0);
  const FOOTER = 30;
  const height = PAD_Y + tooltipHeight + PAD_Y + (card.prices.length ? pricesHeight + 12 : 0) + FOOTER;

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  // Panel
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Tooltip, centred like in game
  let y = PAD_Y;
  ctx.textAlign = 'left';
  for (const row of rows) {
    if (row === 'gap') {
      y += GAP;
      continue;
    }
    const lh = lineHeight(row.size);
    row.lines.forEach((text, i) => {
      y += lh;
      const baseline = y - (lh - row.size) / 2 - 2;
      const runs = lineRuns(text, row.size, row.color, i === row.lines.length - 1 ? row.stars : 0);
      let x = width / 2 - runsWidth(ctx, runs) / 2;
      for (const run of runs) {
        ctx.font = run.font;
        ctx.fillStyle = run.color;
        ctx.fillText(run.text, x, baseline);
        x += ctx.measureText(run.text).width;
      }
    });
  }
  y += PAD_Y;

  // Price section
  const divider = (at: number) => {
    const g = ctx.createLinearGradient(PAD_X, 0, width - PAD_X, 0);
    g.addColorStop(0, 'rgba(199,179,119,0)');
    g.addColorStop(0.5, 'rgba(199,179,119,0.55)');
    g.addColorStop(1, 'rgba(199,179,119,0)');
    ctx.fillStyle = g;
    ctx.fillRect(PAD_X, at, width - PAD_X * 2, 1);
  };
  if (card.prices.length) {
    divider(y);
    y += 12;
    for (const price of card.prices) {
      const mid = y + PRICE_ROW / 2;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      if (price.tone) {
        ctx.font = `600 11px ${UI_FONT}`;
        const label = price.label.toUpperCase();
        const w = ctx.measureText(label).width + 16;
        const color = TONES[price.tone];
        ctx.fillStyle = `${color}22`;
        ctx.strokeStyle = `${color}88`;
        ctx.beginPath();
        ctx.roundRect(PAD_X, mid - 9, w, 18, 9);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(label, PAD_X + 8, mid + 0.5);
      } else {
        ctx.font = `500 12px ${UI_FONT}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(price.label, PAD_X, mid);
      }
      ctx.textAlign = 'right';
      ctx.font = `600 14px ${UI_FONT}`;
      ctx.fillStyle = '#f2f2f2';
      ctx.fillText(price.value, width - PAD_X, mid);
      y += PRICE_ROW;
      if (price.detail) {
        ctx.font = `400 11px ${UI_FONT}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(price.detail, width - PAD_X, y + DETAIL_ROW / 2 - 2);
        y += DETAIL_ROW;
      }
    }
    y += 6;
  }

  // Footer: brand left, context right
  divider(y);
  const footerMid = y + FOOTER / 2;
  ctx.textBaseline = 'middle';
  if (logo) ctx.drawImage(logo, PAD_X, footerMid - LOGO_SIZE / 2, LOGO_SIZE, LOGO_SIZE);
  ctx.textAlign = 'left';
  ctx.font = font(13);
  ctx.fillStyle = GOLD;
  ctx.fillText(BRAND, PAD_X + (logo ? LOGO_SIZE + 6 : 0), footerMid + 1);
  ctx.textAlign = 'right';
  ctx.font = CONTEXT_FONT;
  ctx.fillStyle = MUTED;
  // Only an over-wide card (MAX_WIDTH) can be too narrow for the context.
  const maxContext = contentWidth - brandWidth - 16;
  let context = card.context;
  while (context.length > 1 && ctx.measureText(context).width > maxContext) context = `${context.slice(0, -2)}…`;
  ctx.fillText(context, width - PAD_X, footerMid);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not encode the item image');
  return blob;
}
