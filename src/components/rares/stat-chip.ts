/*
 * Short chip texts for in-game stat labels ("+20% Faster Cast Rate" → "FCR 20%"). Port of pd2-price-crawler
 * client/src/components/wealth/rares/statChip.js and the guide's statName / shortStatName (guideModel.js).
 */

/** Skill-level templates ("Chance to cast level # Amplify Damage on striking"): the value is the level. */
const LEVEL_RE = /^(?:chance to cast )?level #\s*/i;

/** Readable stat name from a label template without the '#': "+#% Enhanced Damage" → "Enhanced Damage %". */
function statName(template: string): string {
  if (!template.includes('#')) return template;
  if (LEVEL_RE.test(template)) {
    const t = template.replace(LEVEL_RE, '');
    return `${t.charAt(0).toUpperCase()}${t.slice(1)} (level)`;
  }
  const m = template.match(/([+-]?)#(%?)/);
  const neg = m?.[1] === '-';
  const pct = m?.[2] === '%';
  let t = template
    .replace(/[+-]?#%?/, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^to\s+(an?\s+)?/i, '')
    .replace(/\s+(by|of)$/i, '')
    .replace(/\s*[+:]$/, '');
  if (pct) {
    const unit = neg ? '−%' : '%';
    const paren = t.match(/\s*(\([^)]*\))$/);
    t = paren && paren.index !== undefined ? `${t.slice(0, paren.index)} ${unit} ${paren[1]}` : `${t} ${unit}`;
  } else if (neg) {
    t = `${t} (−)`;
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Short stat name: no unit, common words abbreviated ("Maximum Cold Resist %" → "Max cold res"). */
function shortStatName(template: string): string {
  const base = LEVEL_RE.test(template) ? template.replace(LEVEL_RE, '') : statName(template);
  return base
    .replace(/\s+−?%(?=$|\s)/, '')
    .replace(/\s*\((lowest|sum) of the four\)/i, '')
    .replace(/\s*\(any( class)?\)/i, '')
    .replace(/^All four resists$/i, 'All res')
    .replace(/^Total resists$/i, 'Total res')
    .replace(/^All Resistances$/i, 'All res')
    .replace(/^Maximum (\w+) Resist$/i, (_, el: string) => `Max ${el.toLowerCase()} res`)
    .replace(/^(\w+) Resist$/i, (_, el: string) => `${el} res`)
    .replace(/^Maximum /i, 'Max ')
    .replace(/^Minimum /i, 'Min ')
    .replace(/ Damage$/, ' dmg')
    .trim();
}

/** Common PD2 shorthands on top of the short stat names. */
const ABBREV: Record<string, string> = {
  'Faster Cast Rate': 'FCR',
  'Faster Hit Recovery': 'FHR',
  'Faster Run/Walk': 'FRW',
  'Faster Block Rate': 'FBR',
  'Increased Attack Speed': 'IAS',
  'Increased Chance of Blocking': 'Block',
  'Enhanced dmg': 'ED',
  'Enhanced Defense': 'Enh def',
  'Physical Damage Taken Reduced': 'PDR',
  'Magic Damage Reduced': 'MDR',
  'Damage Reduced': 'DR',
  'Poison Length Reduced': 'Poison length',
  'Life after each Kill': 'Life/kill',
  'Mana after each Kill': 'Mana/kill',
  'Life stolen per hit': 'Life leech',
  'Mana stolen per hit': 'Mana leech',
  'Chance of Deadly Strike': 'Deadly strike',
  'Chance of Crushing Blow': 'Crushing blow',
  'Chance of Open Wounds': 'Open wounds',
  'Cannot Be Frozen': 'CBF',
  'Better Chance of Getting Magic Items': 'MF',
  'Extra Gold from Monsters': 'GF',
  'Attack Rating': 'AR',
  'All Skills': 'All skills',
};

const CTC_RE = /chance to cast level (\d+) (.+?) (?:on|when) /i;
const CHARGES_RE = /^level (\d+) (.+?) \(\d+\/\d+ charges\)/i;
const NUM_RE = /[+-]?\d+(?:\.\d+)?/g;

/**
 * "+20% Faster Cast Rate" → "FCR 20%", "+3 Life after each Kill" → "Life/kill 3", "2% to Maximum Cold Resist" →
 * "Max cold res 2%", "12% Chance to cast level 31 Amplify Damage on striking" → "Amplify Damage lvl 31". Labels
 * with several numbers come back unchanged.
 */
export function statChipText(label: string): string {
  const ctc = CTC_RE.exec(label);
  if (ctc) return `${ctc[2]} lvl ${ctc[1]}`;
  const charges = CHARGES_RE.exec(label);
  if (charges) return `${charges[2]} charges lvl ${charges[1]}`;
  const nums = label.match(NUM_RE) ?? [];
  if (nums.length > 1) return label;
  const template = label.replace(NUM_RE, (n) => (n.startsWith('-') ? '-#' : n.startsWith('+') ? '+#' : '#'));
  const short = shortStatName(template);
  const name = (ABBREV[short] ?? short)
    .replace(/^(\w+) Skills$/, '$1 skills')
    .replace(/^Enemy (\w+) Resistance$/, (_, el: string) => `Enemy ${el.toLowerCase()} res`);
  if (nums.length === 0) return name;
  const n = nums[0];
  const value = n.startsWith('-') ? `−${n.slice(1)}` : n.replace(/^\+/, '');
  return `${name} ${value}${template.includes('#%') ? '%' : ''}`;
}
