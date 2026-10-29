import type { NetWorthCategory } from '@/lib/networth-api';
import { currentLocale, t } from '@/i18n';

/** Display name of a net worth category in the active UI language. */
export function categoryLabel(category: NetWorthCategory): string {
  switch (category) {
    case 'runes':
      return t('currency:categories.runes');
    case 'currency':
      return t('currency:categories.currency');
    case 'ubers':
      return t('currency:categories.ubers');
    case 'gems':
      return t('currency:categories.gems');
    case 'mats':
      return t('currency:categories.mats');
    case 'uniques':
      return t('currency:categories.uniques');
    case 'sets':
      return t('currency:categories.sets');
    default:
      return t('currency:categories.other');
  }
}

/** Theme tokens (usable in CSS and SVG fill/stroke), so every theme gets matching category colours. */
export const CATEGORY_COLORS: Record<NetWorthCategory, string> = {
  runes: 'var(--chart-1)',
  currency: 'var(--chart-2)',
  ubers: 'var(--chart-3)',
  gems: 'var(--chart-4)',
  mats: 'var(--chart-5)',
  uniques: 'var(--q-unique)',
  sets: 'var(--q-set)',
  other: 'var(--muted-foreground)',
};

/** D2 item-quality text colour for a holding name (uniques gold, sets green, runes orange). */
export const CATEGORY_NAME_CLASS: Partial<Record<NetWorthCategory, string>> = {
  uniques: 'text-q-unique',
  sets: 'text-q-set',
  runes: 'text-q-rune',
};

/** 24-hour clock time in the UI locale, e.g. "14:05". */
export function formatClock(time: number | string): string {
  return new Date(time).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** Short weekday in the UI locale, e.g. "Mon". */
export function formatWeekday(time: number | string): string {
  return new Date(time).toLocaleDateString(currentLocale(), { weekday: 'short' });
}

/** Short month and day in the UI locale, e.g. "Oct 18". */
export function formatMonthDay(time: number | string): string {
  return new Date(time).toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric' });
}

/** Snapshot timestamp, e.g. "Oct 18 14:05". */
export function formatStamp(time: number | string): string {
  return `${formatMonthDay(time)} ${formatClock(time)}`;
}

/** HR with sign, e.g. "+1.20 HR" / "−0.40 HR". */
export function formatSignedHr(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${Math.abs(value).toFixed(2)} HR`;
}

/** Unit prices: low runes are fractions of a cent of HR, so keep extra precision below 0.01. */
export function formatUnitPrice(value: number | null): string {
  if (value === null) return '—';
  return value > 0 && value < 0.01 ? value.toFixed(4) : value.toFixed(2);
}
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}m`;
}

export function deltaClass(value: number | null | undefined): string {
  if (!value) return 'text-muted-foreground';
  return value > 0 ? 'text-success' : 'text-destructive';
}

/** Tinted pill classes for a signed change (gain / loss / flat). */
export function deltaPillClass(value: number | null | undefined): string {
  if (!value) return 'bg-muted/60 text-muted-foreground';
  return value > 0 ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive';
}
