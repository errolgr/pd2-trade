import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const formsDocs: ComponentDoc[] = [
  {
    slug: 'field',
    name: 'Field',
    category: 'forms',
    description:
      'Label, control, help text and error for one form value. Pass `label`/`hint`/`error` with a single control and the wiring is automatic; compose the parts (FieldSet, FieldLegend, FieldGroup, FieldContent, FieldSeparator, FieldTitle) for checkbox rows, choice cards and grouped settings. Use `Form*` instead when react-hook-form owns the state.',
    status: 'beta',
    importName: 'Field',
    props: [
      { name: 'label', type: 'ReactNode', description: 'Convenience mode: renders a `FieldLabel` pointing at the single control child.' },
      { name: 'hint', type: 'ReactNode', description: 'Muted help line under the control; its id joins the control\'s `aria-describedby`.' },
      {
        name: 'error',
        type: 'ReactNode',
        description: 'Error line (`role="alert"`); sets `data-invalid` on the field and `aria-invalid` on the control.',
      },
      { name: 'optional', type: 'boolean', default: 'false', description: 'Muted "optional" tag after the label (UiLabels `optional`).' },
      {
        name: 'orientation',
        type: "'vertical' | 'horizontal'",
        default: "'vertical'",
        description: 'Label above the control, or beside it (checkbox/switch rows, compact settings).',
      },
      {
        name: 'data-invalid / data-disabled',
        type: 'boolean',
        description: 'Composition mode: mark the field invalid (label turns destructive) or disabled (label dims).',
      },
      {
        name: 'FieldError errors',
        type: 'ReadonlyArray<{ message?: string } | undefined>',
        description: 'react-hook-form / zod errors; duplicates collapse, several render as a list. Children win.',
      },
      { name: 'FieldLegend variant', type: "'legend' | 'label'", default: "'legend'", description: 'Section title, or a label-sized legend.' },
    ],
    examples: examplesFor('field'),
    a11y:
      'Convenience mode gives the control an id (or keeps the child\'s `id`), points the label at it, and adds the hint/error ids to `aria-describedby`; DS controls read it through `useFieldControl` (Input, Textarea, SelectTrigger, NativeSelect, Checkbox, Switch, InputGroupInput, SearchInput, Combobox, NumberInput). Other controls need `id`/`htmlFor` by hand. `FieldError` is `role="alert"`, so a new error is announced. `Field` is `role="group"`; `FieldSet` is a native fieldset whose `FieldLegend` names the group.',
    related: ['form', 'input', 'label', 'input-group'],
  },
  {
    slug: 'form',
    name: 'Form',
    category: 'forms',
    description:
      'react-hook-form bindings: `Form` (FormProvider), `FormField` (Controller), and `FormItem` / `FormLabel` / `FormControl` / `FormDescription` / `FormMessage`, which render the Field parts so forms and hand-wired fields look the same. Use for multi-field forms with validation; use `Field` for a single value you hold in `useState`.',
    status: 'stable',
    importName: 'Form',
    props: [
      { name: 'Form …form', type: 'UseFormReturn<T>', required: true, description: 'Spread the `useForm()` result.' },
      {
        name: 'FormField control / name / rules / render',
        type: 'ControllerProps<T, TName>',
        required: true,
        description: 'One field: `render={({ field }) => <FormItem>…</FormItem>}`.',
      },
      {
        name: 'FormControl children',
        type: 'ReactElement',
        description: 'The control (Slot): gets `id`, `aria-describedby` (description + message) and `aria-invalid` from the field state.',
      },
      { name: 'FormMessage children', type: 'ReactNode', description: 'Shown when there is no validation error; the error message wins.' },
    ],
    examples: examplesFor('form'),
    a11y:
      'FormLabel points at the control; FormDescription and FormMessage are in its `aria-describedby`, `aria-invalid` follows the field state, and the message is `role="alert"`. `useFormField()` exposes the ids for custom controls.',
    related: ['field', 'input', 'settings'],
  },
  {
    slug: 'input',
    name: 'Input',
    category: 'forms',
    description:
      'Single-line text: names, prices, filters. Add icons, units or buttons with `InputGroup`, search with `SearchInput`, integers with `NumberInput`, a value from a list with `Combobox`.',
    status: 'stable',
    importName: 'Input',
    props: [
      { name: 'type', type: 'HTMLInputTypeAttribute', default: "'text'", description: 'Native input type (`file` gets a styled button).' },
      {
        name: 'aria-invalid',
        type: 'boolean',
        description: 'Destructive border and ring; set automatically inside a `Field` with an `error`.',
      },
    ],
    examples: examplesFor('input'),
    a11y:
      'Native `<input>`; name it with a `Label htmlFor` or `Field label`. Inside a convenience `Field` it picks up `id`, `aria-describedby` and `aria-invalid`. In the overlay, clicking it gives the panel the keyboard.',
    related: ['field', 'input-group', 'textarea', 'number-input'],
  },
  {
    slug: 'textarea',
    name: 'Textarea',
    category: 'forms',
    description:
      'Multi-line text (trade message templates, notes); grows with its content. Add a counter or send button with `InputGroupTextarea`.',
    status: 'stable',
    importName: 'Textarea',
    props: [
      { name: 'rows', type: 'number', description: 'Minimum visible rows (it still grows with `field-sizing-content`).' },
      { name: 'aria-invalid', type: 'boolean', description: 'Destructive border; automatic inside a `Field` with an `error`.' },
    ],
    examples: examplesFor('textarea'),
    a11y: 'Native `<textarea>`; Field-aware like Input. Enter inserts a newline (no submit).',
    related: ['input', 'input-group', 'field'],
  },
  {
    slug: 'input-group',
    name: 'Input group',
    category: 'forms',
    description:
      'An input or textarea with addons (icons, units, kbd hints, buttons) in one bordered box whose focus ring covers the whole group. `SearchInput` is the ready-made search box (search icon + clear button) built on it.',
    status: 'beta',
    importName: 'InputGroup',
    props: [
      {
        name: 'InputGroupAddon align',
        type: "'inline-start' | 'inline-end' | 'block-start' | 'block-end'",
        default: "'inline-start'",
        description: 'Before/after the control, or a row above/below it (textarea toolbars). A click on its empty area focuses the control.',
      },
      {
        name: 'InputGroupButton size',
        type: "'xs' | 'sm' | 'icon-xs' | 'icon-sm'",
        default: "'xs'",
        description: 'Button sized for an addon (`variant` defaults to `ghost`; icon-only needs `aria-label`).',
      },
      {
        name: 'SearchInput size',
        type: "'sm' | 'md' | 'lg'",
        default: "'md'",
        description: '`sm` = h-8 (toolbars), `md` = h-9, `lg` = h-11 with 16px text (a landing page\'s main search).',
      },
      {
        name: 'SearchInput onClear',
        type: '() => void',
        description: 'Shows a clear (×, UiLabels `clear`) button while the input has text; reset your value in it. Focus returns to the input.',
      },
      {
        name: 'SearchInput className',
        type: 'string',
        description: 'Goes on the group (width, flex); `ref` and all other props go on the `type="search"` input.',
      },
    ],
    examples: examplesFor('input-group'),
    a11y:
      'The group is `role="group"`; name the input itself (`aria-label` or a Field label). Addon text is not part of the input\'s name: mention units in the label. The clear button is labelled from UiLabels and the native search cancel glyph is hidden (Escape still clears in Chromium).',
    related: ['input', 'textarea', 'combobox', 'field'],
  },
  {
    slug: 'combobox',
    name: 'Combobox',
    category: 'forms',
    description:
      'Searchable single-select for long lists (items, runes, skills, bases): the input is the field, typing filters and ranks, matches are highlighted. Use `Select` for a short fixed list, `NativeSelect` for a native picker, `Command` for a command palette.',
    status: 'beta',
    importName: 'Combobox',
    props: [
      {
        name: 'options',
        type: 'readonly ComboboxOption<V>[]',
        required: true,
        description: '`{ value, label, hint?, group?, keywords?, disabled?, className? }`. `hint` shows muted at the row end; `keywords` are searched but hidden; `className` colors the label (`itemQualityClass`).',
      },
      { name: 'value', type: 'V | null', required: true, description: 'Selected option value (`string | number`).' },
      { name: 'onChange', type: '(value: V | null, option: ComboboxOption<V> | null) => void', required: true, description: 'Picked option, or `null, null` from the clear button.' },
      { name: 'placeholder', type: 'string', default: 'UiLabels searchPlaceholder', description: 'Shown while nothing is selected.' },
      { name: 'emptyText', type: 'ReactNode', default: 'UiLabels noMatches', description: 'Shown when nothing matches.' },
      { name: 'limit', type: 'number', default: '80', description: 'Rows rendered; the rest are counted in a "N more — keep typing" footer.' },
      { name: 'renderIcon', type: '(option, px: number) => ReactNode', description: 'Leading art: `px` = 24 in rows, 20 in the closed field.' },
      {
        name: 'flatSearch',
        type: 'boolean',
        default: 'false',
        description: 'While typing, drop group headings and rank across groups; hint/keyword-only matches go under "Other matches".',
      },
      { name: 'clearable', type: 'boolean', default: 'false', description: 'Clear (×) button while something is selected.' },
      { name: 'size', type: "'sm' | 'md'", default: "'md'", description: 'h-8 or h-9.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disables the field.' },
      { name: 'className', type: 'string', description: 'On the wrapper; `ref`, `id`, `aria-*` and other input props go on the input.' },
    ],
    examples: examplesFor('combobox'),
    a11y:
      'ARIA 1.2 combobox: the input has `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant` on a cmdk listbox. Typing or ↓ opens; ↑/↓ move, PageUp/PageDown move by 10, Home/End stay in the text, Enter picks (then the text is selected so typing starts a new search), Escape closes and reverts without closing a surrounding dialog, Tab closes. Rows keep focus in the input (mouse picks work without moving focus). Search: every query word must appear in the label, hint or keywords; label word-start matches rank first. The list portals into the panel layer, is 380–560px wide (the viewport on phones), at most 70vh tall, and flips above when there is more room. In the overlay it needs the keyboard, which clicking into the field grants.',
    related: ['select', 'native-select', 'command', 'input-group', 'field'],
  },
  {
    slug: 'select',
    name: 'Select',
    category: 'forms',
    description:
      'Pick one value from a short fixed list (realm, sort order, a few builds). Rows can carry an `icon` and a muted `description`. Use `Combobox` when the list needs search, `NativeSelect` for the platform picker on the website, `ToggleGroup` for 2–4 always-visible choices.',
    status: 'stable',
    importName: 'Select',
    props: [
      { name: 'value / onValueChange', type: 'string / (value: string) => void', description: 'Controlled value (Radix Select; `defaultValue` for uncontrolled).' },
      { name: 'SelectTrigger size', type: "'sm' | 'default'", default: "'default'", description: '`default` = h-9, `sm` = h-8 (toolbars, dense rows).' },
      { name: 'SelectItem icon', type: 'ReactNode', description: 'Leading icon (size-4), shown in the row and in the trigger once picked.' },
      { name: 'SelectItem description', type: 'ReactNode', description: 'Muted second line, in the list only.' },
      { name: 'SelectItem aside', type: 'ReactNode', description: 'Row content outside the item text (a price, a count); not shown in the trigger.' },
      { name: 'SelectContent position', type: "'popper' | 'item-aligned'", default: "'popper'", description: 'Popper list under the trigger.' },
    ],
    examples: examplesFor('select'),
    a11y:
      'Radix Select: Enter/Space/↓ open, ↑/↓ move, typing jumps to a label, Escape closes. The trigger and list carry `data-keep-keyboard`, so an open select keeps the overlay keyboard. The list portals into the panel layer. Not covered (unlike the website sim RichSelect): a footer editor inside the list and a phone bottom sheet; use `NativeSelect` on phones or a `Sheet` with rows.',
    related: ['combobox', 'native-select', 'toggle-group', 'field'],
  },
  {
    slug: 'native-select',
    name: 'Native select',
    category: 'forms',
    description:
      'A styled native `<select>` with a chevron. Use it in website forms where the platform picker is better (phone wheels, long lists without search, form autofill); use `Select` for rich rows and in the overlay.',
    status: 'beta',
    importName: 'NativeSelect',
    props: [
      { name: 'size', type: "'sm' | 'default'", default: "'default'", description: 'h-8 or h-9.' },
      { name: 'className', type: 'string', description: 'On the wrapper (width, layout); `ref` and other props go on the `<select>`.' },
      { name: 'NativeSelectOptGroup label', type: 'string', required: true, description: 'Group heading in the OS list.' },
    ],
    examples: examplesFor('native-select'),
    a11y:
      'Fully native: platform keyboard and screen-reader behavior, Field-aware (`id`, `aria-describedby`, `aria-invalid`). Options cannot hold icons or second lines. Options are painted with popover colors so dark themes stay legible in the OS list.',
    related: ['select', 'combobox', 'field'],
  },
  {
    slug: 'number-input',
    name: 'Number input',
    category: 'forms',
    description:
      'Integer stepper (− value +) for stats, levels, counts and percentages. Typing keeps the text as typed, in-range values apply at once, Enter/blur clamp. Use `Slider` when the exact value matters less than the position, `Input inputMode="decimal"` for prices.',
    status: 'beta',
    importName: 'NumberInput',
    props: [
      { name: 'value', type: 'number', required: true, description: 'Current integer.' },
      { name: 'onChange', type: '(value: number) => void', required: true, description: 'Gets an integer clamped into `[min, max]`.' },
      { name: 'min / max', type: 'number', default: '0 / 99', description: 'Bounds; −/+ disable at them, out-of-range text is flagged.' },
      { name: 'step / bigStep', type: 'number', default: '1 / 5', description: '↑/↓ and −/+ step; Shift+↑/↓ and Shift-click use `bigStep`.' },
      {
        name: 'label',
        type: 'string',
        required: true,
        description: 'Names the value for assistive tech (dropped when a Field label names it) and the −/+ buttons (UiLabels `decrease`/`increase`).',
      },
      { name: 'unit', type: 'string', description: 'After the value in a fixed-width slot ("%", "s", "lvl"); more than 4 characters are cut with a tooltip.' },
      { name: 'prefix', type: 'string', description: 'Before the value ("Level"); a click on it focuses the input.' },
      { name: 'size', type: "'sm' | 'md'", default: "'md'", description: 'h-8 or h-9.' },
      { name: 'emphasize', type: 'boolean', default: 'false', description: 'Glow border and value while above zero (allocated points).' },
      { name: 'inputClassName', type: 'string', description: 'Classes for the value input (a wider box for 4-digit values); `className` goes on the box.' },
    ],
    examples: examplesFor('number-input'),
    a11y:
      'A text input with `inputMode="numeric"`: ↑/↓ step, Enter commits, Escape reverts the typing (without closing a dialog), focus selects the value. Out-of-range text sets `aria-invalid` and a `role="status"` hint ("Min 10", UiLabels `numberMin`/`numberMax`/`wholeNumber`) referenced by `aria-describedby`. The −/+ buttons are `tabIndex={-1}` (the keyboard steps with arrows) and pointer-only in the non-focusable overlay.',
    related: ['input', 'slider', 'field'],
  },
  {
    slug: 'checkbox',
    name: 'Checkbox',
    category: 'forms',
    description:
      'An independent on/off choice inside a form or filter list (Ethereal only, Ladder). Use `Switch` for a setting that applies immediately, `Toggle variant="chip"` for filter chips.',
    status: 'stable',
    importName: 'Checkbox',
    props: [
      { name: 'checked / onCheckedChange', type: "boolean | 'indeterminate' / (checked) => void", description: 'Controlled state (Radix Checkbox).' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dims and blocks it.' },
      { name: 'aria-invalid', type: 'boolean', description: 'Destructive border; automatic inside a Field with an error.' },
    ],
    examples: examplesFor('checkbox'),
    a11y: 'Radix Checkbox (`role="checkbox"` button): Space toggles; a `Label htmlFor` or `FieldLabel` toggles it on click. Field-aware.',
    related: ['switch', 'radio-group', 'field', 'toggle'],
  },
  {
    slug: 'switch',
    name: 'Switch',
    category: 'forms',
    description: 'A setting that applies immediately (price-check on hotkey, whisper notifications). Use `Checkbox` for choices submitted with a form.',
    status: 'stable',
    importName: 'Switch',
    props: [
      { name: 'checked / onCheckedChange', type: 'boolean / (checked: boolean) => void', description: 'Controlled state (Radix Switch).' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Dims and blocks it.' },
    ],
    examples: examplesFor('switch'),
    a11y: 'Radix Switch (`role="switch"`): Space/Enter toggle; name it with a `Label htmlFor` or a Field. Field-aware.',
    related: ['checkbox', 'settings', 'field'],
  },
  {
    slug: 'slider',
    name: 'Slider',
    category: 'forms',
    description:
      'A value or a min–max range picked by position (window transparency, defense range). Use `NumberInput` when the exact integer matters.',
    status: 'stable',
    importName: 'Slider',
    props: [
      { name: 'value / onValueChange', type: 'number[] / (value: number[]) => void', description: 'One entry per thumb: `[v]` for a value, `[from, to]` for a range.' },
      { name: 'min / max / step', type: 'number', default: '0 / 100 / 1', description: 'Range and step (Radix Slider).' },
      {
        name: 'thumbProps',
        type: 'ThumbProps | ((index: number) => ThumbProps)',
        description: 'Props for each thumb; put `aria-label` / `aria-valuetext` here (the thumb is the focusable slider).',
      },
    ],
    examples: examplesFor('slider'),
    a11y: 'Each thumb is `role="slider"`: ←/→/↑/↓ step, PageUp/PageDown by 10%, Home/End to the bounds. Name thumbs via `thumbProps`. Drag works without keyboard focus in the overlay.',
    related: ['number-input', 'settings'],
  },
  {
    slug: 'radio-group',
    name: 'Radio group',
    category: 'forms',
    description:
      'One choice out of a few, all visible with room for labels (game mode, price source). Use `ToggleGroup` for a compact segmented control, `Select` when space is short; wrap items in `FieldLabel` for choice cards.',
    status: 'stable',
    importName: 'RadioGroup',
    props: [
      { name: 'value / onValueChange', type: 'string / (value: string) => void', description: 'Controlled value (Radix RadioGroup).' },
      { name: 'RadioGroupItem value', type: 'string', required: true, description: 'Option value; pair with a `Label htmlFor`.' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", description: 'Arrow-key direction.' },
    ],
    examples: examplesFor('radio-group'),
    a11y: 'Radix RadioGroup: Tab enters the group at the checked item, arrows move and select. Name the group with `aria-label` or a `FieldLegend`.',
    related: ['toggle-group', 'checkbox', 'field'],
  },
  {
    slug: 'toggle',
    name: 'Toggle',
    category: 'forms',
    description:
      'A two-state button: an icon toggle (favorite), an outline toggle, or a `chip` filter chip (Uniques, Sets). Use `Switch` for settings, `ToggleGroup` for a set of related toggles.',
    status: 'stable',
    importName: 'Toggle',
    props: [
      { name: 'variant', type: "'default' | 'outline' | 'chip'", default: "'default'", description: '`chip` = pill filter chip with its own compact geometry.' },
      { name: 'size', type: "'default' | 'sm' | 'lg'", default: "'default'", description: 'h-9 / h-8 / h-10 (chips are h-6 unless a size is passed).' },
      { name: 'pressed / onPressedChange', type: 'boolean / (pressed: boolean) => void', description: 'Controlled state (Radix Toggle).' },
    ],
    examples: examplesFor('toggle'),
    a11y: 'Button with `aria-pressed`: Space/Enter toggle. Icon-only toggles need an `aria-label`.',
    related: ['toggle-group', 'button', 'checkbox'],
  },
  {
    slug: 'toggle-group',
    name: 'Toggle group',
    category: 'forms',
    description:
      'A segmented control (`type="single"`: 24h / 7d / 30d) or a set of related toggles (`type="multiple"`). Use `RadioGroup` when the choices need labels and descriptions, `Tabs` to switch panels.',
    status: 'stable',
    importName: 'ToggleGroup',
    props: [
      { name: 'type', type: "'single' | 'multiple'", required: true, description: 'One value or a set.' },
      { name: 'value / onValueChange', type: 'string | string[]', description: 'Controlled value(s) (Radix ToggleGroup).' },
      { name: 'variant / size', type: "'default' | 'outline' | 'chip' / 'default' | 'sm' | 'lg'", description: 'Passed to every `ToggleGroupItem` (Toggle variants).' },
    ],
    examples: examplesFor('toggle-group'),
    a11y: 'Radix ToggleGroup: roving focus with arrow keys; `single` items act as radios. Give the group an `aria-label`.',
    related: ['toggle', 'radio-group', 'tabs'],
  },
];
