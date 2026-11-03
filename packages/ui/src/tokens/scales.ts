/**
 * Global (not per-theme) scales. Spacing uses Tailwind's default 4px base and is not redefined here.
 *
 * The generated `tailwind.css` exposes these as CSS variables and Tailwind theme keys:
 * motion → `--ease-out`/`--ease-spring` (`ease-out`, `ease-spring`) and `--dur-fast|med|slow` (`duration-(--dur-med)`),
 * radius → `rounded-sm|md|lg|xl` derived from the per-theme `--radius`, elevation → `shadow-panel`/`shadow-glow`,
 * z-layers → `z-raised`, `z-popup`, `z-drawer`, `z-panel`, `z-floating`.
 */

/** Cubic-bezier control points; framer-motion takes these arrays directly (src/lib/motion.ts). */
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
