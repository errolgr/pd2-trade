import type { NetWorthCategory } from '@/lib/networth-api';

export const CATEGORY_LABELS: Record<NetWorthCategory, string> = {
  runes: 'Runes',
  currency: 'Currency',
  ubers: 'Uber Mats',
  gems: 'Gems',
  mats: 'Mats',
  uniques: 'Uniques',
  sets: 'Sets',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<NetWorthCategory, string> = {
  runes: 'var(--chart-1)',
  currency: 'var(--chart-2)',
  ubers: 'var(--chart-3)',
  gems: 'var(--chart-4)',
  mats: 'var(--chart-5)',
  uniques: 'hsl(45 85% 55%)',
  sets: 'hsl(120 50% 45%)',
  other: 'hsl(220 9% 46%)',
};

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
  return value > 0 ? 'text-emerald-400' : 'text-red-400';
}
