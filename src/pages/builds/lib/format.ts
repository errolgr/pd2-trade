/** Class metadata, asset URLs and number/time formatting for the builds panel (ported from pd2trader.com /builds). */

const SITE = 'https://pd2trader.com';

export interface ClassMeta {
  name: string;
  short: string;
  /** Class accent (same on every theme, like the website). */
  color: string;
}

export const CLASS_META: ClassMeta[] = [
  { name: 'Amazon', short: 'Ama', color: '#e0b04f' },
  { name: 'Assassin', short: 'Sin', color: '#a78bfa' },
  { name: 'Barbarian', short: 'Barb', color: '#ea7a3b' },
  { name: 'Druid', short: 'Druid', color: '#7cbf4a' },
  { name: 'Necromancer', short: 'Necro', color: '#2dd4bf' },
  { name: 'Paladin', short: 'Pala', color: '#60a5fa' },
  { name: 'Sorceress', short: 'Sorc', color: '#f05d5d' },
];

const CLASS_BY_NAME = new Map(CLASS_META.map((c) => [c.name.toLowerCase(), c]));

export function classMeta(name: string | null | undefined): ClassMeta & { known: boolean } {
  const meta = CLASS_BY_NAME.get(String(name ?? '').toLowerCase());
  return meta ? { ...meta, known: true } : { name: name || 'Unknown', short: '?', color: '#808080', known: false };
}

export const classPortraitUrl = (className: string) => `${SITE}/assets/classes/${className.toLowerCase()}.webp`;

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

/** HR with precision that suits the size: 0.04, 1.30, 27.5, 1.2k. */
export function fmtHr(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return v.toFixed(0);
  if (v >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  if (v === 0) return '0%';
  return v >= 10 ? `${v.toFixed(0)}%` : `${v.toFixed(1)}%`;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—';
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

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

/** Text colour class for a PD2 quality name (runewords and runes in the rune colour). */
export function qualityText(quality: string | null | undefined, runeword = false): string {
  if (runeword || quality === 'Runeword') return 'text-q-rune';
  switch (quality) {
    case 'Unique':
      return 'text-q-unique';
    case 'Set':
      return 'text-q-set';
    case 'Rare':
      return 'text-q-rare';
    case 'Crafted':
      return 'text-q-crafted';
    case 'Magic':
      return 'text-q-magic';
    case null:
    case undefined:
      return 'text-q-rune';
    default:
      return 'text-q-normal';
  }
}

/** Border colour class matching qualityText. */
export function qualityBorder(quality: string | null | undefined, runeword = false): string {
  if (runeword || quality === 'Runeword') return 'border-q-rune/50';
  switch (quality) {
    case 'Unique':
      return 'border-q-unique/50';
    case 'Set':
      return 'border-q-set/50';
    case 'Rare':
      return 'border-q-rare/45';
    case 'Crafted':
      return 'border-q-crafted/45';
    case 'Magic':
      return 'border-q-magic/45';
    default:
      return 'border-border';
  }
}
