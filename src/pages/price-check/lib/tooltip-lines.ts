import { modifiers } from '@/assets/modifiers';
import type { Item, Stat } from './interfaces';
import { StatId, statRemapByName } from './stat-mappings';

/** In-game tooltip colours (D2 palette). */
export type TooltipColor = 'white' | 'gray' | 'magic' | 'rare' | 'set' | 'unique' | 'crafted' | 'corrupted';

export interface TooltipLine {
  text: string;
  color: TooltipColor;
}

/** Clipboard stats rendered as the in-game tooltip, top to bottom. */
export interface TooltipLines {
  /** Name and base lines. */
  title: TooltipLine[];
  /** Defense, item level. */
  base: TooltipLine[];
  /** Magic properties. */
  stats: TooltipLine[];
  /** Ethereal / sockets / corrupted. */
  footer: TooltipLine[];
}

interface Description {
  function?: number;
  value?: number;
  label?: { positive?: string; secondary?: string };
}

const descriptions = new Map<number, Description>();
const descriptionsByLabel = new Map<string, Description>();
for (const m of modifiers as unknown as ReadonlyArray<{ id: number; description?: Description }>) {
  if (!m.description) continue;
  descriptions.set(m.id, m.description);
  const label = m.description.label?.positive;
  if (label && !descriptionsByLabel.has(label)) descriptionsByLabel.set(label, m.description);
}

const STAT = {
  maxEd: 17,
  minEd: 18,
  coldLength: 56,
  poisonMin: 57,
  poisonMax: 58,
  poisonLength: 59,
  classSkills: 83,
  evilForce: 159,
  skillTab: 188,
  charged: 204,
  corruptor: 361,
} as const;

/** Elemental min/max damage stat ids shown as one `Adds a-b <Element> Damage` line. */
const DAMAGE_PAIRS: Array<[number, number, string]> = [
  [48, 49, 'Fire'],
  [50, 51, 'Lightning'],
  [52, 53, 'Magic'],
  [54, 55, 'Cold'],
];
const RESIST_IDS = [39, 41, 43, 45];
const ATTRIBUTE_IDS = [0, 1, 2, 3];
/** Poison damage is stored per frame in 1/256 points; 25 frames per second. */
const POISON_FRAME_DIVISOR = 256;
const FRAMES_PER_SECOND = 25;

// PD2 colour codes (ÿc1 etc.) can leak into clipboard strings.
const COLOR_CODE_RE = /ÿc./g;
const clean = (text: unknown): string =>
  typeof text === 'string' ? text.replace(COLOR_CODE_RE, '').replace(/\s+/g, ' ').trim() : '';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const signed = (n: number) => (n < 0 ? `${n}` : `+${n}`);

/** "Martial Arts (Assassin)" → ["Martial Arts", "Assassin"]. */
function splitClass(skill: string): [string, string | null] {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(skill);
  return m ? [m[1], m[2]] : [skill, null];
}

/** ItemStatCost descfunc → the value as the tooltip prints it. */
function descValue(fn: number, n: number): string | null {
  switch (fn) {
    case 1:
    case 6:
    case 12:
    case 13:
      return signed(n);
    case 2:
    case 7:
    case 18:
      return `${n}%`;
    case 3:
    case 9:
    case 17:
      return `${n}`;
    case 4:
    case 8:
      return `${signed(n)}%`;
    case 5:
    case 10:
      return `${Math.floor((n * 100) / 128)}%`;
    case 20:
      return `${-n}%`;
    case 21:
      return `${-n}`;
    default:
      return null;
  }
}

/** One clipboard stat as its tooltip line (D2 descfunc/descval rules), null when it has no visible text. */
export function statText(stat: Stat): string | null {
  const name = clean(stat.name);
  const skill = clean(stat.skill);
  const value = finite(stat.value) ? stat.value : undefined;
  const level = finite(stat.level) ? stat.level : undefined;
  const chance = finite(stat.chance) ? stat.chance : undefined;
  const amount = value ?? level;

  if (skill && (stat.stat_id === STAT.skillTab || /^\+?%d to .+ Skills$/.test(name))) {
    const [tab, cls] = splitClass(skill);
    return `${signed(amount ?? 0)} to ${tab.replace(/ Skills$/, '')} Skills${cls ? ` (${cls} Only)` : ''}`;
  }
  if (stat.stat_id === STAT.classSkills || /Skill Levels$/.test(name)) {
    const cls = skill ? splitClass(skill)[0] : (/to (\w+) Skill Levels/.exec(name)?.[1] ?? '');
    return `${signed(amount ?? 0)} to ${cls} Skill Levels`;
  }
  if (stat.stat_id === STAT.charged) {
    const charges = value ?? 0;
    const max = finite(stat.range?.max) ? stat.range.max : charges;
    return `Level ${level ?? 0} ${skill} (${charges}/${max} Charges)`;
  }
  if (/%[+-]?d|%s/.test(name)) {
    // printf-style description: %d in order takes chance, level, value; %s the skill.
    const fills = [chance, level, value].filter((n): n is number => n !== undefined);
    return name
      .replace(/%%/g, '%')
      .replace(/%\+d/g, () => signed(fills.shift() ?? 0))
      .replace(/%-?d|%s/g, (token) => (token === '%s' ? splitClass(skill)[0] : `${fills.shift() ?? 0}`));
  }
  if (skill) {
    // Single skills and o-skills ("to Teleport", "+3 to Battle Orders"): the amount and skill rebuild the line.
    const [skillName, cls] = splitClass(skill);
    return `${signed(amount ?? 0)} to ${skillName}${cls ? ` (${cls} Only)` : ''}`;
  }
  if (!name) return null;
  if (amount === undefined) return name;

  // A literal leading "%" ("% Faster Cast Rate") belongs to the value.
  if (name.startsWith('%')) return `${signed(amount)}${name}`;

  const desc = (stat.stat_id !== undefined ? descriptions.get(stat.stat_id) : undefined) ?? descriptionsByLabel.get(name);
  const fn = desc?.function ?? 1;
  const shown = descValue(fn, amount);
  const secondary = fn >= 6 && fn <= 10 && desc?.label?.secondary ? ` ${desc.label.secondary}` : '';
  if (shown === null || desc?.value === 0) return `${name}${secondary}`;
  return desc?.value === 2 ? `${name} ${shown}${secondary}` : `${shown} ${name}${secondary}`;
}

const TITLE_COLORS: Record<string, TooltipColor> = {
  Unique: 'unique',
  Set: 'set',
  Rare: 'rare',
  Crafted: 'crafted',
  Magic: 'magic',
};

/** The item's tooltip as PD2 draws it: name, base, defense, properties, then ethereal/sockets/corrupted. */
export function tooltipLines(item: Item): TooltipLines {
  // Same name remap as the price check rows (some stats come without a stat_id, e.g. "to Strength").
  const stats = (item.stats ?? []).map((s) => (s.name in statRemapByName ? { ...s, ...statRemapByName[s.name] } : s));
  const byId = new Map<number, Stat>();
  for (const s of stats) if (finite(s.stat_id) && !byId.has(s.stat_id)) byId.set(s.stat_id, s);
  const used = new Set<Stat>();
  const take = (id: number) => {
    const s = byId.get(id);
    if (s) used.add(s);
    return s;
  };
  const num = (s: Stat | undefined) => (finite(s?.value) ? s.value : undefined);

  let sockets = finite(item.sockets) ? item.sockets : 0;
  const socketStat = take(StatId.Socket);
  if (finite(socketStat?.value)) sockets = socketStat.value;
  const ethereal = item.isEthereal === true || !!take(StatId.Ethereal);
  const corrupted = !!take(StatId.Corrupted) || stats.some((s) => s.corrupted === true);
  take(STAT.corruptor);
  take(STAT.coldLength);
  take(STAT.evilForce);

  // Merged lines sit where their first stat is in the clipboard order (PD2's display order).
  const placed: Array<{ at: number; line: TooltipLine }> = [];
  const push = (text: string, sources: Stat[]) =>
    placed.push({
      at: Math.min(...sources.map((s) => stats.indexOf(s))),
      line: { text, color: sources.some((s) => s.corrupted) ? 'corrupted' : 'magic' },
    });

  for (const [minId, maxId, element] of DAMAGE_PAIRS) {
    const lo = num(byId.get(minId));
    const hi = num(byId.get(maxId));
    if (lo === undefined || hi === undefined) continue;
    push(lo === hi ? `Adds ${lo} ${element} Damage` : `Adds ${lo}-${hi} ${element} Damage`, [take(minId)!, take(maxId)!]);
  }
  const poisonLo = num(byId.get(STAT.poisonMin));
  const poisonLength = num(byId.get(STAT.poisonLength));
  if (poisonLo !== undefined && poisonLength) {
    const poisonHi = num(byId.get(STAT.poisonMax)) ?? poisonLo;
    const lo = Math.round((poisonLo * poisonLength) / POISON_FRAME_DIVISOR);
    const hi = Math.round((poisonHi * poisonLength) / POISON_FRAME_DIVISOR);
    const seconds = Math.round(poisonLength / FRAMES_PER_SECOND);
    const sources = [take(STAT.poisonMin)!, take(STAT.poisonLength)!];
    if (byId.has(STAT.poisonMax)) sources.push(take(STAT.poisonMax)!);
    push(
      lo === hi ? `Adds ${lo} Poison Damage over ${seconds} Seconds` : `Adds ${lo}-${hi} Poison Damage over ${seconds} Seconds`,
      sources,
    );
  }
  const maxEd = num(byId.get(STAT.maxEd));
  if (maxEd !== undefined && byId.has(STAT.minEd)) {
    push(`${signed(maxEd)}% Enhanced Damage`, [take(STAT.maxEd)!, take(STAT.minEd)!]);
  }
  for (const [ids, format] of [
    [RESIST_IDS, (n: number) => `All Resistances ${signed(n)}%`],
    [ATTRIBUTE_IDS, (n: number) => `${signed(n)} to All Attributes`],
  ] as const) {
    const values = ids.map((id) => num(byId.get(id)));
    if (values.some((v) => v === undefined) || new Set(values).size !== 1) continue;
    push(
      format(values[0]!),
      ids.map((id) => take(id)!),
    );
  }
  for (const s of stats) {
    if (used.has(s)) continue;
    const text = statText(s);
    if (text && !/an evil force/i.test(text)) push(text, [s]);
  }
  const lines = placed.sort((a, b) => a.at - b.at).map((p) => p.line);

  const color = TITLE_COLORS[item.quality] ?? 'white';
  const name = clean(item.isRuneword ? item.runeword : item.name);
  const type = clean(item.type);
  const title: TooltipLine[] = [];
  if (item.isRuneword) {
    title.push({ text: name || type, color: 'unique' });
    if (type && name) title.push({ text: type, color: 'gray' });
  } else {
    if (name) title.push({ text: name, color });
    if (type && type !== name && color !== 'magic' && color !== 'white') title.push({ text: type, color });
    if (!name && type) title.push({ text: type, color });
  }

  const base: TooltipLine[] = [];
  if (finite(item.defense) && item.defense > 0) base.push({ text: `Defense: ${item.defense}`, color: 'white' });
  if (finite(item.iLevel) && item.iLevel > 0) base.push({ text: `Item Level: ${item.iLevel}`, color: 'white' });

  const footer: TooltipLine[] = [];
  const tags = [ethereal && 'Ethereal (Cannot be Repaired)', sockets > 0 && `Socketed (${sockets})`].filter(Boolean);
  if (tags.length) footer.push({ text: tags.join(', '), color: 'magic' });
  if (corrupted) footer.push({ text: 'Corrupted', color: 'corrupted' });

  return { title, base, stats: lines, footer };
}
