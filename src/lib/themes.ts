/**
 * Theme registry: 21 color themes (11 dark, 10 light).
 *
 * Every theme defines the full per-theme token set listed in `THEME_TOKENS`.
 * `vars` keys are CSS custom property names WITHOUT the leading `--`
 * (`vars.background` → `--background`). Values are complete CSS colors
 * (hsl/oklch/hex, alpha allowed), except `radius` (a length).
 *
 * `applyTheme` writes the vars inline on `<html>`, sets `data-theme`, the
 * `dark`/`light` class and `color-scheme`, and caches the id in localStorage so
 * `initTheme()` (called from main.tsx before the first render) can paint the
 * right theme immediately in every window while settings load from disk.
 * The static default in `:root` of globals.css mirrors `sanctuary`.
 */

import { useSyncExternalStore, type CSSProperties } from 'react';

export type ThemeMode = 'dark' | 'light';

export const THEME_TOKENS = [
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
  // semantic
  'success',
  'success-foreground',
  'warning',
  'warning-foreground',
  'info',
  'info-foreground',
  'surface',
  'surface-foreground',
  'surface-elevated',
  'glow',
  'scrim',
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
  // shape
  'radius',
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];

export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  description?: string;
  /** [background-ish, primary/accent, highlight] for picker cards. */
  swatch: [string, string, string];
  /** Keys are CSS var names without the leading `--`. */
  vars: Record<ThemeToken, string>;
}

type QualityToken = Extract<ThemeToken, `q-${string}`>;

interface ThemeSpec {
  id: string;
  name: string;
  mode: ThemeMode;
  description: string;
  background: string;
  foreground: string;
  card: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  glow: string;
  charts: [string, string, string, string, string];
  quality?: Partial<Record<QualityToken, string>>;
  overrides?: Partial<Record<ThemeToken, string>>;
}

/**
 * `color` at the window opacity chosen in Settings → Interface → Window transparency. Panels use
 * `--window-opacity`; popovers, tooltips and toasts (`elevated`) use the gentler `--window-opacity-elevated`
 * so text floating over a see-through panel stays readable. Both are set by `applyWindowTransparency`.
 */
const atWindowOpacity = (color: string, layer: 'panel' | 'elevated' = 'panel') =>
  `color-mix(in oklab, ${color} var(${layer === 'elevated' ? '--window-opacity-elevated' : '--window-opacity'}), transparent)`;

// Tailwind v4 palette values (what the app used ad hoc before tokens existed).
const TW = {
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
  gray100: 'oklch(0.967 0.003 264.542)',
  gray500: 'oklch(0.551 0.027 264.364)',
} as const;

const DARK_QUALITY: Record<QualityToken, string> = {
  'q-unique': '#dfb679', // exact pre-theme unique color
  'q-set': TW.green400,
  'q-rare': TW.yellow400,
  'q-magic': TW.blue400,
  'q-crafted': TW.yellow600,
  'q-rune': 'oklch(0.75 0.18 55)',
  'q-normal': TW.gray100,
  'q-gold': 'hsl(42 75% 62%)',
  'q-corrupted': TW.red400,
};

const LIGHT_QUALITY: Omit<Record<QualityToken, string>, 'q-normal'> = {
  'q-unique': 'hsl(33 60% 32%)',
  'q-set': TW.green800,
  'q-rare': 'hsl(45 95% 25%)',
  'q-magic': TW.blue700,
  'q-crafted': 'hsl(32 85% 33%)',
  'q-rune': 'hsl(16 85% 40%)',
  'q-gold': 'hsl(42 85% 27%)',
  'q-corrupted': TW.red700,
};

const DARK_INK = 'hsl(240 10% 4%)';
const LIGHT_INK = 'hsl(0 0% 100%)';

function defineTheme(s: ThemeSpec): Theme {
  const dark = s.mode === 'dark';
  const vars: Record<ThemeToken, string> = {
    background: s.background,
    foreground: s.foreground,
    card: s.card,
    'card-foreground': s.foreground,
    popover: s.popover,
    'popover-foreground': s.foreground,
    primary: s.primary,
    'primary-foreground': s.primaryForeground,
    secondary: s.secondary,
    'secondary-foreground': s.foreground,
    muted: s.muted,
    'muted-foreground': s.mutedForeground,
    accent: s.accent,
    'accent-foreground': s.accentForeground,
    destructive: s.destructive,
    'destructive-foreground': 'hsl(0 0% 98%)',
    border: s.border,
    input: s.input,
    ring: s.ring,
    'chart-1': s.charts[0],
    'chart-2': s.charts[1],
    'chart-3': s.charts[2],
    'chart-4': s.charts[3],
    'chart-5': s.charts[4],
    sidebar: s.popover,
    'sidebar-foreground': s.foreground,
    'sidebar-primary': s.primary,
    'sidebar-primary-foreground': s.primaryForeground,
    'sidebar-accent': s.accent,
    'sidebar-accent-foreground': s.accentForeground,
    'sidebar-border': s.border,
    'sidebar-ring': s.ring,
    success: dark ? TW.green500 : TW.green700,
    'success-foreground': dark ? DARK_INK : LIGHT_INK,
    warning: dark ? TW.amber400 : TW.amber700,
    'warning-foreground': dark ? DARK_INK : LIGHT_INK,
    info: dark ? TW.sky400 : TW.sky700,
    'info-foreground': dark ? DARK_INK : LIGHT_INK,
    surface: atWindowOpacity(s.background),
    'surface-foreground': s.foreground,
    'surface-elevated': atWindowOpacity(s.popover, 'elevated'),
    glow: s.glow,
    scrim: dark ? 'hsl(0 0% 0% / 0.6)' : 'hsl(220 25% 10% / 0.35)',
    ...(dark ? DARK_QUALITY : { ...LIGHT_QUALITY, 'q-normal': s.foreground }),
    ...s.quality,
    radius: '0.5rem',
    ...s.overrides,
  };
  return {
    id: s.id,
    name: s.name,
    mode: s.mode,
    description: s.description,
    swatch: [s.background, s.primary, s.glow],
    vars,
  };
}

const DARK_THEMES: Theme[] = [
  defineTheme({
    id: 'sanctuary',
    name: 'Sanctuary',
    mode: 'dark',
    description: 'The classic look: neutral zinc night with unique-gold highlights.',
    background: 'hsl(240 10% 3.9%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(240 3.7% 15.9%)',
    popover: 'hsl(240 10% 3.9%)',
    primary: 'hsl(0 0% 98%)',
    primaryForeground: 'hsl(240 5.9% 10%)',
    secondary: 'hsl(240 3.7% 15.9%)',
    muted: 'hsl(240 3.7% 15.9%)',
    mutedForeground: 'hsl(240 5% 64.9%)',
    accent: 'hsl(240 3.7% 15.9%)',
    accentForeground: 'hsl(0 0% 98%)',
    destructive: 'hsl(0 72% 51%)', // was hsl(0 62.8% 30.6%): too dark for error text on the dark surface
    border: 'hsl(240 3.7% 15.9%)',
    input: TW.gray500,
    ring: 'hsl(240 4.9% 83.9%)',
    glow: '#dfb679',
    charts: ['hsl(220 70% 50%)', 'hsl(160 60% 45%)', 'hsl(30 80% 55%)', 'hsl(280 65% 60%)', 'hsl(340 75% 55%)'],
    overrides: { 'surface-elevated': atWindowOpacity('hsl(240 6% 10%)', 'elevated') },
  }),
  defineTheme({
    id: 'burning-hells',
    name: 'Burning Hells',
    mode: 'dark',
    description: 'Charcoal and smouldering ember orange.',
    background: 'hsl(15 12% 5%)',
    foreground: 'hsl(30 20% 95%)',
    card: 'hsl(12 10% 12%)',
    popover: 'hsl(15 12% 7%)',
    primary: 'hsl(18 90% 55%)',
    primaryForeground: 'hsl(15 30% 6%)',
    secondary: 'hsl(12 10% 16%)',
    muted: 'hsl(12 10% 14%)',
    mutedForeground: 'hsl(20 12% 66%)',
    accent: 'hsl(14 30% 18%)',
    accentForeground: 'hsl(30 20% 95%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(12 12% 18%)',
    input: 'hsl(14 10% 30%)',
    ring: 'hsl(18 90% 55%)',
    glow: 'hsl(20 95% 55%)',
    charts: ['hsl(18 90% 55%)', 'hsl(40 90% 55%)', 'hsl(0 75% 58%)', 'hsl(30 30% 62%)', 'hsl(350 60% 62%)'],
  }),
  defineTheme({
    id: 'horadric',
    name: 'Horadric Arcana',
    mode: 'dark',
    description: 'Deep lapis blue with bright arcane runes.',
    background: 'hsl(222 40% 6%)',
    foreground: 'hsl(215 30% 95%)',
    card: 'hsl(222 30% 12%)',
    popover: 'hsl(222 38% 8%)',
    primary: 'hsl(217 91% 62%)',
    primaryForeground: 'hsl(222 47% 8%)',
    secondary: 'hsl(222 25% 17%)',
    muted: 'hsl(222 25% 15%)',
    mutedForeground: 'hsl(218 18% 68%)',
    accent: 'hsl(222 35% 20%)',
    accentForeground: 'hsl(215 30% 95%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(222 25% 19%)',
    input: 'hsl(220 20% 32%)',
    ring: 'hsl(217 91% 62%)',
    glow: 'hsl(210 100% 65%)',
    charts: ['hsl(217 91% 62%)', 'hsl(45 85% 60%)', 'hsl(175 60% 48%)', 'hsl(265 70% 68%)', 'hsl(340 70% 62%)'],
  }),
  defineTheme({
    id: 'kurast-jungle',
    name: 'Kurast Jungle',
    mode: 'dark',
    description: 'Shadowed canopy greens with emerald accents.',
    background: 'hsl(160 30% 5%)',
    foreground: 'hsl(140 20% 94%)',
    card: 'hsl(162 22% 11%)',
    popover: 'hsl(160 28% 7%)',
    primary: 'hsl(152 65% 48%)',
    primaryForeground: 'hsl(160 40% 6%)',
    secondary: 'hsl(162 20% 16%)',
    muted: 'hsl(162 20% 14%)',
    mutedForeground: 'hsl(150 12% 66%)',
    accent: 'hsl(165 30% 18%)',
    accentForeground: 'hsl(140 20% 94%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(162 20% 18%)',
    input: 'hsl(160 14% 30%)',
    ring: 'hsl(152 65% 48%)',
    glow: 'hsl(165 80% 50%)',
    charts: ['hsl(152 65% 48%)', 'hsl(185 60% 50%)', 'hsl(80 55% 52%)', 'hsl(40 80% 58%)', 'hsl(15 70% 60%)'],
  }),
  defineTheme({
    id: 'arreat-summit',
    name: 'Arreat Summit',
    mode: 'dark',
    description: 'Cold slate rock under icy glacier blue.',
    background: 'hsl(210 25% 7%)',
    foreground: 'hsl(200 30% 96%)',
    card: 'hsl(212 20% 14%)',
    popover: 'hsl(210 24% 9%)',
    primary: 'hsl(195 85% 70%)',
    primaryForeground: 'hsl(210 40% 8%)',
    secondary: 'hsl(212 18% 19%)',
    muted: 'hsl(212 18% 16%)',
    mutedForeground: 'hsl(205 15% 68%)',
    accent: 'hsl(205 25% 21%)',
    accentForeground: 'hsl(200 30% 96%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(212 18% 21%)',
    input: 'hsl(210 14% 34%)',
    ring: 'hsl(195 85% 70%)',
    glow: 'hsl(190 90% 75%)',
    charts: ['hsl(195 85% 65%)', 'hsl(220 70% 65%)', 'hsl(170 50% 55%)', 'hsl(250 50% 72%)', 'hsl(35 70% 62%)'],
  }),
  defineTheme({
    id: 'tal-rasha',
    name: "Tal Rasha's Tomb",
    mode: 'dark',
    description: 'Desert night: warm sandstone and burnished bronze.',
    background: 'hsl(30 18% 6%)',
    foreground: 'hsl(38 35% 92%)',
    card: 'hsl(30 15% 12%)',
    popover: 'hsl(30 16% 8%)',
    primary: 'hsl(36 70% 55%)',
    primaryForeground: 'hsl(30 30% 8%)',
    secondary: 'hsl(30 14% 17%)',
    muted: 'hsl(30 14% 15%)',
    mutedForeground: 'hsl(35 15% 66%)',
    accent: 'hsl(32 22% 19%)',
    accentForeground: 'hsl(38 35% 92%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(30 14% 19%)',
    input: 'hsl(30 12% 32%)',
    ring: 'hsl(36 70% 55%)',
    glow: 'hsl(38 85% 58%)',
    charts: ['hsl(36 70% 55%)', 'hsl(18 60% 55%)', 'hsl(180 35% 50%)', 'hsl(50 60% 60%)', 'hsl(0 45% 58%)'],
  }),
  defineTheme({
    id: 'zakarum',
    name: 'Zakarum',
    mode: 'dark',
    description: 'Royal temple purple trimmed with gold.',
    background: 'hsl(268 30% 7%)',
    foreground: 'hsl(270 20% 96%)',
    card: 'hsl(268 24% 13%)',
    popover: 'hsl(268 28% 9%)',
    primary: 'hsl(45 85% 60%)',
    primaryForeground: 'hsl(268 40% 10%)',
    secondary: 'hsl(268 22% 18%)',
    muted: 'hsl(268 22% 15%)',
    mutedForeground: 'hsl(268 12% 70%)',
    accent: 'hsl(270 30% 22%)',
    accentForeground: 'hsl(270 20% 96%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(268 22% 20%)',
    input: 'hsl(268 14% 34%)',
    ring: 'hsl(45 85% 60%)',
    glow: 'hsl(275 80% 65%)',
    charts: ['hsl(45 85% 60%)', 'hsl(275 70% 68%)', 'hsl(320 60% 62%)', 'hsl(200 60% 60%)', 'hsl(160 45% 52%)'],
  }),
  defineTheme({
    id: 'blood-moor',
    name: 'Blood Moor',
    mode: 'dark',
    description: 'Obsidian black cut with crimson.',
    background: 'hsl(350 15% 4%)',
    foreground: 'hsl(0 10% 95%)',
    card: 'hsl(350 12% 10%)',
    popover: 'hsl(350 14% 6%)',
    primary: 'hsl(352 75% 52%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(350 12% 15%)',
    muted: 'hsl(350 12% 13%)',
    mutedForeground: 'hsl(355 8% 66%)',
    accent: 'hsl(350 25% 17%)',
    accentForeground: 'hsl(0 10% 95%)',
    destructive: 'hsl(0 75% 48%)',
    border: 'hsl(350 12% 16%)',
    input: 'hsl(350 10% 30%)',
    ring: 'hsl(352 75% 52%)',
    glow: 'hsl(352 85% 55%)',
    charts: ['hsl(352 75% 55%)', 'hsl(25 80% 55%)', 'hsl(0 0% 70%)', 'hsl(330 50% 60%)', 'hsl(45 70% 58%)'],
  }),
  defineTheme({
    id: 'worldstone',
    name: 'Worldstone',
    mode: 'dark',
    description: 'Deep indigo keep lit by crystal cyan.',
    background: 'hsl(238 40% 7%)',
    foreground: 'hsl(220 40% 96%)',
    card: 'hsl(238 30% 13%)',
    popover: 'hsl(238 36% 9%)',
    primary: 'hsl(185 85% 55%)',
    primaryForeground: 'hsl(238 45% 10%)',
    secondary: 'hsl(238 26% 18%)',
    muted: 'hsl(238 26% 15%)',
    mutedForeground: 'hsl(230 18% 70%)',
    accent: 'hsl(235 32% 21%)',
    accentForeground: 'hsl(220 40% 96%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(238 26% 20%)',
    input: 'hsl(236 18% 34%)',
    ring: 'hsl(185 85% 55%)',
    glow: 'hsl(185 95% 60%)',
    charts: ['hsl(185 85% 55%)', 'hsl(250 70% 70%)', 'hsl(210 80% 62%)', 'hsl(300 55% 65%)', 'hsl(150 55% 55%)'],
  }),
  defineTheme({
    id: 'nightmare',
    name: 'Nightmare',
    mode: 'dark',
    description: 'True OLED black with a violet edge.',
    background: 'hsl(0 0% 0%)',
    foreground: 'hsl(0 0% 96%)',
    card: 'hsl(270 8% 7%)',
    popover: 'hsl(0 0% 3%)',
    primary: 'hsl(265 85% 68%)',
    primaryForeground: 'hsl(265 50% 8%)',
    secondary: 'hsl(270 6% 11%)',
    muted: 'hsl(270 6% 9%)',
    mutedForeground: 'hsl(265 6% 64%)',
    accent: 'hsl(268 25% 14%)',
    accentForeground: 'hsl(0 0% 96%)',
    destructive: 'hsl(0 72% 50%)',
    border: 'hsl(270 6% 13%)',
    input: 'hsl(268 8% 28%)',
    ring: 'hsl(265 85% 68%)',
    glow: 'hsl(268 90% 65%)',
    charts: ['hsl(265 85% 68%)', 'hsl(190 80% 55%)', 'hsl(330 75% 62%)', 'hsl(45 85% 60%)', 'hsl(150 60% 52%)'],
  }),
  defineTheme({
    id: 'classic-diablo-ii',
    name: 'Classic Diablo II',
    mode: 'dark',
    description: 'The in-game look: grey stone panels, black item slots with bronze trim, red buttons and gold text.',
    // Colours sampled from the original game: neutral grey stone, black slots, bronze bevels (#7d6a43),
    // the gold of headers and unique items (#C7B377), dark blood red of the skill bar, indigo inventory cells.
    background: 'hsl(30 3% 9%)',
    foreground: 'hsl(0 0% 88%)',
    card: 'hsl(0 0% 3%)',
    popover: 'hsl(0 0% 0% / 0.9)',
    primary: 'hsl(0 70% 24%)',
    primaryForeground: 'hsl(45 40% 62%)',
    secondary: 'hsl(30 3% 16%)',
    muted: 'hsl(30 3% 12%)',
    mutedForeground: 'hsl(40 10% 58%)',
    accent: 'hsl(235 32% 16%)',
    accentForeground: 'hsl(0 0% 94%)',
    destructive: 'hsl(0 100% 65%)',
    border: 'hsl(40 30% 26%)',
    input: 'hsl(40 30% 30%)',
    ring: 'hsl(45 40% 62%)',
    glow: 'hsl(0 75% 38%)',
    charts: ['hsl(45 40% 62%)', 'hsl(0 70% 50%)', 'hsl(120 100% 45%)', 'hsl(240 100% 71%)', 'hsl(40 100% 50%)'],
    // The game's own item text colours.
    quality: {
      'q-unique': '#C7B377',
      'q-set': '#00FF00',
      'q-rare': '#FFFF64',
      'q-magic': '#6969FF',
      'q-crafted': '#FFA800',
      'q-rune': '#FFA800',
      'q-normal': '#FFFFFF',
      'q-gold': '#C7B377',
      'q-corrupted': '#FF4D4D',
    },
    overrides: {
      radius: '0px',
      'secondary-foreground': 'hsl(45 40% 62%)',
      'surface-elevated': atWindowOpacity('hsl(0 0% 0%)', 'elevated'),
    },
  }),
];

const LIGHT_CHARTS: ThemeSpec['charts'] = [
  'hsl(220 70% 45%)',
  'hsl(160 60% 34%)',
  'hsl(30 85% 45%)',
  'hsl(280 55% 50%)',
  'hsl(340 70% 48%)',
];

const LIGHT_THEMES: Theme[] = [
  defineTheme({
    id: 'identify',
    name: 'Scroll of Identify',
    mode: 'light',
    description: 'Crisp neutral paper with ink-black controls.',
    background: 'hsl(0 0% 98%)',
    foreground: 'hsl(240 10% 4%)',
    card: 'hsl(0 0% 100%)',
    popover: 'hsl(0 0% 100%)',
    primary: 'hsl(240 6% 10%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(240 5% 92%)',
    muted: 'hsl(240 5% 94%)',
    mutedForeground: 'hsl(240 4% 38%)',
    accent: 'hsl(240 5% 92%)',
    accentForeground: 'hsl(240 6% 10%)',
    destructive: 'hsl(0 72% 45%)',
    border: 'hsl(240 6% 88%)',
    input: 'hsl(240 5% 74%)',
    ring: 'hsl(240 5% 30%)',
    glow: 'hsl(36 70% 45%)',
    charts: LIGHT_CHARTS,
  }),
  defineTheme({
    id: 'rogue-encampment',
    name: 'Rogue Encampment',
    mode: 'light',
    description: 'Warm parchment and saddle leather.',
    background: 'hsl(40 40% 94%)',
    foreground: 'hsl(28 30% 14%)',
    card: 'hsl(42 45% 97%)',
    popover: 'hsl(42 45% 97%)',
    primary: 'hsl(24 55% 34%)',
    primaryForeground: 'hsl(40 50% 97%)',
    secondary: 'hsl(38 30% 87%)',
    muted: 'hsl(38 30% 89%)',
    mutedForeground: 'hsl(28 18% 34%)',
    accent: 'hsl(36 40% 84%)',
    accentForeground: 'hsl(28 30% 14%)',
    destructive: 'hsl(0 70% 42%)',
    border: 'hsl(36 25% 80%)',
    input: 'hsl(34 20% 68%)',
    ring: 'hsl(24 55% 40%)',
    glow: 'hsl(30 70% 45%)',
    charts: ['hsl(24 55% 40%)', 'hsl(150 40% 32%)', 'hsl(40 80% 40%)', 'hsl(205 50% 40%)', 'hsl(350 50% 42%)'],
  }),
  defineTheme({
    id: 'lut-gholein',
    name: 'Lut Gholein',
    mode: 'light',
    description: 'Sun-bleached sand with turquoise tiles.',
    background: 'hsl(42 45% 93%)',
    foreground: 'hsl(195 35% 14%)',
    card: 'hsl(44 50% 97%)',
    popover: 'hsl(44 50% 97%)',
    primary: 'hsl(178 70% 28%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(40 35% 86%)',
    muted: 'hsl(40 35% 88%)',
    mutedForeground: 'hsl(190 15% 33%)',
    accent: 'hsl(176 40% 86%)',
    accentForeground: 'hsl(180 50% 18%)',
    destructive: 'hsl(0 70% 42%)',
    border: 'hsl(40 28% 79%)',
    input: 'hsl(38 20% 66%)',
    ring: 'hsl(178 70% 32%)',
    glow: 'hsl(176 75% 38%)',
    charts: ['hsl(178 70% 32%)', 'hsl(32 80% 45%)', 'hsl(210 60% 42%)', 'hsl(350 55% 45%)', 'hsl(90 40% 36%)'],
  }),
  defineTheme({
    id: 'harrogath',
    name: 'Harrogath',
    mode: 'light',
    description: 'Fresh snow and forged steel blue.',
    background: 'hsl(210 30% 96%)',
    foreground: 'hsl(215 35% 14%)',
    card: 'hsl(0 0% 100%)',
    popover: 'hsl(0 0% 100%)',
    primary: 'hsl(212 55% 38%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(212 25% 90%)',
    muted: 'hsl(212 25% 92%)',
    mutedForeground: 'hsl(214 16% 37%)',
    accent: 'hsl(208 40% 89%)',
    accentForeground: 'hsl(215 45% 20%)',
    destructive: 'hsl(0 72% 45%)',
    border: 'hsl(212 22% 84%)',
    input: 'hsl(212 16% 70%)',
    ring: 'hsl(212 55% 45%)',
    glow: 'hsl(205 80% 55%)',
    charts: ['hsl(212 55% 42%)', 'hsl(190 60% 38%)', 'hsl(30 80% 45%)', 'hsl(260 45% 50%)', 'hsl(350 60% 46%)'],
  }),
  defineTheme({
    id: 'westmarch',
    name: 'Westmarch',
    mode: 'light',
    description: 'Cool cut stone with formal navy.',
    background: 'hsl(220 8% 93%)',
    foreground: 'hsl(225 40% 13%)',
    card: 'hsl(220 10% 98%)',
    popover: 'hsl(220 10% 98%)',
    primary: 'hsl(226 55% 26%)',
    primaryForeground: 'hsl(0 0% 98%)',
    secondary: 'hsl(220 8% 86%)',
    muted: 'hsl(220 8% 88%)',
    mutedForeground: 'hsl(222 10% 34%)',
    accent: 'hsl(224 25% 86%)',
    accentForeground: 'hsl(226 50% 20%)',
    destructive: 'hsl(0 70% 42%)',
    border: 'hsl(220 8% 80%)',
    input: 'hsl(220 8% 66%)',
    ring: 'hsl(226 55% 40%)',
    glow: 'hsl(226 70% 50%)',
    charts: ['hsl(226 55% 36%)', 'hsl(0 55% 45%)', 'hsl(40 75% 42%)', 'hsl(180 40% 34%)', 'hsl(280 35% 45%)'],
  }),
  defineTheme({
    id: 'tristram',
    name: 'Tristram',
    mode: 'light',
    description: 'Quiet village sage and mossy green.',
    background: 'hsl(90 18% 93%)',
    foreground: 'hsl(100 25% 12%)',
    card: 'hsl(90 20% 97%)',
    popover: 'hsl(90 20% 97%)',
    primary: 'hsl(105 35% 30%)',
    primaryForeground: 'hsl(90 30% 97%)',
    secondary: 'hsl(92 16% 86%)',
    muted: 'hsl(92 16% 88%)',
    mutedForeground: 'hsl(100 12% 32%)',
    accent: 'hsl(95 22% 84%)',
    accentForeground: 'hsl(105 35% 18%)',
    destructive: 'hsl(0 70% 42%)',
    border: 'hsl(92 14% 80%)',
    input: 'hsl(92 10% 66%)',
    ring: 'hsl(105 35% 36%)',
    glow: 'hsl(100 50% 40%)',
    charts: ['hsl(105 35% 34%)', 'hsl(35 70% 42%)', 'hsl(200 45% 40%)', 'hsl(15 55% 45%)', 'hsl(60 45% 35%)'],
  }),
  defineTheme({
    id: 'kurast-docks',
    name: 'Kurast Docks',
    mode: 'light',
    description: 'Sea foam and deep harbour teal.',
    background: 'hsl(165 35% 94%)',
    foreground: 'hsl(190 45% 12%)',
    card: 'hsl(165 40% 98%)',
    popover: 'hsl(165 40% 98%)',
    primary: 'hsl(188 75% 26%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(168 25% 86%)',
    muted: 'hsl(168 25% 89%)',
    mutedForeground: 'hsl(188 18% 31%)',
    accent: 'hsl(170 40% 84%)',
    accentForeground: 'hsl(188 60% 16%)',
    destructive: 'hsl(0 70% 42%)',
    border: 'hsl(168 22% 80%)',
    input: 'hsl(170 14% 64%)',
    ring: 'hsl(188 75% 32%)',
    glow: 'hsl(175 70% 40%)',
    charts: ['hsl(188 75% 30%)', 'hsl(155 55% 34%)', 'hsl(25 80% 45%)', 'hsl(220 55% 45%)', 'hsl(340 55% 45%)'],
  }),
  defineTheme({
    id: 'skovos',
    name: 'Skovos Isles',
    mode: 'light',
    description: 'Amazon coast: open sky with coral accents.',
    background: 'hsl(200 60% 96%)',
    foreground: 'hsl(210 40% 14%)',
    card: 'hsl(0 0% 100%)',
    popover: 'hsl(0 0% 100%)',
    primary: 'hsl(8 75% 45%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(200 40% 89%)',
    muted: 'hsl(200 40% 91%)',
    mutedForeground: 'hsl(205 18% 35%)',
    accent: 'hsl(12 80% 92%)',
    accentForeground: 'hsl(8 65% 30%)',
    destructive: 'hsl(0 72% 42%)',
    border: 'hsl(200 30% 84%)',
    input: 'hsl(200 20% 68%)',
    ring: 'hsl(8 75% 50%)',
    glow: 'hsl(10 85% 58%)',
    charts: ['hsl(8 75% 48%)', 'hsl(200 70% 40%)', 'hsl(40 85% 42%)', 'hsl(170 55% 32%)', 'hsl(280 45% 50%)'],
  }),
  defineTheme({
    id: 'high-heavens',
    name: 'High Heavens',
    mode: 'light',
    description: 'Radiant ivory with angelic gold.',
    background: 'hsl(45 50% 96%)',
    foreground: 'hsl(35 30% 13%)',
    card: 'hsl(48 60% 99%)',
    popover: 'hsl(48 60% 99%)',
    primary: 'hsl(40 75% 32%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(45 35% 89%)',
    muted: 'hsl(45 35% 91%)',
    mutedForeground: 'hsl(38 16% 34%)',
    accent: 'hsl(46 60% 86%)',
    accentForeground: 'hsl(38 50% 20%)',
    destructive: 'hsl(0 70% 42%)',
    border: 'hsl(44 30% 82%)',
    input: 'hsl(42 20% 68%)',
    ring: 'hsl(40 75% 40%)',
    glow: 'hsl(45 90% 55%)',
    charts: ['hsl(40 75% 38%)', 'hsl(210 55% 45%)', 'hsl(15 65% 45%)', 'hsl(160 45% 34%)', 'hsl(280 40% 48%)'],
  }),
  defineTheme({
    id: 'pandemonium',
    name: 'Pandemonium Fortress',
    mode: 'light',
    description: 'Soft lilac halls with violet wards.',
    background: 'hsl(260 35% 96%)',
    foreground: 'hsl(262 35% 14%)',
    card: 'hsl(0 0% 100%)',
    popover: 'hsl(0 0% 100%)',
    primary: 'hsl(262 55% 45%)',
    primaryForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(260 25% 90%)',
    muted: 'hsl(260 25% 92%)',
    mutedForeground: 'hsl(262 14% 37%)',
    accent: 'hsl(262 45% 90%)',
    accentForeground: 'hsl(262 50% 24%)',
    destructive: 'hsl(0 72% 44%)',
    border: 'hsl(260 20% 85%)',
    input: 'hsl(260 14% 70%)',
    ring: 'hsl(262 55% 52%)',
    glow: 'hsl(265 75% 60%)',
    charts: ['hsl(262 55% 50%)', 'hsl(190 60% 38%)', 'hsl(330 60% 48%)', 'hsl(40 80% 42%)', 'hsl(150 45% 34%)'],
  }),
];

export const THEMES: Theme[] = [...DARK_THEMES, ...LIGHT_THEMES];

export const DEFAULT_THEME_ID = 'sanctuary';

export const THEME_STORAGE_KEY = 'pd2-theme-id';

export function getTheme(id?: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

/** Inline style object applying a theme's vars to a subtree (used by picker previews). */
export function themeStyle(theme: Theme): CSSProperties {
  const style: Record<string, string> = {};
  for (const token of THEME_TOKENS) style[`--${token}`] = theme.vars[token];
  return style as CSSProperties;
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  for (const token of THEME_TOKENS) root.style.setProperty(`--${token}`, theme.vars[token]);
  root.dataset.theme = theme.id;
  root.classList.toggle('dark', theme.mode === 'dark');
  root.classList.toggle('light', theme.mode === 'light');
  root.style.colorScheme = theme.mode;
  try {
    if (localStorage.getItem(THEME_STORAGE_KEY) !== theme.id) localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    // localStorage unavailable: first paint falls back to the :root default.
  }
}

/** Settings → Interface → Window transparency: 0% (opaque, the default) up to this many percent. */
export const WINDOW_TRANSPARENCY_MAX = 90;
const WINDOW_TRANSPARENCY_STORAGE_KEY = 'pd2-window-transparency';

/** Clamps a saved transparency (percent) to 0..WINDOW_TRANSPARENCY_MAX; anything invalid is opaque. */
export function clampWindowTransparency(percent: number | undefined): number {
  if (typeof percent !== 'number' || !Number.isFinite(percent)) return 0;
  return Math.min(WINDOW_TRANSPARENCY_MAX, Math.max(0, Math.round(percent)));
}

/**
 * Sets `--window-opacity` (panels) and `--window-opacity-elevated` (popovers, tooltips, toasts: a third of
 * the transparency) on `<html>` and caches the value for `initTheme`'s first paint.
 */
export function applyWindowTransparency(
  percent: number | undefined,
  root: HTMLElement = document.documentElement,
): void {
  const transparency = clampWindowTransparency(percent);
  root.style.setProperty('--window-opacity', `${100 - transparency}%`);
  root.style.setProperty('--window-opacity-elevated', `${Math.round(100 - transparency / 3)}%`);
  try {
    localStorage.setItem(WINDOW_TRANSPARENCY_STORAGE_KEY, String(transparency));
  } catch {
    // localStorage unavailable: first paint falls back to opaque.
  }
}

function readStoredWindowTransparency(): number {
  try {
    return clampWindowTransparency(Number(localStorage.getItem(WINDOW_TRANSPARENCY_STORAGE_KEY) ?? 0));
  } catch {
    return 0;
  }
}

function readStoredThemeId(): string | undefined {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Called once from main.tsx before the first render: applies the cached theme
 * synchronously (no flash of the default theme). Later changes are applied by
 * OptionsProvider from its settings state.
 */
export function initTheme(): void {
  applyTheme(getTheme(readStoredThemeId()));
  applyWindowTransparency(readStoredWindowTransparency());
}

const readMode = (): ThemeMode => (document.documentElement.classList.contains('light') ? 'light' : 'dark');
const subscribeMode = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
};

/** Mode ('dark' | 'light') of the theme currently applied to <html>; re-renders on theme changes. */
export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(subscribeMode, readMode, () => 'dark');
}
