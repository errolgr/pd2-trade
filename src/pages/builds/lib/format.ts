import { classPortraitUrl as dsClassPortraitUrl, D2_CLASSES, formatHrAmount, toD2Class } from '@pd2-trader/ui';
import { t, currentLocale } from '@/i18n';

/** Class metadata, asset URLs and number/time formatting for the builds panel (ported from pd2trader.com /builds). */

const SITE = 'https://pd2trader.com';

export interface ClassMeta {
  name: string;
  /** Class accent: the `class-*` token (same on every theme, like the website). */
  color: string;
}

export const CLASS_META: ClassMeta[] = D2_CLASSES.map((id) => ({
  name: id.charAt(0).toUpperCase() + id.slice(1),
  color: `var(--color-class-${id})`,
}));

export function classMeta(name: string | null | undefined): ClassMeta & { known: boolean } {
  const id = toD2Class(name);
  const meta = id && CLASS_META[D2_CLASSES.indexOf(id)];
  return meta
    ? { ...meta, known: true }
    : { name: name || 'Unknown', color: 'var(--color-muted-foreground)', known: false };
}

/** Portrait art on pd2trader.com for ClassIcon / CharacterCard; null (lettered tile) for unknown classes. */
export function classPortraitUrl(className: string | null | undefined): string | null {
  const id = toD2Class(className);
  return id ? dsClassPortraitUrl(id, SITE) : null;
}

// Skill names whose icon file is named differently (pd2trader.com buildsShared.jsx).
const SKILL_ICON_ALIASES: Record<string, string> = {
  one_hand_mastery: 'one_handed_mastery',
  two_hand_mastery: 'two_handed_mastery',
  berserker: 'berserk',
  enchant: 'enchant_fire',
};

export function skillIconUrl(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `${SITE}/assets/skills/${SKILL_ICON_ALIASES[slug] ?? slug}.webp`;
}

export const characterSiteUrl = (name: string) => `${SITE}/character/${encodeURIComponent(name)}`;

/** Two-letter tile text for a missing icon: "Blessed Hammer" → BH. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(of|the|and)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** HR in the DS precision (formatHrAmount: 0.04, 1.30, 27.5, 1.2k); '—' when unknown. */
export function fmtHr(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : formatHrAmount(v);
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (v === 0) return '0%';
  return v >= 10 ? `${v.toFixed(0)}%` : `${v.toFixed(1)}%`;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 90) return t('common:time.justNow');
  if (s < 3600) return t('common:time.minutesAgoShort', { count: Math.round(s / 60) });
  if (s < 86400) return t('common:time.hoursAgoShort', { count: Math.round(s / 3600) });
  return t('common:time.daysAgoShort', { count: Math.round(s / 86400) });
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(currentLocale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Label for an item key the usage lists don't name: 'rw:call_to_arms' → Call To Arms. */
export function keyLabel(key: string): string {
  const parts = key.split(':');
  const raw = parts.length > 1 ? parts[1] : parts[0];
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Skill filters are `Name` or `Name:N` (N+ hard points); the usage lists add `Name:20`. */
export const SKILL_MAX_POINTS = 20;
export const skillFilter = (name: string) => `${name}:${SKILL_MAX_POINTS}`;
export function skillLabel(value: string): string {
  const m = value.match(/^(.*):(\d+)$/);
  return m ? `${m[1]} ${m[2]}+` : value;
}
