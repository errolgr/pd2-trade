import type { ReactNode } from 'react';
import { CRACKS, GLYPH_COLORS, decodeGlyph, isValidGlyphCode } from '@/lib/glyph-code';

/*
 * Art for glyph codes (lib/glyph-code.ts) on a 72-unit tile. A port of pd2trader.com's
 * client/src/components/glyph/TombGlyph.jsx: keep the two in step. Each part keeps to its own zone so no two
 * parts touch at 32px, even at heavy weight and inset:
 *   frame 4.5 · top mark y 7.5–14.5 · centre shape 23–49 (spines reach 20–52) · base mark y 57.5–64.5
 *   side marks x 8–16 and 56–64, y 29–43 · bind glyph in the top-left corner, 9–18
 * The centre group (shape, spine, inner mark) is mirrored/flipped about (36, 36). Stone grain and cracks sit under
 * everything in dark or faint tones, so the 32px read is the glyph alone.
 */

const STONE_EDGE = '#100d0a';

/** Tile fill and bevel line per stone. */
const STONE_TINTS: Record<string, [fill: string, bevel: string]> = {
  granite: ['#2a2520', '#3b342b'],
  slate: ['#24262a', '#363a41'],
  basalt: ['#1f1d1c', '#312e2b'],
  sandstone: ['#2f2820', '#433a2d'],
  moss: ['#262921', '#373c2f'],
  bloodstone: ['#2c2222', '#403131'],
  ash: ['#2b2a28', '#3e3c39'],
  umber: ['#2a221c', '#3d3127'],
};

// Stroke widths per weight: the centre group, outer marks, and the frame.
const CENTRE_W: Record<string, number> = { regular: 3, light: 2.5, heavy: 3.4 };
const MARK_W: Record<string, number> = { regular: 2.6, light: 2.1, heavy: 3 };
const FRAME_W: Record<string, number> = { regular: 1.2, light: 0.8, heavy: 1.7 };
const INSET = 0.8;

/** The glyph copy under the glyph: offset, colour and opacity. */
const CARVE_SHADOWS: Record<string, { dx: number; color: string; opacity: number } | undefined> = {
  incised: { dx: 0.9, color: '#0b0907', opacity: 0.9 },
  deep: { dx: 1.6, color: '#0b0907', opacity: 0.9 },
  raised: { dx: -0.8, color: '#8a7f70', opacity: 0.35 },
};

const ORIENT_TRANSFORMS: Record<string, string | undefined> = {
  upright: undefined,
  mirrored: 'matrix(-1 0 0 1 72 0)',
  flipped: 'matrix(1 0 0 -1 0 72)',
  turned: 'matrix(-1 0 0 -1 72 72)',
};
const MIRROR = 'matrix(-1 0 0 1 72 0)';

/**
 * A filled disc of radius `r` at the reference stroke width `ref`. It keeps the parent's stroke, so it grows and
 * shrinks with the mark's weight like the stroked marks do.
 */
const dot = (cx: number, cy: number, r: number, ref = MARK_W.regular) => (
  <circle cx={cx}
    cy={cy}
    r={r - ref / 2}
    fill="currentColor" />
);
const line = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1}
  y1={y1}
  x2={x2}
  y2={y2} />;
const round1 = (n: number) => Math.round(n * 100) / 100;
const pts = (list: number[][]) => list.map((p) => p.map(round1).join(',')).join(' ');
const ngon = (n: number, r: number, cy: number, startDeg: number) =>
  pts(
    Array.from({ length: n }, (_, i) => {
      const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
      return [36 + r * Math.cos(a), cy + r * Math.sin(a)];
    }),
  );

type Point = [x: number, y: number];

/** A centre shape's art, where a 'below' spine leaves it, and (when it has room) where an inner mark centres. */
interface ShapeArt {
  art: ReactNode;
  bottom: number;
  inner?: Point;
}

/** Each shape: its drawing, where a 'below' spine leaves it, and where an inner mark (or contour) centres. */
const SHAPE_ART: Record<string, ShapeArt> = {
  circle: { art: <circle cx="36"
    cy="36"
    r="13" />, bottom: 49, inner: [36, 36] },
  triangle: { art: <path d="M36 22.5 L49.5 46 H22.5 Z" />, bottom: 46, inner: [36, 38.5] },
  diamond: { art: <path d="M36 22 L50 36 L36 50 L22 36 Z" />, bottom: 50, inner: [36, 36] },
  crescent: { art: <path d="M44 24 A13 13 0 1 0 44 48 A14 14 0 0 1 44 24 Z" />, bottom: 48.6, inner: [46.5, 36] },
  square: { art: <rect x="24"
    y="24"
    width="24"
    height="24"
    rx="1.5" />, bottom: 48, inner: [36, 36] },
  pentagon: { art: <polygon points={ngon(5, 14, 37, -90)} />, bottom: 48.3, inner: [36, 37.5] },
  hexagon: { art: <polygon points={ngon(6, 14, 36, 0)} />, bottom: 48.1, inner: [36, 36] },
  eye: { art: <path d="M21.5 36 A16 16 0 0 1 50.5 36 A16 16 0 0 1 21.5 36 Z" />, bottom: 44.7, inner: [36, 36] },
  arch: { art: <path d="M25 49 V34 A11 11 0 0 1 47 34 V49 Z" />, bottom: 49, inner: [36, 38.5] },
  hourglass: { art: <path d="M24.5 23 H47.5 L24.5 49 H47.5 Z" />, bottom: 49 },
  ringedCross: {
    art: (
      <>
        <circle cx="36"
          cy="36"
          r="8" />
        {line(36, 22, 36, 50)}
        {line(22, 36, 50, 36)}
      </>
    ),
    bottom: 50,
  },
  keyhole: { art: <path d="M33 37.3 L28 49 H44 L39 37.3 A7 7 0 1 0 33 37.3 Z" />, bottom: 49 },
  shield: { art: <path d="M24 24 H48 V35 Q48 45.5 36 50.5 Q24 45.5 24 35 Z" />, bottom: 50.5, inner: [36, 35.5] },
  spiral: { art: <path d="M36 36 H42 V42 H29.5 V29.5 H48 V48 H24" />, bottom: 48 },
  bolt: { art: <path d="M25 25 H47 L25 47 H47" />, bottom: 47 },
  ankh: {
    art: (
      <>
        <ellipse cx="36"
          cy="29"
          rx="6"
          ry="7" />
        {line(25, 38.5, 47, 38.5)}
        {line(36, 36, 36, 51)}
      </>
    ),
    bottom: 51,
  },
};

const CONTOUR_SCALE = 0.66;

/** The thin inset copy of the shape's outline, solid or dotted, scaled about its inner point. */
function edgeArt(edge: string, shape: ShapeArt) {
  if (edge === 'plain') return null;
  const [x, y] = shape.inner as Point;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${CONTOUR_SCALE}) translate(${-x} ${-y})`}
      strokeWidth={round1(1.3 / CONTOUR_SCALE)}
      strokeDasharray={edge === 'dotted' ? '0 4.5' : undefined}
    >
      {shape.art}
    </g>
  );
}

function spineArt(spine: string, bottom: number, end: string) {
  const knob = (cx: number, cy: number, r = 2.2) => dot(cx, cy, r, CENTRE_W.regular);
  if (spine === 'through')
    return (
      <>
        {line(36, 20, 36, 52)}
        {end === 'serif' && (
          <>
            {line(33, 20, 39, 20)}
            {line(33, 52, 39, 52)}
          </>
        )}
        {end === 'knob' && (
          <>
            {knob(36, 20.5)}
            {knob(36, 51.5)}
          </>
        )}
      </>
    );
  if (spine === 'across')
    return (
      <>
        {line(20.5, 36, 51.5, 36)}
        {end === 'serif' && (
          <>
            {line(20.5, 33, 20.5, 39)}
            {line(51.5, 33, 51.5, 39)}
          </>
        )}
        {end === 'knob' && (
          <>
            {knob(21, 36)}
            {knob(51, 36)}
          </>
        )}
      </>
    );
  // A bare stub under the shape vanishes at 32px; the foot makes it a pedestal.
  if (spine === 'below')
    return (
      <>
        {line(36, bottom, 36, 52.5)}
        {end === 'serif' ? <path d="M30.5 50.5 V52.5 H41.5 V50.5" /> : line(30.5, 52.5, 41.5, 52.5)}
        {end === 'knob' && (
          <>
            {knob(30.5, 52.5, 2)}
            {knob(41.5, 52.5, 2)}
          </>
        )}
      </>
    );
  return null;
}

function innerArt(mark: string, [x, y]: Point) {
  if (mark === 'dot') return dot(x, y, 3.4, CENTRE_W.regular);
  if (mark === 'ring') return <circle cx={x}
    cy={y}
    r="3.8"
    strokeWidth="2" />;
  return null;
}

const TOP_ART: Record<string, ReactNode> = {
  dot: dot(36, 11, 3),
  tick: line(36, 7.5, 36, 14.5),
  triangle: <path d="M36 7.5 L40.5 14.5 H31.5 Z" />,
  bar: line(29.5, 11, 42.5, 11),
  twinDots: (
    <>
      {dot(31.5, 11, 2.5)}
      {dot(40.5, 11, 2.5)}
    </>
  ),
  chevron: <path d="M30 14.5 L36 8 L42 14.5" />,
  crown: (
    <>
      {line(30, 9, 30, 14.5)}
      {line(36, 7.5, 36, 14.5)}
      {line(42, 9, 42, 14.5)}
    </>
  ),
  cup: <path d="M30 8 A6 6 0 0 0 42 8" />,
  vee: <path d="M30 8 L36 14.5 L42 8" />,
  ring: <circle cx="36"
    cy="11"
    r="3.8" />,
  cross: (
    <>
      {line(36, 7, 36, 15)}
      {line(31.5, 11, 40.5, 11)}
    </>
  ),
};

const BASE_ART: Record<string, ReactNode> = {
  arc: <path d="M26 58 Q36 68.5 46 58" />,
  bar: line(25, 61, 47, 61),
  twoDots: (
    <>
      {dot(31, 61, 2.6)}
      {dot(41, 61, 2.6)}
    </>
  ),
  chevron: <path d="M28 58 L36 64 L44 58" />,
  doubleBar: (
    <>
      {line(27, 58, 45, 58)}
      {line(27, 64, 45, 64)}
    </>
  ),
  threeDots: (
    <>
      {dot(28, 61, 2.3)}
      {dot(36, 61, 2.3)}
      {dot(44, 61, 2.3)}
    </>
  ),
  wave: <path d="M24 61 Q28 56.5 32 61 T40 61 T48 61" />,
  bracket: <path d="M27 57.5 V64 H45 V57.5" />,
  dome: <path d="M26 64.5 Q36 54.5 46 64.5" />,
  pyramid: <path d="M36 57.5 L41 64.5 H31 Z" />,
  crenel: <path d="M24 64 H28 V58 H33 V64 H39 V58 H44 V64 H48" />,
};

/** Left-side marks; the right side draws the same art mirrored. */
const SIDE_ART: Record<string, ReactNode> = {
  dot: dot(12.5, 36, 2.7),
  bar: line(12.5, 29, 12.5, 43),
  twoDots: (
    <>
      {dot(12.5, 31, 2.4)}
      {dot(12.5, 41, 2.4)}
    </>
  ),
  paren: <path d="M15.5 28.5 Q8 36 15.5 43.5" />,
  chevron: <path d="M16 29.5 L10 36 L16 42.5" />,
  dashes: (
    <>
      {line(9.5, 30, 15.5, 30)}
      {line(9.5, 36, 15.5, 36)}
      {line(9.5, 42, 15.5, 42)}
    </>
  ),
  arrow: <path d="M10 30.5 L16 36 L10 41.5 Z" />,
  ring: <circle cx="12.5"
    cy="36"
    r="3.6" />,
  doubleBar: (
    <>
      {line(10, 29, 10, 43)}
      {line(15, 29, 15, 43)}
    </>
  ),
  rune: (
    <>
      {line(12.5, 28.5, 12.5, 37)}
      {dot(12.5, 42.5, 2.2)}
    </>
  ),
};

const BIND_W = 2;
const BIND_ART: Record<string, ReactNode> = {
  dot: dot(13.5, 13.5, 2.2, BIND_W),
  ring: <circle cx="13.5"
    cy="13.5"
    r="3.2" />,
  triangle: <path d="M13.5 9.5 L17.5 16.5 H9.5 Z" />,
  diamond: <path d="M13.5 9 L18 13.5 L13.5 18 L9 13.5 Z" />,
  square: <rect x="10"
    y="10"
    width="7"
    height="7" />,
  cross: (
    <>
      {line(13.5, 9.5, 13.5, 17.5)}
      {line(9.5, 13.5, 17.5, 13.5)}
    </>
  ),
  crescent: <path d="M15.5 9.8 A4.2 4.2 0 1 0 15.5 17.2 A4.6 4.6 0 0 1 15.5 9.8 Z" />,
  bar: line(9.5, 13.5, 17.5, 13.5),
  chevron: <path d="M10 16 L13.5 11 L17 16" />,
  vee: <path d="M10 11 L13.5 16 L17 11" />,
  twinDots: (
    <>
      {dot(11, 13.5, 1.8, BIND_W)}
      {dot(16, 13.5, 1.8, BIND_W)}
    </>
  ),
  hexagon: <path d="M10 13.5 L11.75 10.5 H15.25 L17 13.5 L15.25 16.5 H11.75 Z" />,
  asterisk: (
    <>
      {line(13.5, 9.5, 13.5, 17.5)}
      {line(10, 11.5, 17, 15.5)}
      {line(10, 15.5, 17, 11.5)}
    </>
  ),
  hourglass: <path d="M10 10 H17 L10 17 H17 Z" />,
  arc: <path d="M10 11 Q13.5 18.5 17 11" />,
};

const FRAME_RECT = <rect x="4.5"
  y="4.5"
  width="63"
  height="63"
  rx="6" />;

function frameArt(frame: string) {
  switch (frame) {
    case 'notched':
      return <path d="M10 4.5 H62 L67.5 10 V62 L62 67.5 H10 L4.5 62 V10 Z" />;
    case 'double':
      return (
        <>
          {FRAME_RECT}
          <rect x="2.75"
            y="2.75"
            width="66.5"
            height="66.5"
            rx="8" />
        </>
      );
    case 'studs':
      return (
        <>
          {FRAME_RECT}
          <g fill="currentColor"
            stroke="none"
            fillOpacity="0.9">
            <circle cx="4.5"
              cy="4.5"
              r="2" />
            <circle cx="67.5"
              cy="4.5"
              r="2" />
            <circle cx="4.5"
              cy="67.5"
              r="2" />
            <circle cx="67.5"
              cy="67.5"
              r="2" />
          </g>
        </>
      );
    case 'cracked':
      return (
        <>
          {FRAME_RECT}
          <path
            d="M71 19 L65.5 20.5 L63 16 L58.5 13.5 L57.5 8.5 L53 5 L52 1"
            stroke={STONE_EDGE}
            strokeOpacity="1"
            strokeWidth="1.6"
          />
        </>
      );
    case 'dashed':
      return <rect x="4.5"
        y="4.5"
        width="63"
        height="63"
        rx="6"
        strokeDasharray="4 3" />;
    case 'brackets':
      return (
        <path d="M4.5 18 V10.5 Q4.5 4.5 10.5 4.5 H18 M54 4.5 H61.5 Q67.5 4.5 67.5 10.5 V18 M67.5 54 V61.5 Q67.5 67.5 61.5 67.5 H54 M18 67.5 H10.5 Q4.5 67.5 4.5 61.5 V54" />
      );
    case 'rounded':
      return <rect x="4.5"
        y="4.5"
        width="63"
        height="63"
        rx="13" />;
    default:
      return FRAME_RECT;
  }
}

// Scatter points for the stone grain, spread over the tile.
const GRAIN_POINTS: Point[] = [
  [9, 24],
  [20, 8],
  [51, 9],
  [64, 21],
  [62, 48],
  [50, 64],
  [22, 63],
  [8, 46],
  [28, 29],
  [45, 44],
  [18, 40],
  [55, 33],
  [33, 52],
  [40, 18],
];
const PALE = '#8a7f70';

const GRAIN_ART: Record<string, ReactNode> = {
  pitted: (
    <g fill={STONE_EDGE}
      opacity="0.7">
      {GRAIN_POINTS.filter((_, i) => i % 2 === 0).map(([x, y]) => (
        <circle key={`${x},${y}`}
          cx={x}
          cy={y}
          r="0.8" />
      ))}
    </g>
  ),
  veined: <path d="M1 47 C18 39 30 53 48 33 S64 17 71 13"
    fill="none"
    stroke={PALE}
    strokeWidth="0.9"
    opacity="0.3" />,
  speckled: (
    <g fill={PALE}
      opacity="0.35">
      {GRAIN_POINTS.map(([x, y]) => (
        <circle key={`${x},${y}`}
          cx={x}
          cy={y}
          r="0.5" />
      ))}
    </g>
  ),
  scored: (
    <g stroke={PALE}
      strokeWidth="0.6"
      opacity="0.18">
      {line(2, 30, 30, 2)}
      {line(2, 50, 50, 2)}
      {line(22, 70, 70, 22)}
    </g>
  ),
  mottled: (
    <g fill={STONE_EDGE}
      opacity="0.22">
      <ellipse cx="18"
        cy="22"
        rx="9"
        ry="6" />
      <ellipse cx="54"
        cy="50"
        rx="10"
        ry="7" />
      <ellipse cx="50"
        cy="17"
        rx="6"
        ry="4" />
    </g>
  ),
  flecked: (
    <g stroke={PALE}
      strokeWidth="0.6"
      strokeLinecap="round"
      opacity="0.35">
      {GRAIN_POINTS.map(([x, y]) => (
        <line key={`${x},${y}`}
          x1={x}
          y1={y}
          x2={x + 1.2}
          y2={y - 0.8} />
      ))}
    </g>
  ),
  lichen: (
    <g fill="#5d6b4a"
      opacity="0.35">
      <circle cx="10"
        cy="62"
        r="1.3" />
      <circle cx="13"
        cy="64.5"
        r="0.9" />
      <circle cx="62"
        cy="61"
        r="1.1" />
      <circle cx="59"
        cy="64"
        r="0.8" />
      <circle cx="64"
        cy="57.5"
        r="0.7" />
      <circle cx="7.5"
        cy="58"
        r="0.7" />
    </g>
  ),
};

/**
 * Crack number `i` (1-255): from one of 32 points around the tile edge (8 per side), a 3-step hairline into the
 * stone, its course (lean, and a branch or not) from i's high bits, its wiggle from a PRNG seeded by i.
 */
function crackPath(i: number) {
  const slot = (i - 1) % 32;
  const course = (i - 1) >> 5;
  const side = slot >> 3;
  let s = Math.imul(i, 0x9e3779b1) >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 2 ** 32;
  };
  // (along, depth) from the side's start corner to tile coordinates.
  const toXY = ([u, d]: Point) =>
    (
      [
        [u, d],
        [72 - d, u],
        [72 - u, 72 - d],
        [d, 72 - u],
      ] as Point[]
    )[side];
  const walk = (start: Point, angle: number, steps: number) => {
    const out: Point[] = [start];
    let [u, d] = start;
    for (let k = 0; k < steps; k++) {
      angle += (rand() - 0.5) * 1.1;
      const len = 2.4 + rand() * 1.4;
      u += Math.sin(angle) * len;
      d += Math.cos(angle) * len;
      out.push([u, d]);
    }
    return out;
  };
  const lean = ((course & 3) - 1.5) * 0.35;
  const trunk = walk([10 + (slot & 7) * 7.4, 0.5], lean, 3);
  const polyline = (list: Point[]) => `M${list.map((p) => pts([toXY(p)])).join(' L')}`;
  const branch = course & 4 ? ` ${polyline(walk(trunk[1], lean + (lean < 0 ? 0.9 : -0.9), 2))}` : '';
  return polyline(trunk) + branch;
}

const CRACK_PATHS: Record<string, string | null> = Object.fromEntries(
  CRACKS.map((key, i) => [key, i ? crackPath(i) : null]),
);

/** One outer mark in its zone at the given weight, nudged `inset` toward the centre along (dx, dy). */
function markArt(
  art: ReactNode | undefined,
  weight: string,
  inset: string,
  ends: string,
  dx: number,
  dy: number,
) {
  if (!art) return null;
  const square = ends === 'square';
  return (
    <g
      strokeWidth={MARK_W[weight]}
      transform={inset === 'inset' ? `translate(${dx * INSET} ${dy * INSET})` : undefined}
      strokeLinecap={square ? 'square' : undefined}
      strokeLinejoin={square ? 'miter' : undefined}
    >
      {art}
    </g>
  );
}

/**
 * An account's tomb glyph: a carved stone tile with the glyph `code` (a BigInt from lib/glyph-code.ts)
 * stroked in one Diablo II item colour. Pure inline SVG, `size` px square. An invalid code draws the bare granite
 * tile. Decorative: the overlay always shows the name beside it (the website's `title` prop is left out).
 */
export function TombGlyph({
  code,
  size = 32,
  className,
}: {
  code: bigint | number | null | undefined;
  size?: number;
  className?: string;
}) {
  const parts = isValidGlyphCode(code) ? decodeGlyph(code) : null;
  const shape = parts && SHAPE_ART[parts.shape];
  const hex = (key: string) => GLYPH_COLORS.find((c) => c.key === key)!.hex;
  const color = parts && hex(parts.color);
  const frameColor = !parts || parts.accent === 'none' ? color : hex(parts.accent);
  const [stone, bevel] = STONE_TINTS[parts ? parts.stone : 'granite'];
  const shadow = parts && CARVE_SHADOWS[parts.carve];
  const glyph = parts && shape && (
    <>
      <g strokeWidth={CENTRE_W[parts.centreWeight]}
        transform={ORIENT_TRANSFORMS[parts.orientation]}>
        {shape.art}
        {shape.inner && edgeArt(parts.edge, shape)}
        {spineArt(parts.spine, shape.bottom, parts.spineEnd)}
        {shape.inner && innerArt(parts.inner, shape.inner)}
      </g>
      {markArt(TOP_ART[parts.top], parts.topWeight, parts.topInset, parts.topEnds, 0, 1)}
      {markArt(BASE_ART[parts.base], parts.baseWeight, parts.baseInset, parts.baseEnds, 0, -1)}
      {markArt(SIDE_ART[parts.left], parts.sideWeight, parts.sideInset, parts.sideEnds, 1, 0)}
      <g transform={MIRROR}>
        {markArt(SIDE_ART[parts.right], parts.sideWeight, parts.sideInset, parts.sideEnds, 1, 0)}
      </g>
      <g strokeWidth={BIND_W}
        opacity="0.9">
        {BIND_ART[parts.bind]}
      </g>
    </>
  );
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 72 72"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1"
        y="1"
        width="70"
        height="70"
        rx="10"
        fill={stone}
        stroke={STONE_EDGE}
        strokeWidth="2" />
      {parts && GRAIN_ART[parts.grain]}
      <rect x="2.5"
        y="2.5"
        width="67"
        height="67"
        rx="8.5"
        fill="none"
        stroke={bevel}
        strokeWidth="1" />
      {parts && parts.crack !== 'none' && (
        <path
          d={CRACK_PATHS[parts.crack]}
          fill="none"
          stroke={STONE_EDGE}
          strokeWidth="1.1"
          strokeOpacity="0.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {parts && (
        <g fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round">
          <g color={frameColor}
            strokeWidth={FRAME_W[parts.frameWeight]}
            strokeOpacity="0.45">
            {frameArt(parts.frame)}
          </g>
          {shadow && (
            <g color={shadow.color}
              opacity={shadow.opacity}
              transform={`translate(${shadow.dx} ${shadow.dx})`}>
              {glyph}
            </g>
          )}
          <g color={color}>{glyph}</g>
        </g>
      )}
    </svg>
  );
}
