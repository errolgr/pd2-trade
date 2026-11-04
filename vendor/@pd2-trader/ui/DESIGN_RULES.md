# PD2 Trader design rules

Rules for the overlay (`src/`) and the design-system package (`packages/ui`, npm `@pd2-trader/ui`). Every rule
points at the code it comes from. Machine-oriented summary: `packages/ui/llms.txt`. Both files ship in the package.
Component catalog: `npm run catalog` (Ladle, every component × 21 themes × window opacity; `npm run catalog:build`
for a static build).

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
  (`PanelSurface`, `packages/ui/src/components/panel-chrome.tsx`). Do not hard-code opacity on panel backgrounds.
- **Old WebView2.** Users run Chromium as old as 112. `oklch()` and `color-mix()` are fine; APIs newer than 112 are
  not (see the `Promise.withResolvers` ban in `eslint.config.js`).

## 2. Color

Feature code uses **semantic** and **domain** tokens only, through Tailwind classes (`bg-surface`,
`text-muted-foreground`, `border-border`, `text-q-unique`) or `var(--token)` in inline styles. Opacity modifiers
are fine (`bg-destructive/10`, `border-warning/35`, as in `Banner`, `packages/ui/src/components/state.tsx`).

Banned (lint, section 12): raw colors (`#fff`, `rgb()`, `hsl()`, `oklch()`), Tailwind palette classes
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
| `popover` / `popover-foreground`                                                                                                 | Radix popover/menu/select content (`packages/ui/src/components/popover.tsx`)   |
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
| `chart-1` … `chart-5`                                                                                                            | Series colors in recharts (`packages/ui/src/components/chart.tsx`)             |
| `sidebar`, `sidebar-foreground`, `sidebar-primary(-foreground)`, `sidebar-accent(-foreground)`, `sidebar-border`, `sidebar-ring` | shadcn sidebar slots                                                           |

### Domain tokens

| Token                     | Meaning                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- |
| `glow`                    | Theme highlight: focus glow, "copy image" sweep, accent edge (`shadow-glow`) |
| `q-unique`                | Unique items (default gold, matches the game)                                |
| `q-set`                   | Set items (green)                                                            |
| `q-rare`                  | Rare items (yellow)                                                          |
| `q-magic`                 | Magic items (blue)                                                           |
| `q-crafted`               | Crafted items (orange)                                                       |
| `q-rune`                  | Runes                                                                        |
| `q-normal`                | Normal/white items                                                           |
| `q-gold`                  | Gold amounts and currency                                                    |
| `q-corrupted`             | Corrupted items (red)                                                        |
| `q-corrupted-zone`        | Corrupted-zone timer and markers (purple)                                    |
| `dmg-fire` … `dmg-poison` | Elemental damage text: `dmg-fire`, `dmg-cold`, `dmg-lightning`, `dmg-poison` |

Item names always render in their quality color (`text-q-*`); never reuse a quality color for unrelated UI
meaning (e.g. `q-set` green is not "success").

## 3. Typography

- Family: `--font-family` (Inter; the `classic-diablo-ii` theme swaps in `DiabloFont`, `src/globals.css`).
  `PanelChrome diabloFont` renders a title in the D2 face.
- **Type scale** ("Refined current": 11/12/13/16/24, `TYPE_SCALE` in `packages/ui/src/tokens/scales.ts`). The
  generated CSS resets Tailwind's default font sizes, so only these steps exist; `text-lg`, `text-xl`, `text-3xl`…
  render unstyled.

  | Class          | Size / line height | Use                                                                 |
  | -------------- | ------------------ | ------------------------------------------------------------------- |
  | `text-3xs`     | 10 / 14px          | Exception: dense uppercase meta labels, counters, chip text only    |
  | `text-2xs`     | 11 / 16px          | Captions, meta lines, table cells, secondary values                 |
  | `text-xs`      | 12 / 16px          | Body text (the default in panels)                                   |
  | `text-sm`      | 13 / 18px          | Titles, primary values, buttons                                     |
  | `text-base`    | 16 / 24px          | Panel hero values (item name in price check, section page titles)   |
  | `text-2xl`     | 24 / 32px          | Headline numbers                                                    |
  | `text-display` | 30 / 36px          | Exception: the one hero total of a surface (net worth, stash value) |
  | `text-hero`    | 48px / 1.05, tight | Website landing heroes only, never in the overlay                   |

  Mapping from the pre-M2 code: `text-[9px]`/`text-[10px]` meta labels → `text-3xs`, other `text-[10px]` and
  `text-[11px]` → `text-2xs`, `text-[13px]` → `text-sm`, `text-[15px]`/`text-lg`/`text-xl` → `text-base`,
  `text-3xl`/`text-4xl`/`text-[28px]` → `text-display`. Prefer 11px as the minimum; 10px is for meta labels only.

- Uppercase eyebrow/meta labels: `uppercase tracking-caps` (0.12em) with `text-3xs`/`text-2xs font-medium`.
- Panel title: `text-sm font-semibold tracking-tight` (`PanelChrome`).
- Weights: `font-medium` (labels, values) and `font-semibold` (titles); `font-bold` sparingly.
- Numbers: `tabular-nums` for every price, count and timer. `PriceTag`/`CurrencyAmount` apply it for you.

## 4. Spacing, layout, density

- 4px base: Tailwind's default spacing scale (`packages/ui/src/tokens/scales.ts`). Common steps: `gap-1`/`1.5`/`2`,
  `p-1.5`/`2`/`3`, `px-2.5` (chrome bar). Half steps (`0.5`, `1.5`, `2.5`) are allowed; bracket values are not.
- Spacing is dynamic in Tailwind 4: any multiple of 0.25 is a step (`w-55` = 220px, `h-4.5` = 18px, `w-0.75` =
  3px), fractions work (`top-1/2`, `-translate-x-1/2`, `max-w-2/5`). Use these for one-off geometry.
- Recurring or rule-carrying sizes are **named widths** (`WIDTHS`, `scales.ts`; Tailwind `--container-*`, so
  `w-`, `min-w-` and `max-w-` accept them): `w-control` (220px, settings control column), `w-sidebar` (300px, split
  panel side column), `w-popover` (400px, floating detail card), `max-w-viewport` (window minus an 8px gutter per
  side), `max-w-contained` (parent minus a 16px gutter per side, dialogs). Add a name there instead of a bracket value.
- Panel chrome bar is `h-10` (`PanelChrome`). Controls in the bar are `Button size="icon-sm"` (`size-7`).

## 5. Radius

`--radius` per theme; `rounded-sm|md|lg|xl` derive from it (`RADIUS_SCALE`, `scales.ts`): 4/6/8/12px at the
default 8px radius. Panels `rounded-lg`, controls and tiles `rounded-md`, chips `rounded-sm`, hairline marks
`rounded-xs` (2px), pills/avatars `rounded-full`. No `rounded-[4px]`.

## 6. Elevation and stacking

- `shadow-panel` for panels and popovers (`PanelSurface`, `popover.tsx`); `shadow-glow` for the highlighted/focused
  item. Do not stack Tailwind `shadow-lg` on panels.
- Layers (`Z_LAYERS`, `scales.ts`): `z-raised` (sticky headers), `z-popup` (in-panel menus, scrims), `z-drawer`
  (in-panel sidebars), `z-panel` (overlay panels), `z-floating` (portalled popovers, tooltips, dialogs).

## 7. Motion

- Tokens: `--ease-out`, `--ease-spring`, `--dur-fast` (120ms), `--dur-med` (200ms), `--dur-slow` (300ms)
  (`EASING`/`DURATION_MS` in `scales.ts`). framer-motion presets exported from `@pd2-trader/ui` (`lib/motion.ts`)
  (`fadeIn`, `fadeInUp`, `scaleIn`, `slideInRight/Left`, `listStagger`, `springSnappy`, `springSoft`) mirror them.
- Motion confirms an action or orients the eye; it never delays data. Enter `dur-med`, exit `dur-fast`.
- Reduced motion: CSS animations are neutralized globally under `prefers-reduced-motion` (`src/globals.css`).
  JS animations are not: gate transforms with `useReducedMotionSafe()` (`@pd2-trader/ui`, used by
  `PanelSurface`, `CaptureSweep`) or `motion-safe:` variants (`Skeleton`).

## 8. Iconography

- `lucide-react` only. Sizes: `size-3.5` (175 uses) inline with `text-xs`, `size-3` (105) in dense chips,
  `size-4` (82) in buttons and the chrome bar. Use `size-*`, not `h-4 w-4`.
- Icons inherit color (`currentColor`); quiet icons use `text-muted-foreground`. Decorative icons get
  `aria-hidden`; icon-only buttons get an `aria-label` from i18n.

## 9. States

- **Loading**: `Skeleton` (`bg-muted` with the `animate-shimmer` sweep under `motion-safe:`) shaped like the content;
  `SkeletonRows` for list placeholders. No spinners for content areas.
- **Empty**: `EmptyState` (`icon?`, `title`, `description?`, `action?`). Say what is empty and the next step.
- **Error / notice**: `Banner` with tone `info | warning | destructive` for panel-level issues; `ErrorChip`
  (`message`, `onRetry?`) for an inline failure (failed send, failed price, plugin slot failure, PRD §6.2); toasts
  for transient results (`showToast`/`confirmToast`/`undoToast`, `src/overlay/toast.tsx`).
- **Interactive**: hover `bg-accent`, focus via the global `outline-ring/50`, disabled `opacity-50` (`Button`).

## 10. Copy tone

- All strings via i18n (`src/i18n/locales/<lang>/*.json`, 8 languages). No hard-coded UI text.
- Sentence case ("Manage listings", "Lock position"), short, plain, no exclamation marks. Use `…` for in-progress
  ("Opening browser…") and `·` as a separator (`{{time}} · in {{wait}}`).
- Errors say what happened and what to do ("This item is not in your stash (shared or personal) and cannot be
  listed."). Use D2/PD2 vocabulary players use (HR, runes, corrupted, Hell games).

## 11. Components

Every interface composes from `@pd2-trader/ui` only (PRD A4 "Consistency rule"): one component per job, no local
re-implementations. A pattern that is missing goes into the package first (with a story), then into the feature.

```tsx
import { Button, PanelChrome, PanelSurface, PriceTag, ItemName, cn } from '@pd2-trader/ui';
```

The barrel is side-effect free, so bundles keep only what they import. Tokens: `@pd2-trader/ui/tokens`; Tailwind
theme CSS: `@pd2-trader/ui/tailwind.css`; lint plugin: `@pd2-trader/ui/eslint`. Sources:
`packages/ui/src/components/<file>.tsx`, each with a `*.stories.tsx`.

Consumers outside this repo (website, plugins) ship the package as TypeScript source, so their bundler compiles
it, and their Tailwind entry CSS needs:

```css
@import 'tailwindcss';
@import '@pd2-trader/ui/tailwind.css';
@plugin 'tailwindcss-animate';
@source '../node_modules/@pd2-trader/ui/src'; /* path from the CSS file; Tailwind must see the package's classes */
```

| Group            | Exports (file)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primitives       | `Button` (`button`), `ButtonGroup`, `Kbd` / `KbdGroup`, `Badge` (incl. `count`), `Card` + `ItemCard`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, `Slider`, `Select*`, `Tabs*`, `RadioGroup` / `RadioGroupItem`, `Accordion*`, `Collapsible*`, `Pagination*` (links on `buttonVariants`), `Toggle` (incl. `chip`), `ToggleGroup*`, `Tooltip*`, `Popover*`, `DropdownMenu*`, `Dialog*`, `AlertDialog*`, `Sheet*`, `Command*` (cmdk), `Form*` (react-hook-form), `Table*`, `ScrollArea`, `Separator`, `Progress`, `Skeleton`, `Alert`, `Breadcrumb*`, `Chart*` (recharts), `Toaster` + `toast` (sonner) |
| Overlay patterns | `PanelChrome`, `PanelSurface` (`panel-chrome`), `HoverPopover`, `PopoverTile` / `PopoverKeyValue` / `PopoverSectionTitle` (`popover-parts`), `SettingsSection` / `SettingsGroup` / `SettingsRow` / `SettingsHint` / `SettingsSkeleton` (`settings`), `Banner`, `EmptyState` (`state`), `ErrorChip`, `SkeletonRows` (`feedback`)                                                                                                                                                                                                                                                                               |
| Domain           | `ItemName` + `itemQualityClass` (`item-name`), `RuneIcon` (`rune-icon`), `PriceTag`, `CurrencyAmount`, `formatHrAmount`, `formatAmount`, `usePriceText` (`price`), `DataRow`, `StatLine`, `MarketRow` (`rows`), `SparkChart` (`spark-chart`)                                                                                                                                                                                                                                                                                                                                                                  |
| Slots (plugins)  | `SlotSection`, `SlotRow`, `SlotBadge`, `SlotText`, `SlotColumn`, `SlotList`, `SlotDivider`, `SlotAction`, `SlotTone` / `SLOT_TONES` / `isSlotTone` / `slotToneClass` (`slots`)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Runtime          | `cn`, framer-motion presets (`fadeIn`, `fadeInUp`, `scaleIn`, `listStagger`, `springSnappy`, `useReducedMotionSafe`…), `PanelPortalContext` (the overlay's `Panel` provides it), `UiLabelsProvider` / `useUiLabels` (translated built-in strings)                                                                                                                                                                                                                                                                                                                                                             |

**Button** variants `default | secondary | outline | ghost | destructive | link | quiet | field`; sizes
`default | sm | xs | lg | icon | icon-sm | icon-xs | icon-2xs | row | inline`.

| Job                                       | Use                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Main / secondary action                   | `Button` / `Button variant="secondary"`                                                                                 |
| Icon button (chrome bar, row actions)     | `Button variant="ghost" size="icon-sm"` (`icon-xs`, `icon-2xs` denser)                                                  |
| Inline text action ("Clear", "Show more") | `Button variant="quiet" size="inline"` (`variant="link"` for links)                                                     |
| Clickable list row                        | `Button variant="ghost" size="row"` (selected: `aria-selected` / `aria-current` / `data-active`) or `MarketRow onClick` |
| Picker / combobox trigger                 | `Button variant="field"`                                                                                                |
| Pressed filter chip / segmented choice    | `Toggle variant="chip"` / `ToggleGroup`                                                                                 |
| Price, HR / rune / gold amount            | `PriceTag` inline; `CurrencyAmount` for a labelled total                                                                |
| Item name                                 | `ItemName quality=…` (never hand-pick a `text-q-*`)                                                                     |
| Label/value line                          | `DataRow`; item mod line `StatLine`                                                                                     |
| Sparkline                                 | `SparkChart`                                                                                                            |

Built-in strings (close, more, retry, loading, gold) come from `UiLabelsProvider`; the app wires it to i18n in
`src/main.tsx`, so components never hard-code copy.

## 12. Enforcement

Local ESLint plugin `pd2-ds` (`packages/ui/eslint/design-system.js` + `consistency.js`, export `@pd2-trader/ui/eslint`, loaded in
`eslint.config.js`):

| Rule                                | Flags                                                                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pd2-ds/no-raw-color`               | `#hex`, `rgb()`, `hsl()`, `oklch()`… in class strings, `style`/motion props, color props (`fill="#fff"`), `*Style`/`CSSProperties` objects                  |
| `pd2-ds/no-palette-class`           | Tailwind palette color classes (`bg-red-500`, `text-zinc-400/80`, `border-white`)                                                                           |
| `pd2-ds/no-arbitrary-value`         | Bracket values with raw numbers on spacing, size, type, radius and border utilities (`w-[312px]`, `text-[13px]`, `rounded-[4px]`)                           |
| `pd2-ds/no-direct-primitive-import` | `@radix-ui/*`, `radix-ui`, `cmdk`, `sonner`, `vaul`, `class-variance-authority` imported outside `packages/ui`                                              |
| `pd2-ds/no-styled-raw-control`      | `<button>`, `<input>`, `<select>`, `<textarea>` or `role="button"` + `onClick` with `className`/`style` → use `Button`/`Input`/`Select`/`Textarea`/`Toggle` |
| `pd2-ds/no-local-primitive`         | Components named like DS primitives or parts (`Button`, `DialogContent`, `PriceTag`, `EmptyState`…) or `cva()`/`tv()` outside `packages/ui`                 |

Checked: `className`/`class`/`*ClassName` props, `cn()`/`clsx()`/`cva()`/`twMerge()` arguments (cva variant keys
excluded), template literals, `*className`/`*Classes` variables and properties, and any other string shaped like a
class list (lookup maps such as `{ fire: 'text-dmg-fire' }`).

Severity: **error** everywhere. `src/**` and plugin code get all six rules; `packages/ui/**` gets the token rules
(primitives, Radix and cva belong there). Exempt: tests, `test-utils`, `src/lib/themes.ts`,
`packages/ui/src/tokens/**`, `packages/ui/scripts/**`.

Escape hatch, rare and always with a reason (three in `src` today: CSS mask layers in `CaptureSweep`, the
viewport-relative stats cap in `ItemOverlayWidget`):

```tsx
// ds-allow: mask layer, #000 = fully opaque alpha (no colour is painted)
const MASK = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)';

// eslint-disable-next-line pd2-ds/no-arbitrary-value -- <reason>
```

Migration (PRD A5): the M1 baseline was 460 token warnings in 100 files (448 `no-arbitrary-value`, 9
`no-raw-color`, 3 `no-palette-class`) plus 315 consistency warnings. M2 migrated every surface; `npx eslint src
packages/ui` reports zero `pd2-ds/*` findings and the rules error.
