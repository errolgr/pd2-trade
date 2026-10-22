import { corruptionOption } from '../lib/catalog';
import { statLabel } from '../lib/stats';
import type { StatFilter } from '../lib/types';

/*
 * Stat labels are site-style templates ("+{X}% Total Fire Resistance"). Lists show the name without the
 * placeholder; chips and totals show the template with the value filled in. Every market view goes through
 * these so no raw `{X}` reaches the screen.
 */

const PLACEHOLDER = /[+-]?\{X\}%?/g;

/** Number shown for a score/stat total: integers stay integers, else one decimal. */
export const formatStat = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** A template without its placeholder: "+{X}% Total Fire Resistance" → "Total Fire Resistance", "+{X} to Strength" → "Strength". */
export function templateName(template: string): string {
  return (
    template
      .replace(PLACEHOLDER, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\W+(?=\w)/, '')
      // "+{X} to Strength": the leading "to" belonged to the value
      .replace(/^to\s+/i, '')
      .trim() || template
  );
}

/** A stat key's (mod or pseudo) display name: "Faster Cast Rate", "Total Fire Resistance". */
export function statName(key: string): string {
  return templateName(statLabel(key));
}

/** A stat row's display name; corruption rows by their corruption ("Faster Cast Rate", "Sockets"). */
export function filterName(row: Pick<StatFilter, 'kind' | 'key'>): string {
  return row.kind === 'corruption' ? templateName(corruptionOption(row.key).label) : statName(row.key);
}

/** Chips drop the explanatory parenthetical and shorten "Resistance(s)". */
const shorten = (text: string) =>
  text
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/Resistances?\b/g, 'Res')
    .trim();

/**
 * The template with `value` filled in: "+29% Total Fire Resistance"; `short` for chips ("+29% Total Fire Res").
 * Labels without a placeholder get the value appended.
 */
export function statWithValue(key: string, value: number, { short = false }: { short?: boolean } = {}): string {
  const label = statLabel(key);
  const shown = formatStat(value);
  let text: string;
  if (label.includes('{X}')) {
    // A negative total in a "+{X}" template reads "-5", not "+-5"
    text = label.replace(/([+-]?)\{X\}/, (_, sign: string) => (value < 0 ? shown : `${sign}${shown}`));
    text = text.replace(PLACEHOLDER, '');
  } else {
    text = `${label} ${shown}`;
  }
  text = text.replace(/\s+/g, ' ').trim();
  return short ? shorten(text) : text;
}
