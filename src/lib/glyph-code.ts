/**
 * Tomb glyph codes: every account's avatar is one number (a BigInt) that packs the glyph's parts into fixed-width
 * bit fields. A port of pd2trader.com's client/src/utils/glyph/glyphCode.js: keep the two in step, so a name draws
 * the same glyph on the website and in the overlay (glyph-code.test.ts pins codes the website computes).
 *
 * Glyphs are stateless: `glyphCodeForName` hashes the account name onto the valid codes, so a name always draws the
 * same glyph and nothing is stored. Two accounts share a glyph only through a hash clash. With M accounts over
 * N = GLYPH_SPACE codes the chance of any clash is the birthday bound p ≈ M²/2N.
 *
 * The bit layout is append-only: a field's offset and width never change, and new options only go on the end of a
 * part's list (a 4-bit field holds up to 16), so a code keeps decoding to the same glyph. The first option of every
 * field added later draws the glyph as it looked before that field existed. Growing GLYPH_SPACE re-rolls the glyph
 * of every name.
 *
 * Every valid code draws a different picture. The centre group (shape, spine, inner mark) can be mirrored and
 * flipped, and a composition that a transform leaves unchanged (a mirrored circle) only accepts the first
 * orientation of each look. A detail that would draw nothing (the style of an absent mark, line-end style on a mark
 * made only of dots) only accepts its first option.
 *
 * Pure: no DOM or React.
 */

// Orientation is the Klein four-group: bit 0 mirrors left-right, bit 1 flips top-bottom, composing is XOR.
export const ORIENTATIONS = ['upright', 'mirrored', 'flipped', 'turned'] as const;

// Symmetry of a part as the set of orientations that leave it unchanged, one bit per orientation.
const SYM = {
  all: 0b1111,
  mirror: 0b0011, // left-right symmetric: upright = mirrored
  flip: 0b0101, // top-bottom symmetric: upright = flipped
  turn: 0b1001, // 180° rotation symmetric: upright = turned
  none: 0b0001,
};

type SpineKey = 'none' | 'through' | 'below' | 'across';

/**
 * Main shapes, in the centre zone. `spines`: spine keys that stay legible with it. `inner`: it has room for an
 * inner mark. `contour`: it can carry a thin inset copy of its outline (SHAPE_EDGES).
 */
export const SHAPES: readonly { key: string; sym: number; spines: SpineKey[]; inner: boolean; contour: boolean }[] = [
  { key: 'circle', sym: SYM.all, spines: ['none', 'through', 'below', 'across'], inner: true, contour: true },
  { key: 'triangle', sym: SYM.mirror, spines: ['none', 'through', 'below', 'across'], inner: true, contour: true },
  { key: 'diamond', sym: SYM.all, spines: ['none', 'through', 'below', 'across'], inner: true, contour: true },
  { key: 'crescent', sym: SYM.flip, spines: ['none', 'through', 'below'], inner: true, contour: false },
  { key: 'square', sym: SYM.all, spines: ['none', 'through', 'below', 'across'], inner: true, contour: true },
  { key: 'pentagon', sym: SYM.mirror, spines: ['none', 'through', 'below'], inner: true, contour: true },
  { key: 'hexagon', sym: SYM.all, spines: ['none', 'through', 'below', 'across'], inner: true, contour: true },
  { key: 'eye', sym: SYM.all, spines: ['none', 'through', 'below', 'across'], inner: true, contour: true },
  { key: 'arch', sym: SYM.mirror, spines: ['none', 'through', 'below'], inner: true, contour: true },
  { key: 'hourglass', sym: SYM.all, spines: ['none', 'through', 'below', 'across'], inner: false, contour: false },
  { key: 'ringedCross', sym: SYM.all, spines: ['none', 'below'], inner: false, contour: false },
  { key: 'keyhole', sym: SYM.mirror, spines: ['none', 'below'], inner: false, contour: false },
  { key: 'shield', sym: SYM.mirror, spines: ['none', 'through', 'below'], inner: true, contour: true },
  { key: 'spiral', sym: SYM.none, spines: ['none', 'below'], inner: false, contour: false },
  { key: 'bolt', sym: SYM.turn, spines: ['none', 'below'], inner: false, contour: false },
  { key: 'ankh', sym: SYM.mirror, spines: ['none'], inner: false, contour: false },
];

/** A vertical line through the shape, a pedestal under it, or a horizontal bar across it. */
export const SPINES: readonly { key: SpineKey; sym: number }[] = [
  { key: 'none', sym: SYM.all },
  { key: 'through', sym: SYM.all },
  { key: 'below', sym: SYM.mirror },
  { key: 'across', sym: SYM.all },
];

/**
 * Mark inside the shape, only with no spine crossing the centre. Only marks that still read at 32px (a filled dot
 * against an open ring); a cross or slash this small blurs into the dot.
 */
export const INNER_MARKS: readonly { key: string; sym: number }[] = [
  { key: 'none', sym: SYM.all },
  { key: 'dot', sym: SYM.all },
  { key: 'ring', sym: SYM.all },
];

export const TOP_MARKS = [
  'none',
  'dot',
  'tick',
  'triangle',
  'bar',
  'twinDots',
  'chevron',
  'crown',
  'cup',
  'vee',
  'ring',
  'cross',
];

export const BASE_MARKS = [
  'none',
  'arc',
  'bar',
  'twoDots',
  'chevron',
  'doubleBar',
  'threeDots',
  'wave',
  'bracket',
  'dome',
  'pyramid',
  'crenel',
];

/** Drawn on the left; the right side uses the mirror image of the same mark. */
export const SIDE_MARKS = [
  'none',
  'dot',
  'bar',
  'twoDots',
  'paren',
  'chevron',
  'dashes',
  'arrow',
  'ring',
  'doubleBar',
  'rune',
];

/** Outer marks drawn only with dots and circles: no line ends or corners for MARK_ENDS to change. */
const DOT_MARKS = new Set(['none', 'dot', 'twinDots', 'ring', 'twoDots', 'threeDots']);

/** Diablo II item text colours (and a few more), each readable on the dark stone tile. */
export const GLYPH_COLORS: readonly { key: string; hex: string }[] = [
  { key: 'unique', hex: '#c7b377' },
  { key: 'set', hex: '#00c400' },
  { key: 'magic', hex: '#6969ff' },
  { key: 'rare', hex: '#ffff64' },
  { key: 'crafted', hex: '#ffa800' },
  { key: 'blood', hex: '#e8463a' },
  { key: 'ethereal', hex: '#b0b0b0' },
  { key: 'teal', hex: '#2ec4b6' },
  { key: 'normal', hex: '#ece8e0' },
  { key: 'arcane', hex: '#b46cff' },
];

/** Second colour, for the frame only: 'none' draws it in the glyph colour. Never the glyph colour itself. */
export const ACCENTS = ['none', ...GLYPH_COLORS.map((c) => c.key)];

/** The thin inner frame. A tiny detail at 32px. */
export const FRAMES = ['plain', 'notched', 'double', 'studs', 'cracked', 'dashed', 'brackets', 'rounded'];

/** Second, small glyph in the top-left corner. A tiny detail at 32px. */
export const BIND_GLYPHS = [
  'none',
  'dot',
  'ring',
  'triangle',
  'diamond',
  'square',
  'cross',
  'crescent',
  'bar',
  'chevron',
  'vee',
  'twinDots',
  'hexagon',
  'asterisk',
  'hourglass',
  'arc',
];

/** Stroke weight of the centre group, of one outer mark, or of the frame. */
export const WEIGHTS = ['regular', 'light', 'heavy'] as const;

/** Where an outer mark sits in its zone: at home, or nudged a step toward the centre. */
export const MARK_INSETS = ['home', 'inset'] as const;

/** Line ends and corners of an outer mark: rounded, or square caps with mitred corners. */
export const MARK_ENDS = ['round', 'square'] as const;

/** Ornament at the ends of the spine: bare, short crossbars, or knobs. */
export const SPINE_ENDS = ['plain', 'serif', 'knob'] as const;

/** The shape's outline alone, or with a thin inset copy of it, solid or dotted. */
export const SHAPE_EDGES = ['plain', 'contour', 'dotted'] as const;

/** Tint of the stone tile. */
export const STONES = ['granite', 'slate', 'basalt', 'sandstone', 'moss', 'bloodstone', 'ash', 'umber'] as const;

/** Faint surface texture of the stone. */
export const GRAINS = ['smooth', 'pitted', 'veined', 'speckled', 'scored', 'mottled', 'flecked', 'lichen'] as const;

/** A hairline crack running in from the tile edge: 32 starting points × 8 courses (TombGlyph draws them). */
export const CRACKS = Array.from({ length: 256 }, (_, i) => (i ? `crack${i}` : 'none'));

/** How the glyph sits in the stone: painted on, cut in (dark shadow), cut deep, or standing proud (light edge). */
export const CARVES = ['flat', 'incised', 'raised', 'deep'] as const;

const PART_KEYS = {
  color: GLYPH_COLORS.map((c) => c.key),
  shape: SHAPES.map((s) => s.key),
  orientation: ORIENTATIONS,
  spine: SPINES.map((s) => s.key),
  inner: INNER_MARKS.map((m) => m.key),
  top: TOP_MARKS,
  base: BASE_MARKS,
  left: SIDE_MARKS,
  right: SIDE_MARKS,
  frame: FRAMES,
  bind: BIND_GLYPHS,
  accent: ACCENTS,
  centreWeight: WEIGHTS,
  spineEnd: SPINE_ENDS,
  edge: SHAPE_EDGES,
  topWeight: WEIGHTS,
  topInset: MARK_INSETS,
  topEnds: MARK_ENDS,
  baseWeight: WEIGHTS,
  baseInset: MARK_INSETS,
  baseEnds: MARK_ENDS,
  sideWeight: WEIGHTS,
  sideInset: MARK_INSETS,
  sideEnds: MARK_ENDS,
  frameWeight: WEIGHTS,
  stone: STONES,
  grain: GRAINS,
  crack: CRACKS,
  carve: CARVES,
} satisfies Record<string, readonly string[]>;

export type GlyphField = keyof typeof PART_KEYS;

/** A glyph's parts: the option key of every field. */
export type GlyphParts = { [F in GlyphField]: (typeof PART_KEYS)[F][number] };

/** Option indexes per field. */
type GlyphValues = Record<GlyphField, number>;

/** Bit layout, low bits first. Append-only: never reorder or resize a field. */
const FIELD_WIDTHS: readonly [GlyphField, number][] = [
  ['color', 4],
  ['shape', 5],
  ['orientation', 2],
  ['spine', 3],
  ['inner', 3],
  ['top', 4],
  ['base', 4],
  ['left', 4],
  ['right', 4],
  ['frame', 3],
  ['bind', 4],
  ['accent', 4],
  ['centreWeight', 2],
  ['spineEnd', 2],
  ['edge', 2],
  ['topWeight', 2],
  ['topInset', 2],
  ['topEnds', 2],
  ['baseWeight', 2],
  ['baseInset', 2],
  ['baseEnds', 2],
  ['sideWeight', 2],
  ['sideInset', 2],
  ['sideEnds', 2],
  ['frameWeight', 2],
  ['stone', 4],
  ['grain', 4],
  ['crack', 8],
  ['carve', 2],
];

export const GLYPH_FIELDS: readonly { name: GlyphField; bits: number; offset: number; options: number }[] = (() => {
  let offset = 0;
  return FIELD_WIDTHS.map(([name, bits]) => {
    if (PART_KEYS[name].length > 2 ** bits) throw new Error(`glyph field ${name} overflows ${bits} bits`);
    const field = { name, bits, offset, options: PART_KEYS[name].length };
    offset += bits;
    return field;
  });
})();

const CODE_LIMIT = 1n << BigInt(GLYPH_FIELDS.reduce((sum, f) => sum + f.bits, 0));

/** The orientation that draws the same picture as `orientation` for a part group with symmetry `sym`. */
function canonicalOrientation(orientation: number, sym: number): number {
  let best = orientation;
  for (let g = 1; g < 4; g++) if (sym & (1 << g)) best = Math.min(best, orientation ^ g);
  return best;
}

function centreValid(shape: number, orientation: number, spine: number, inner: number): boolean {
  const s = SHAPES[shape];
  const spineKey = SPINES[spine].key;
  if (!s.spines.includes(spineKey)) return false;
  // The pedestal only stands below the shape: flipped, it would crowd the top mark.
  if (spineKey === 'below' && orientation & 2) return false;
  if (inner !== 0 && (!s.inner || spineKey === 'through' || spineKey === 'across')) return false;
  return canonicalOrientation(orientation, s.sym & SPINES[spine].sym & INNER_MARKS[inner].sym) === orientation;
}

/**
 * At most this many of the four outer marks (top, base, left, right) per glyph, so a tile never fills every zone.
 * Raising it later only adds codes; lowering it would invalidate existing ones.
 */
const MAX_OUTER_MARKS = 3;

function outerMarksValid(...marks: number[]): boolean {
  return marks.filter((m) => m !== 0).length <= MAX_OUTER_MARKS;
}

const ALL = Object.fromEntries(
  Object.entries(PART_KEYS).map(([name, keys]) => [name, keys.map((_, i) => i)]),
) as Record<GlyphField, number[]>;
const FIRST = [0];
const allIf = (name: GlyphField, condition: boolean) => (condition ? ALL[name] : FIRST);
const hasEnds = (key: string) => !DOT_MARKS.has(key);

type Detail = [GlyphField, (v: GlyphValues) => number[]];

interface GlyphGroup {
  visible: boolean;
  tuples: number;
  size: bigint;
  digit(v: GlyphValues): number | undefined;
  assign(digit: number, v: GlyphValues): void;
}

/**
 * A mixed-radix digit of a code's index. `fields` are listed as valid tuples up front; each `details` entry is
 * `[field, options(values)]`, the values that field may take given the tuple, so each tuple stands for the product
 * of its details' option counts. `visible`: the tuple fields are main features that read at 32px; details are
 * fine variants and never are.
 */
function group(
  fields: GlyphField[],
  {
    visible = false,
    valid = () => true,
    details = [],
  }: { visible?: boolean; valid?: (...values: number[]) => boolean; details?: Detail[] } = {},
): GlyphGroup {
  const tuples: number[][] = [];
  const fill = (values: number[]) => {
    if (values.length === fields.length) {
      if (valid(...values)) tuples.push(values);
      return;
    }
    for (let v = 0; v < PART_KEYS[fields[values.length]].length; v++) fill([...values, v]);
  };
  fill([]);
  const key = (values: number[]) => values.reduce((k, v) => k * 256 + v, 0);
  const index = new Map(tuples.map((t, i) => [key(t), i]));
  const detailOptions = (v: GlyphValues) => details.map(([, options]) => options(v));
  // starts[i]: the first digit of tuple i.
  const starts: number[] = [];
  let size = 0;
  for (const t of tuples) {
    starts.push(size);
    size += detailOptions(Object.fromEntries(fields.map((f, j) => [f, t[j]])) as GlyphValues).reduce(
      (n, o) => n * o.length,
      1,
    );
  }
  return {
    visible,
    tuples: tuples.length,
    size: BigInt(size),
    /** This group's digit for field values `v`, or undefined when they aren't a valid combination. */
    digit(v) {
      const i = index.get(key(fields.map((f) => v[f])));
      if (i === undefined) return undefined;
      const options = detailOptions(v);
      let within = 0;
      for (let j = options.length - 1; j >= 0; j--) {
        const d = options[j].indexOf(v[details[j][0]]);
        if (d < 0) return undefined;
        within = within * options[j].length + d;
      }
      return starts[i] + within;
    },
    /** Sets this group's fields in `v` from its digit; the inverse of `digit`. */
    assign(digit, v) {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= digit) lo = mid;
        else hi = mid - 1;
      }
      fields.forEach((f, j) => (v[f] = tuples[lo][j]));
      let within = digit - starts[lo];
      detailOptions(v).forEach((options, j) => {
        v[details[j][0]] = options[within % options.length];
        within = Math.floor(within / options.length);
      });
    },
  };
}

/**
 * Mixed-radix digits of a valid code's index, least significant first. Every valid code is one digit from each
 * group, so GLYPH_SPACE is the product of the group sizes.
 */
const GROUPS: readonly GlyphGroup[] = [
  group(['color'], {
    visible: true,
    details: [['accent', (v) => ALL.accent.filter((a) => ACCENTS[a] !== GLYPH_COLORS[v.color].key)]],
  }),
  group(['shape', 'orientation', 'spine', 'inner'], {
    visible: true,
    valid: (shape, orientation, spine, inner) => centreValid(shape, orientation, spine, inner),
    details: [
      ['centreWeight', () => ALL.centreWeight],
      ['spineEnd', (v) => allIf('spineEnd', v.spine !== 0)],
      ['edge', (v) => allIf('edge', SHAPES[v.shape].contour && v.inner === 0)],
    ],
  }),
  group(['top', 'base', 'left', 'right'], {
    visible: true,
    valid: outerMarksValid,
    details: [
      ['topWeight', (v) => allIf('topWeight', v.top !== 0)],
      ['topInset', (v) => allIf('topInset', v.top !== 0)],
      ['topEnds', (v) => allIf('topEnds', hasEnds(TOP_MARKS[v.top]))],
      ['baseWeight', (v) => allIf('baseWeight', v.base !== 0)],
      ['baseInset', (v) => allIf('baseInset', v.base !== 0)],
      ['baseEnds', (v) => allIf('baseEnds', hasEnds(BASE_MARKS[v.base]))],
      ['sideWeight', (v) => allIf('sideWeight', v.left !== 0 || v.right !== 0)],
      ['sideInset', (v) => allIf('sideInset', v.left !== 0 || v.right !== 0)],
      ['sideEnds', (v) => allIf('sideEnds', hasEnds(SIDE_MARKS[v.left]) || hasEnds(SIDE_MARKS[v.right]))],
    ],
  }),
  group(['frame'], { details: [['frameWeight', () => ALL.frameWeight]] }),
  group(['bind']),
  group(['stone']),
  group(['grain']),
  group(['crack']),
  group(['carve']),
];

/**
 * Number of valid codes (a BigInt), every one a different picture: the product of the group sizes, where a group's
 * size sums, over its valid tuples, the product of its details' option counts. A clash among M stateless glyphs
 * has probability p ≈ M²/(2·GLYPH_SPACE).
 */
export const GLYPH_SPACE = GROUPS.reduce((n, g) => n * g.size, 1n);

/** Number of codes that differ in their 32px main features: colours × centre groups × outer mark sets. */
export const GLYPH_VISIBLE_SPACE = GROUPS.filter((g) => g.visible).reduce((n, g) => n * g.tuples, 1);

function asBigInt(code: unknown): bigint | null {
  if (typeof code === 'bigint') return code;
  return Number.isSafeInteger(code) ? BigInt(code as number) : null;
}

function fieldValues(code: bigint): GlyphValues {
  const values = {} as GlyphValues;
  for (const f of GLYPH_FIELDS) values[f.name] = Number((code >> BigInt(f.offset)) & ((1n << BigInt(f.bits)) - 1n));
  return values;
}

function isValidValues(v: GlyphValues): boolean {
  return GLYPH_FIELDS.every((f) => v[f.name] < f.options) && GROUPS.every((g) => g.digit(v) !== undefined);
}

/** True when `code` (a BigInt, or a safe integer) is inside the layout and its parts form a valid glyph. */
export function isValidGlyphCode(code: unknown): code is bigint | number {
  const c = asBigInt(code);
  return c !== null && c >= 0n && c < CODE_LIMIT && isValidValues(fieldValues(c));
}

/**
 * Packs parts (an option key for every field in GLYPH_FIELDS) into a BigInt code. Throws a RangeError on an
 * unknown key or a combination that isn't valid (e.g. 'mirrored' on a circle, which would duplicate 'upright', all
 * four outer marks, or a size for an absent mark).
 */
export function encodeGlyph(parts: GlyphParts): bigint {
  let code = 0n;
  for (const f of GLYPH_FIELDS) {
    const value = (PART_KEYS[f.name] as readonly string[]).indexOf(parts[f.name]);
    if (value < 0) throw new RangeError(`unknown glyph ${f.name}: ${parts[f.name]}`);
    code |= BigInt(value) << BigInt(f.offset);
  }
  if (!isValidGlyphCode(code)) throw new RangeError(`invalid glyph combination: ${JSON.stringify(parts)}`);
  return code;
}

/** Unpacks a code into its parts (option keys). Throws a RangeError on an invalid code. */
export function decodeGlyph(code: bigint | number): GlyphParts {
  const c = asBigInt(code);
  if (c === null || !isValidGlyphCode(c)) throw new RangeError(`invalid glyph code: ${code}`);
  const v = fieldValues(c);
  const parts = {} as Record<GlyphField, string>;
  for (const f of GLYPH_FIELDS) parts[f.name] = PART_KEYS[f.name][v[f.name]];
  return parts as GlyphParts;
}

/** The valid code at BigInt `index` in [0, GLYPH_SPACE): its mixed-radix digits over GROUPS, one per group. */
export function glyphCodeAt(index: bigint): bigint {
  const v = {} as GlyphValues;
  let rest = index;
  for (const g of GROUPS) {
    g.assign(Number(rest % g.size), v);
    rest /= g.size;
  }
  return GLYPH_FIELDS.reduce((code, f) => code | (BigInt(v[f.name]) << BigInt(f.offset)), 0n);
}

const FNV_PRIME = 0x100000001b3n;
const MASK_64 = (1n << 64n) - 1n;
// The standard FNV-1a offset basis, and a second basis (the first rotated by 32 bits) for an independent lane.
const FNV_OFFSETS = [0xcbf29ce484222325n, 0x84222325cbf29ce4n];

/** 64-bit FNV-1a from `offset`, finished with the MurmurHash3 fmix64 avalanche. */
function hash64(bytes: Uint8Array, offset: bigint): bigint {
  let h = offset;
  for (const byte of bytes) h = ((h ^ BigInt(byte)) * FNV_PRIME) & MASK_64;
  h ^= h >> 33n;
  h = (h * 0xff51afd7ed558ccdn) & MASK_64;
  h ^= h >> 33n;
  h = (h * 0xc4ceb9fe1a85ec53n) & MASK_64;
  h ^= h >> 33n;
  return h;
}

/**
 * An account's glyph: a 128-bit hash (two 64-bit lanes) of the UTF-8 of the trimmed, lower-cased name, mod
 * GLYPH_SPACE onto the valid codes. 2^128 over GLYPH_SPACE leaves a bias under 2^-60. Stable for a given name and
 * GLYPH_SPACE.
 */
export function glyphCodeForName(name: string): bigint {
  const bytes = new TextEncoder().encode(String(name).trim().toLowerCase());
  const [hi, lo] = FNV_OFFSETS.map((offset) => hash64(bytes, offset));
  return glyphCodeAt(((hi << 64n) | lo) % GLYPH_SPACE);
}
