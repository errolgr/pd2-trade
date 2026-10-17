import type { AppraisedStat } from '@/lib/rare-appraisal-api';
import type { Stat } from './interfaces';
import { statIdToProperty } from './stat-mappings';
import { getStatKey } from './utils';

/** "Fire Ball" / "Lightning Skills (Sorceress)" → "fire_ball" / "lightning_skills_sorceress" (feature-key style). */
const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/**
 * Pairs the appraisal's key / near-key stats with the price-check stat rows (keyed by `getStatKey`).
 *
 * Feature keys use the D2 property name of the stat (`item_fastercastrate`, `all_resist`, `maxdamage_percent`),
 * optionally with a `__<skill or tab>` suffix (`item_singleskill__fire_ball_sorceress_only`), so a row matches
 * when `statIdToProperty[stat_id]` equals the key's base. Several rows of the same property (two single
 * skills, two "chance to cast" lines) are told apart by the skill slug in the suffix, then by value.
 * Only stats with stars or a `keyFrom` hint are returned: the rest of the rows stay unannotated.
 */
export function matchRareStats(appraised: AppraisedStat[], rows: Stat[]): Map<string, AppraisedStat> {
  const matches = new Map<string, AppraisedStat>();
  const used = new Set<Stat>();
  for (const stat of appraised) {
    if (!stat.key || (stat.stars === null && stat.keyFrom === null)) continue;
    const [base, suffix = ''] = stat.key.split('__');
    const candidates = rows.filter((row) => !used.has(row) && statIdToProperty[row.stat_id] === base);
    if (candidates.length === 0) continue;
    const row =
      (suffix && candidates.find((row) => row.skill && suffix.startsWith(slug(row.skill)))) ||
      candidates.find((row) => row.value === stat.value) ||
      candidates[0];
    used.add(row);
    matches.set(getStatKey(row), stat);
  }
  return matches;
}

/**
 * Pre-filled minimum for a key stat: at least the value where it becomes key, rounded down to a step that
 * suits the magnitude (FCR 20 → 20, +88 mana → 85, 277% ED → 270) so near-identical rolls still match.
 */
export function keyStatMin(stat: AppraisedStat): number | null {
  if (stat.value === null) return null;
  const floor = Math.max(stat.keyFrom ?? stat.value, stat.value);
  const step = floor <= 20 ? 1 : floor <= 100 ? 5 : 10;
  return Math.max(stat.keyFrom ?? 0, Math.floor(floor / step) * step);
}
