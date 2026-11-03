/**
 * Global (not per-theme) scales. Spacing uses Tailwind's default 4px base and is not redefined here.
 *
 * The generated `tailwind.css` exposes these as CSS variables and Tailwind theme keys:
 * motion → `--ease-out`/`--ease-spring` (`ease-out`, `ease-spring`) and `--dur-fast|med|slow` (`duration-(--dur-med)`),
 * radius → `rounded-sm|md|lg|xl` derived from the per-theme `--radius`, elevation → `shadow-panel`/`shadow-glow`,
 * z-layers → `z-raised`, `z-popup`, `z-drawer`, `z-panel`, `z-floating`, type → `text-3xs`…`text-display`,
 * tracking → `tracking-caps`, named widths → `w-control`, `max-w-viewport`….
 */

/** Cubic-bezier control points; framer-motion takes these arrays directly (lib/motion.ts). */
export const EASING = {
  out: [0.22, 1, 0.36, 1],
  spring: [0.34, 1.56, 0.64, 1],
} as const;

/** Durations in milliseconds. */
export const DURATION_MS = { fast: 120, med: 200, slow: 300 } as const;

/** `rounded-<step>` offsets in px from the theme's `--radius`. */
export const RADIUS_SCALE = { sm: -4, md: -2, lg: 0, xl: 4 } as const;

/** Elevation. `glow` follows the theme's `--glow`, so it is resolved where used (`@theme inline`). */
export const SHADOWS = {
  glow: '0 0 0 1px color-mix(in oklab, var(--glow) 40%, transparent), 0 0 18px -4px var(--glow)',
  panel: '0 1px 2px oklch(0 0 0 / 0.12), 0 12px 32px -12px oklch(0 0 0 / 0.45)',
} as const;

/**
 * Stacking layers. Inside a panel: `raised` (sticky headers, focused segments), `popup` (in-panel menus and
 * scrims), `drawer` (in-panel sidebars). Overlay panels start at `panel` and add their focus order; portalled
 * popovers, tooltips, menus and dialogs sit on `floating`.
 */
export const Z_LAYERS = {
  raised: 10,
  popup: 20,
  drawer: 30,
  panel: 10,
  floating: 50,
} as const;

/**
 * Type scale ("Refined current": 11/12/13/16/24). `[font-size, line-height]` in rem. The generated CSS resets
 * Tailwind's default font sizes, so only these `text-*` steps exist:
 * `2xs` 11px captions, meta, table cells · `xs` 12px body · `sm` 13px titles and primary values ·
 * `base` 16px panel hero values · `2xl` 24px headline numbers.
 * Two documented exceptions: `3xs` 10px for dense uppercase meta labels, counters and chip text only (never body
 * text), and `display` 30px for the one hero total of a surface (net worth, stash value, sign-in wordmark).
 * Numbers use Tailwind's `tabular-nums`.
 */
export const TYPE_SCALE = {
  '3xs': ['0.625rem', '0.875rem'],
  '2xs': ['0.6875rem', '1rem'],
  xs: ['0.75rem', '1rem'],
  sm: ['0.8125rem', '1.125rem'],
  base: ['1rem', '1.5rem'],
  '2xl': ['1.5rem', '2rem'],
  display: ['1.875rem', '2.25rem'],
} as const;

/** Letter spacing added to Tailwind's defaults: `tracking-caps` for uppercase eyebrow and meta labels. */
export const TRACKING = { caps: '0.12em' } as const;

/**
 * Named fixed geometry as Tailwind `--container-*` keys, so `w-*`, `min-w-*` and `max-w-*` all accept them. One-off
 * sizes use the 4px spacing scale (`w-65` = 260px); add a name here only for a size that recurs or encodes a rule.
 */
export const WIDTHS = {
  /** Control column of a settings row (selects, sliders, pickers). */
  control: '13.75rem',
  /** Side column of a split panel (chat conversations, trader sidebar, market filters). */
  sidebar: '18.75rem',
  /** Floating detail card or popover body (price-check details, rare appraisal). */
  popover: '25rem',
  /** Keeps a portalled card inside the window: the viewport minus an 8px gutter per side. */
  viewport: 'calc(100vw - 1rem)',
  /** Fits inside the parent with a 16px gutter per side (dialogs). */
  contained: 'calc(100% - 2rem)',
} as const;
