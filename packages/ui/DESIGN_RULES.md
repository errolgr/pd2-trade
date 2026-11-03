# PD2 Trader design rules

Rules for the overlay (`src/`) and the design-system package (`packages/ui`, npm `@pd2-trader/ui`). Every rule
points at the code it comes from. Machine-oriented summary: `packages/ui/llms.txt`. A copy of this file ships at
`packages/ui/DESIGN_RULES.md`; edit `docs/design/DESIGN_RULES.md` and copy it over.

## 1. The surface: an always-on-top overlay over Diablo II

- **One transparent, always-on-top, non-focusable window.** Panels float over the game. `body` is
  `background: transparent` (`src/globals.css`); every panel paints its own surface.
- **Never steal focus from the game.** The window is created `focusable(false)` (`src/overlay/keyboard.ts`). A panel
  takes the keyboard only when the user clicks into a text field (`PanelDef.keyboard: 'onPointerDown'`,
  `src/overlay/types.ts`, `src/overlay/Panel.tsx`) and gives it back when they leave. Opening a panel never claims
  the keyboard unless the def asks for it.
- **No `window.alert` / `confirm` / `prompt`.** They wedge the non-focusable window. Use `confirmToast()` /
  `undoToast()` / `showToast()` from `src/overlay/toast.tsx`. Enforced by `no-alert` in `eslint.config.js`.
- **Keyboard policy.** Hotkeys are global shortcuts registered by the host, not DOM key listeners. Inside a panel,
  Escape closes popovers/menus (Radix default); never trap focus in a panel the user did not type into. Mark
  elements that must keep the keyboard with `data-keep-keyboard` (`src/overlay/Panel.tsx`).
- **Dense, glanceable, legible over the game.** Panels sit next to the game's own tooltips. Prefer one line per
  datum, `tabular-nums` for prices and counts (186 uses), truncation over wrapping, and `text-xs`/`text-sm` body text.
  Text is never placed directly on the game: it sits on `bg-surface`/`bg-surface-elevated`/`bg-popover`.
- **Window-opacity aware surfaces.** Settings → Interface → Window transparency sets `--window-opacity` and the
  gentler `--window-opacity-elevated` (`applyWindowTransparency`, `src/lib/themes.ts`). `surface` is the panel
  color at `--window-opacity`; `surface-elevated` (tooltips, popovers, toasts) at `--window-opacity-elevated`, so
  floating text stays readable over a see-through panel. Panels use `bg-surface` + `backdrop-blur-md`
  (`WindowPanel`, `src/components/custom/window-chrome.tsx`). Do not hard-code opacity on panel backgrounds.
- **Old WebView2.** Users run Chromium as old as 112. `oklch()` and `color-mix()` are fine; APIs newer than 112 are
  not (see the `Promise.withResolvers` ban in `eslint.config.js`).

## 2. Color

Feature code uses **semantic** and **domain** tokens only, through Tailwind classes (`bg-surface`,
`text-muted-foreground`, `border-border`, `text-q-unique`) or `var(--token)` in inline styles. Opacity modifiers
are fine (`bg-destructive/10`, `border-warning/35`, as in `src/pages/currency/components/StatePanel.tsx`).

Banned (lint, section 10): raw colors (`#fff`, `rgb()`, `hsl()`, `oklch()`), Tailwind palette classes
(`bg-red-500`, `text-zinc-400`, `border-white`), arbitrary color values (`text-[#ff7043]`). Allowed keywords:
`transparent`, `current`, `inherit`, `currentColor`.

Tiers (`packages/ui/src/tokens/tokens.ts`): **primitive** `PALETTE` (theme definitions only) → **semantic**
`SEMANTIC_TOKENS` → **domain** `DOMAIN_TOKENS`. All 21 themes define every token in `THEME_TOKENS`
(`packages/ui/src/tokens/themes.test.ts`), so a token class works in every theme; a palette class does not.

### Semantic tokens

| Token (class stem)                                                                                                               | Use for                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `background` / `foreground`                                                                                                      | App/page base and default text                                                 |
| `surface` / `surface-foreground`                                                                                                 | Panel body (window-opacity aware)                                              |
| `surface-elevated`                                                                                                               | Tooltips, popovers, toasts over a panel (gentler opacity)                      |
| `card` / `card-foreground`                                                                                                       | Cards and tiles inside a panel                                                 |
| `popover` / `popover-foreground`                                                                                                 | Radix popover/menu/select content (`src/components/ui/popover.tsx`)            |
| `primary` / `primary-foreground`                                                                                                 | The one main action; selection tint                                            |
| `secondary` / `secondary-foreground`                                                                                             | Secondary buttons and chips                                                    |
| `muted` / `muted-foreground`                                                                                                     | Quiet fills (skeletons, wells); secondary text, labels, icons                  |
| `accent` / `accent-foreground`                                                                                                   | Hover/active row and item highlight                                            |
| `destructive` / `destructive-foreground`                                                                                         | Errors, delete, failed state                                                   |
| `success` / `success-foreground`                                                                                                 | Sold, synced, price up, confirmations                                          |
| `warning` / `warning-foreground`                                                                                                 | Stale data, partial results, caution                                           |
| `info` / `info-foreground`                                                                                                       | Neutral notices, tips                                                          |
| `border`, `input`, `ring`                                                                                                        | Hairlines; input borders; focus ring (`outline-ring/50` is the global default) |
| `scrim`                                                                                                                          | Dimmer behind in-panel sheets and dialogs                                      |
| `chart-1` … `chart-5`                                                                                                            | Series colors in recharts (`src/components/ui/chart.tsx`)                      |
| `sidebar`, `sidebar-foreground`, `sidebar-primary(-foreground)`, `sidebar-accent(-foreground)`, `sidebar-border`, `sidebar-ring` | shadcn sidebar slots                                                           |

### Domain tokens

| Token              | Meaning                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `glow`             | Theme highlight: focus glow, "copy image" sweep, accent edge (`shadow-glow`) |
| `q-unique`         | Unique items (default gold, matches the game)                                |
| `q-set`            | Set items (green)                                                            |
| `q-rare`           | Rare items (yellow)                                                          |
| `q-magic`          | Magic items (blue)                                                           |
| `q-crafted`        | Crafted items (orange)                                                       |
| `q-rune`           | Runes                                                                        |
| `q-normal`         | Normal/white items                                                           |
| `q-gold`           | Gold amounts and currency                                                    |
| `q-corrupted`      | Corrupted items (red)                                                        |
| `q-corrupted-zone` | Corrupted-zone timer and markers (purple)                                    |

Item names always render in their quality color (`text-q-*`); never reuse a quality color for unrelated UI
meaning (e.g. `q-set` green is not "success").

## 3. Typography

- Family: `--font-family` (Inter; the `classic-diablo-ii` theme swaps in `DiabloFont`, `src/globals.css`).
  `WindowChrome diabloFont` renders a title in the D2 face.
- Scale in use: `text-xs` (341 uses) is the body size, `text-sm` (140) for titles and primary values, `text-base`
  and up only for hero numbers. Panel title: `text-sm font-semibold tracking-tight` (`window-chrome.tsx`).
- Dense sizes `text-[11px]` (150) and `text-[10px]` (98) are the overlay's de facto caption sizes but are
  arbitrary values; M2 replaces them with named dense sizes in `@pd2-trader/ui` (_Proposed_). Until then they are
  lint warnings, not new patterns to copy.
- Weights: `font-medium` (labels, values) and `font-semibold` (titles); `font-bold` sparingly. Numbers:
  `tabular-nums`.

## 4. Spacing, layout, density

- 4px base: Tailwind's default spacing scale (`packages/ui/src/tokens/scales.ts`). Common steps: `gap-1`/`1.5`/`2`,
  `p-1.5`/`2`/`3`, `px-2.5` (chrome bar). Half steps (`0.5`, `1.5`, `2.5`) are allowed; bracket values are not.
- Fixed widths for panels/columns go through panel defs or a named size, not `w-[220px]` in feature code.
- Panel chrome bar is `h-10` (`WindowChrome`). Controls in the bar are `size-7` icon buttons.

## 5. Radius

`--radius` per theme; `rounded-sm|md|lg|xl` derive from it (`RADIUS_SCALE`, `scales.ts`). Panels `rounded-lg`,
controls and tiles `rounded-md`, chips `rounded-sm`, pills/avatars `rounded-full`. No `rounded-[4px]`.

## 6. Elevation and stacking

- `shadow-panel` for panels and popovers (`WindowPanel`, `popover.tsx`); `shadow-glow` for the highlighted/focused
  item. Do not stack Tailwind `shadow-lg` on panels.
- Layers (`Z_LAYERS`, `scales.ts`): `z-raised` (sticky headers), `z-popup` (in-panel menus, scrims), `z-drawer`
  (in-panel sidebars), `z-panel` (overlay panels), `z-floating` (portalled popovers, tooltips, dialogs).

## 7. Motion

- Tokens: `--ease-out`, `--ease-spring`, `--dur-fast` (120ms), `--dur-med` (200ms), `--dur-slow` (300ms)
  (`src/globals.css`, `EASING`/`DURATION_MS` in `scales.ts`). framer-motion presets in `src/lib/motion.ts`
  (`fadeIn`, `fadeInUp`, `scaleIn`, `slideInRight/Left`, `listStagger`, `springSnappy`, `springSoft`) mirror them.
- Motion confirms an action or orients the eye; it never delays data. Enter `dur-med`, exit `dur-fast`.
- Reduced motion: CSS animations are neutralized globally under `prefers-reduced-motion` (`src/globals.css`).
  JS animations are not: gate transforms with `useReducedMotionSafe()` (`src/lib/motion.ts`, used by
  `WindowPanel`, `CaptureSweep`) or `motion-safe:` variants (`Skeleton`).

## 8. Iconography

- `lucide-react` only. Sizes: `size-3.5` (175 uses) inline with `text-xs`, `size-3` (105) in dense chips,
  `size-4` (82) in buttons and the chrome bar. Use `size-*`, not `h-4 w-4`.
- Icons inherit color (`currentColor`); quiet icons use `text-muted-foreground`. Decorative icons get
  `aria-hidden`; icon-only buttons get an `aria-label` from i18n.

## 9. States

- **Loading**: `Skeleton` (`src/components/ui/skeleton.tsx`): `bg-muted` with the `animate-shimmer` sweep under
  `motion-safe:`. Shape skeletons like the content; no spinners for content areas.
- **Empty**: `EmptyState` (icon tile, title, optional description and action;
  `src/pages/currency/components/StatePanel.tsx`). Say what is empty and the next step.
- **Error / notice**: inline `Banner` with tone `info | warning | destructive` (same file) for panel-level issues;
  toasts for transient results (`src/overlay/toast.tsx`). Plugin slot failures render an `ErrorChip` (PRD §6.2,
  _Proposed_ for M2/M3).
- **Interactive**: hover `bg-accent`, focus via the global `outline-ring/50`, disabled `opacity-50`
  (shadcn `src/components/ui/button.tsx`).

## 10. Copy tone

- All strings via i18n (`src/i18n/locales/<lang>/*.json`, 8 languages). No hard-coded UI text.
- Sentence case ("Manage listings", "Lock position"), short, plain, no exclamation marks. Use `…` for in-progress
  ("Opening browser…") and `·` as a separator (`{{time}} · in {{wait}}`).
- Errors say what happened and what to do ("This item is not in your stash (shared or personal) and cannot be
  listed."). Use D2/PD2 vocabulary players use (HR, runes, corrupted, Hell games).

## 11. Enforcement

Local ESLint plugin `pd2-ds` (`eslint-rules/design-system.js`, loaded in `eslint.config.js`):

| Rule                        | Flags                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pd2-ds/no-raw-color`       | `#hex`, `rgb()`, `hsl()`, `oklch()`… in class strings, `style`/motion props, color props (`fill="#fff"`), `*Style`/`CSSProperties` objects                                  |
| `pd2-ds/no-palette-class`   | Tailwind palette color classes (`bg-red-500`, `text-zinc-400/80`, `border-white`)                                                                                           |
| `pd2-ds/no-arbitrary-value` | Bracket values with raw numbers on spacing, size, type, radius and border utilities (`w-[312px]`, `text-[13px]`, `rounded-[4px]`). `var(--…)`-only values and keywords pass |

Checked: `className`/`class`/`*ClassName` props, `cn()`/`clsx()`/`cva()`/`twMerge()` arguments (cva variant keys
excluded), template literals, `*className`/`*Classes` variables and properties, and any other string shaped like a
class list (lookup maps such as `{ fire: 'text-[#ff7043]' }`).

Severity: **warn** in `src/**` until a panel is migrated (PRD A5), **error** in `packages/ui/**`. Exempt: tests,
`src/lib/themes.ts`, `packages/ui/src/tokens/**`, `packages/ui/scripts/**`.

Escape hatches (always with a reason):

```tsx
// ds-allow: game-accurate elemental hue, no theme token
const ELEMENT_TEXT = { fire: 'text-[#ff7043]' };

{
  /* ds-allow: matches the game's 312px tooltip */
}
<div className="w-[312px]" />;

// eslint-disable-next-line pd2-ds/no-arbitrary-value -- legacy panel, migrates in M2
```

M2 migration baseline (M1, `npx eslint src`): 460 warnings in 100 files: 448 `no-arbitrary-value`
(277 font sizes, 60 widths), 9 `no-raw-color`, 3 `no-palette-class`.
