/**
 * Design token names and tiers.
 *
 * - **Primitive** (`PALETTE`): raw palette colors. Only theme definitions reference these; feature code never does.
 * - **Semantic** (`SEMANTIC_TOKENS`): what UI is styled with (`bg-surface`, `text-muted-foreground`, `border-border`…).
 * - **Domain** (`DOMAIN_TOKENS`): Diablo II meaning (item quality colors `text-q-unique`…, the highlight `glow`).
 * - **Shape** (`SHAPE_TOKENS`): the per-theme base radius; the radius scale in `scales.ts` derives from it.
 *
 * Every theme defines every token in `THEME_TOKENS`. Token names are CSS custom property names without the
 * leading `--` (`background` → `--background`); Tailwind exposes each color token as `--color-<token>`.
 */

export type ThemeMode = 'dark' | 'light';

export const SEMANTIC_TOKENS = [
  // shadcn
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'sidebar',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
  // status and surfaces
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'surface',
  'surface-foreground',
  'surface-elevated',
  'scrim',
] as const;

export const DOMAIN_TOKENS = [
  'glow',
  // D2 item quality
  'q-unique',
  'q-set',
  'q-rare',
  'q-magic',
  'q-crafted',
  'q-rune',
  'q-normal',
  'q-gold',
  'q-corrupted',
  'q-corrupted-zone',
  // Damage types
  'dmg-fire',
  'dmg-cold',
  'dmg-lightning',
  'dmg-poison',
  'dmg-physical',
  'dmg-magic',
  // Character classes (portrait rings, class names)
  'class-amazon',
  'class-assassin',
  'class-barbarian',
  'class-druid',
  'class-necromancer',
  'class-paladin',
  'class-sorceress',
] as const;

export const SHAPE_TOKENS = ['radius'] as const;

export const THEME_TOKENS = [...SEMANTIC_TOKENS, ...DOMAIN_TOKENS, ...SHAPE_TOKENS] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];
export type ColorToken = Exclude<ThemeToken, (typeof SHAPE_TOKENS)[number]>;
export type QualityToken = Extract<ThemeToken, `q-${string}`>;
export type DamageToken = Extract<ThemeToken, `dmg-${string}`>;
export type ClassToken = Extract<ThemeToken, `class-${string}`>;

export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  description?: string;
  /** [background-ish, primary/accent, highlight] for picker cards. */
  swatch: [string, string, string];
  /** Keys are CSS var names without the leading `--`. Colors are oklch (alpha allowed), `radius` a length. */
  vars: Record<ThemeToken, string>;
}

/** Primitive tier: Tailwind v4 palette values (what the app used ad hoc before tokens existed) and ink colors. */
export const PALETTE = {
  green400: 'oklch(0.792 0.209 151.711)',
  green500: 'oklch(0.723 0.219 149.579)',
  green700: 'oklch(0.527 0.154 150.069)',
  green800: 'oklch(0.448 0.119 151.328)',
  yellow400: 'oklch(0.852 0.199 91.936)',
  yellow600: 'oklch(0.681 0.162 75.834)',
  blue400: 'oklch(0.707 0.165 254.624)',
  blue700: 'oklch(0.488 0.243 264.376)',
  amber400: 'oklch(0.828 0.189 84.429)',
  amber700: 'oklch(0.555 0.163 48.998)',
  sky400: 'oklch(0.746 0.16 232.661)',
  sky700: 'oklch(0.5 0.134 242.749)',
  red400: 'oklch(0.704 0.191 22.216)',
  red700: 'oklch(0.505 0.213 27.518)',
  purple400: 'oklch(0.714 0.203 305.504)',
  purple700: 'oklch(0.496 0.265 301.924)',
  gray100: 'oklch(0.967 0.003 264.542)',
  gray500: 'oklch(0.551 0.027 264.364)',
  /** Text on saturated dark-mode status fills. */
  darkInk: 'oklch(0.142 0.004 285.819)',
  /** Text on saturated light-mode status fills. */
  lightInk: 'oklch(1 0 0)',
  /** Exact pre-theme unique color; the default `q-unique` and `glow`. */
  uniqueGold: 'oklch(0.799 0.092 76.775)',
} as const;
