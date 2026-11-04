import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const primitivesDocs: ComponentDoc[] = [
  {
    slug: 'button',
    name: 'Button',
    category: 'primitives',
    description:
      'Every clickable action: main and secondary actions, icon buttons, list rows, picker triggers and inline text actions. Pick the variant by job, never restyle.',
    status: 'stable',
    importName: 'Button',
    props: [
      {
        name: 'variant',
        type: "'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'quiet' | 'field'",
        default: "'default'",
        description:
          '`default` = the one main action; `ghost` for icon and row buttons; `quiet` for inline text actions; `field` for picker triggers.',
      },
      {
        name: 'size',
        type: "'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs' | 'icon-2xs' | 'row' | 'inline'",
        default: "'default'",
        description:
          '`icon*` are square (chrome bar: `icon-sm`); `row` is a full-width list row; `inline` sits in running text.',
      },
      {
        name: 'asChild',
        type: 'boolean',
        default: 'false',
        description: 'Render the child element (a router `Link`, an `<a>`) with the button styles (Radix Slot).',
      },
    ],
    examples: examplesFor('button'),
    a11y:
      'Native `<button>`: Enter/Space activate. Icon-only buttons need an `aria-label`. Rows mark selection with `aria-selected`, `aria-current` or `data-active`. Focus ring via `focus-visible`.',
    related: ['button-group', 'toggle'],
  },
  {
    slug: 'button-group',
    name: 'Button group',
    category: 'primitives',
    description:
      'Attaches related buttons into one segmented control: split buttons, steppers, a short row of peer actions. For a single exclusive choice use a toggle group instead.',
    status: 'stable',
    importName: 'ButtonGroup',
    props: [
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description: 'Lay segments out in a row or a column; inner borders and radii are merged accordingly.',
      },
      {
        name: 'ButtonGroupText',
        type: 'ComponentProps<"div"> & { asChild?: boolean }',
        description: 'Non-interactive label segment ("Qty") inside the group.',
      },
      {
        name: 'ButtonGroupSeparator',
        type: "{ orientation?: 'horizontal' | 'vertical' }",
        default: "'vertical'",
        description: 'Divider between two solid segments (split button).',
      },
    ],
    examples: examplesFor('button-group'),
    a11y: 'Renders `role="group"`; give it an `aria-label` when the purpose is not obvious. Each Button keeps its own Tab stop.',
    related: ['button'],
  },
  {
    slug: 'badge',
    name: 'Badge',
    category: 'primitives',
    description:
      'Small static tag for item metadata (Ethereal, 3 os, Corrupted, Ladder). Not clickable; for removable filter tokens or toggles use a button.',
    status: 'stable',
    importName: 'Badge',
    props: [
      {
        name: 'variant',
        type: "'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'danger' | 'muted' | 'count'",
        default: "'default'",
        description:
          '`outline`/`secondary` for neutral metadata; solid `destructive` for strong warnings (Corrupted); tinted status tones `success`/`warning`/`info`/`danger`/`muted` for states (Enabled, Update available, Sync failed, Disabled); `count` for counters; `default` sparingly.',
      },
      {
        name: 'asChild',
        type: 'boolean',
        default: 'false',
        description: 'Render the child element (a link) with badge styles.',
      },
    ],
    examples: examplesFor('badge'),
    a11y: 'Plain text in a `<span>`; the text itself is what screen readers announce, so do not rely on color alone.',
    related: ['kbd'],
  },
  {
    slug: 'card',
    name: 'Card',
    category: 'primitives',
    description:
      'Bordered content block with header, content and footer (website summaries, settings groups). `ItemCard` is the dense row surface for item lists with interactive/selected/danger tones.',
    status: 'stable',
    importName: 'Card',
    props: [
      {
        name: 'asChild',
        type: 'boolean',
        default: 'false',
        description: 'Render the child (router `Link`, `<a>`) as the card, adding hover/focus styles: whole-tile links.',
      },
      {
        name: 'CardHeader / CardTitle / CardDescription / CardContent / CardFooter',
        type: 'ComponentProps<"div">',
        description: 'Layout parts; compose only the ones you need.',
      },
      {
        name: 'ItemCard.tone',
        type: "'static' | 'interactive' | 'selected' | 'danger'",
        default: "'static'",
        description: 'Row surface state. Interactive tones add hover/focus styles; add `role`/`tabIndex` and a handler yourself.',
      },
    ],
    examples: examplesFor('card'),
    a11y: 'Cards are plain `<div>`s; with `asChild` the link is the one Tab stop, so keep other interactive elements out of a link tile. An ItemCard that acts as a button needs `role="button"`, `tabIndex={0}` and Enter/Space handling (or wrap a Button).',
    related: ['separator'],
  },
  {
    slug: 'separator',
    name: 'Separator',
    category: 'primitives',
    description: 'Thin horizontal or vertical rule between blocks or inline stats.',
    status: 'stable',
    importName: 'Separator',
    props: [
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description: 'Vertical separators fill their parent height, so give the row a height.',
      },
      {
        name: 'decorative',
        type: 'boolean',
        default: 'true',
        description: 'When false it is announced as `role="separator"`.',
      },
    ],
    examples: examplesFor('separator'),
    a11y: 'Decorative by default (hidden from screen readers). Set `decorative={false}` when it separates semantic sections.',
    related: ['card'],
  },
  {
    slug: 'label',
    name: 'Label',
    category: 'primitives',
    description: 'Caption for a form control, bound with `htmlFor`. Dims itself when the peer control is disabled.',
    status: 'stable',
    importName: 'Label',
    props: [
      {
        name: 'htmlFor',
        type: 'string',
        description: 'Id of the control it labels; clicking the label focuses or toggles it.',
      },
    ],
    examples: examplesFor('label'),
    a11y: 'Radix Label (native `<label>`): gives the control its accessible name. In the overlay, clicking a label of a text input focuses the window like clicking the input.',
    related: ['typography'],
  },
  {
    slug: 'kbd',
    name: 'Kbd',
    category: 'primitives',
    description:
      'Keycaps for hotkeys in copy, menus and tooltips. `Kbd` is one key, `KbdGroup` arranges keys, `KbdCombo` renders a stored shortcut string like `Ctrl+Shift+D`.',
    status: 'stable',
    importName: 'Kbd',
    props: [
      {
        name: 'KbdCombo.keys',
        type: 'string | string[]',
        required: true,
        description:
          'A shortcut string split on `+` (via `parseKeyCombo`; `Ctrl++` = Ctrl and +) or the keys as an array. Keys are shown as written; no ⌘/⇧ translation.',
      },
      {
        name: 'children',
        type: 'ReactNode',
        description: '`Kbd`: the key label or a lucide icon (`size-3`).',
      },
    ],
    examples: examplesFor('kbd'),
    a11y: 'Native `<kbd>`, read as text. KbdCombo hides the visual `+` separators from screen readers; keys are read in order.',
    related: ['badge'],
  },
  {
    slug: 'avatar',
    name: 'Avatar',
    category: 'primitives',
    description:
      'Round picture for a user or character with initials/icon fallback (seller rows, profile menu). Default `size-8`; resize with `className`.',
    status: 'beta',
    importName: 'Avatar',
    props: [
      {
        name: 'AvatarImage.src',
        type: 'string',
        description: 'Image URL; the image only shows once loaded, otherwise the fallback stays.',
      },
      {
        name: 'AvatarImage.alt',
        type: 'string',
        description: 'Name of the person or character.',
      },
      {
        name: 'AvatarFallback.delayMs',
        type: 'number',
        description: 'Wait before showing the fallback to avoid a flash on fast loads.',
      },
    ],
    examples: examplesFor('avatar'),
    a11y: 'Radix Avatar. The image needs `alt`; initials fallbacks are read as text, so keep the name next to the avatar when initials are ambiguous.',
    related: ['badge'],
  },
  {
    slug: 'typography',
    name: 'Typography',
    category: 'primitives',
    description:
      'Text bound to the type scale: `Heading` (levels 1-4), `Text` (body, size + tone), `Muted` (captions), `Code` (inline) and `Prose` (long-form docs/guides wrapper that styles plain markup). Use these instead of ad-hoc `text-*` classes.',
    status: 'beta',
    importName: 'Heading',
    props: [
      {
        name: 'level',
        type: '1 | 2 | 3 | 4',
        default: '2',
        description: '1 = text-2xl page title, 2 = text-base section, 3 = text-sm panel title, 4 = text-xs group label.',
      },
      {
        name: 'as',
        type: "'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div'",
        default: '`h${level}`',
        description: 'Element override when the document outline differs from the visual size.',
      },
      {
        name: 'Text.size',
        type: "'xs' | 'sm' | 'base'",
        default: "'xs'",
        description: '`xs` overlay body, `sm` website body/primary values, `base` lead paragraphs.',
      },
      {
        name: 'Text.tone',
        type: "'default' | 'muted'",
        default: "'default'",
        description: 'Muted for secondary copy.',
      },
      {
        name: 'Prose.as',
        type: "'div' | 'article' | 'section' | 'main'",
        default: "'div'",
        description: 'Wrapper element for the article body (`text-base`, width from the page container).',
      },
    ],
    examples: examplesFor('typography'),
    a11y: 'Real heading elements keep the document outline; pick `as` to keep levels sequential. Prose links are underlined so they do not rely on color.',
    related: ['code-block', 'label'],
  },
  {
    slug: 'code-block',
    name: 'Code block',
    category: 'primitives',
    description:
      'Multi-line code or config with a copy button, optional title/language header and light syntax tinting (JSON, shell, JS/TS, Python; no highlighter dependency); scrolls both ways. The website docs render API examples and example sources with it; multi-language examples pass a `TabsList` as `title`. Inline snippets use `Code`.',
    status: 'beta',
    importName: 'CodeBlock',
    props: [
      { name: 'code', type: 'string', required: true, description: 'Source text (trailing newlines dropped), rendered verbatim and copied.' },
      { name: 'title', type: 'ReactNode', description: 'File name or caption in the header, or a `TabsList` for language tabs.' },
      {
        name: 'language',
        type: 'string',
        description: 'Header label; `json`, `bash`/`sh`/`curl`, `js`/`ts`/`jsx`/`tsx`, `python`/`py` are also tinted.',
      },
      {
        name: 'size',
        type: "'2xs' | 'xs' | 'sm'",
        default: "'xs'",
        description: '`2xs` dense overlay panels, `xs` panels, `sm` website docs pages.',
      },
      { name: 'copyable', type: 'boolean', default: 'true', description: 'Show the copy button.' },
      {
        name: 'onCopy',
        type: '(ok: boolean) => void',
        description: 'After a copy attempt. Default: error toast with UiLabels `copyFailed` when it fails.',
      },
      { name: 'label', type: 'string', description: 'Accessible name of the scrollable code region.' },
      {
        name: 'viewportClassName',
        type: 'string',
        description: 'Classes for the scrolling `<pre>`: height cap (default `max-h-96`), text tone.',
      },
    ],
    examples: examplesFor('code-block'),
    a11y:
      'Copy button is labelled from UiLabels `copy`/`copied` and works by pointer without window focus. Uses `navigator.clipboard`; if the clipboard is unavailable the click does nothing. The `<pre>` is a Tab stop so keyboard users can scroll long sources with the arrow keys.',
    related: ['typography'],
  },
];
