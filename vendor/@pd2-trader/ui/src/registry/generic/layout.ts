import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const layoutDocs: ComponentDoc[] = [
  {
    slug: 'panel-chrome',
    name: 'Panel chrome',
    category: 'layout',
    description:
      'The frame of every overlay window: PanelSurface is the translucent panel (border, blur, shadow), PanelChrome its title bar with drag grip, icon, title, centered slot, actions and close button. Use it for top-level panels; use Card for blocks inside a panel.',
    status: 'stable',
    importName: 'PanelChrome',
    props: [
      { name: 'title', type: 'ReactNode', required: true, description: 'Bar title; truncates before the controls.' },
      { name: 'icon', type: 'ReactNode', description: 'Lucide icon before the title (sized to 16px).' },
      { name: 'actions', type: 'ReactNode', description: 'Right-side controls (ghost `icon-sm` buttons) before the close button.' },
      { name: 'center', type: 'ReactNode', description: 'Centered in the bar regardless of title/action widths (a search field).' },
      { name: 'onClose', type: '() => void', description: 'Shows the close button (label from UiLabels `close` or `closeLabel`).' },
      { name: 'dragRegion', type: 'boolean', default: 'true', description: 'Marks the bar as the panel drag handle (`data-panel-drag`).' },
      { name: 'showGrip', type: 'boolean', default: 'dragRegion', description: 'Show the grip icon on the left.' },
      { name: 'diabloFont', type: 'boolean', default: 'false', description: 'Render the title in DiabloFont.' },
      { name: 'gripId', type: 'string', description: 'DOM id for the grip (e.g. `titlebar-drag-handle`).' },
      { name: 'PanelSurface animate', type: 'boolean', default: 'false', description: 'Scale/fade the surface in on mount (skipped with reduced motion).' },
    ],
    examples: examplesFor('panel-chrome'),
    a11y:
      'The close button is a native button with an aria-label. The bar itself is pointer-only (drag); controls inside stay keyboard reachable once the window has focus. In the non-focusable overlay, everything in the bar must work on click without focus.',
    related: ['card', 'scroll-area', 'resizable'],
  },
  {
    slug: 'scroll-area',
    name: 'Scroll area',
    category: 'layout',
    description:
      'Scrolling region with the themed thin scrollbar (Radix ScrollArea). Use it for every scrolling list or panel body instead of native `overflow-auto`, so scrollbars match the theme and window transparency.',
    status: 'stable',
    importName: 'ScrollArea',
    props: [
      { name: 'viewportClassName', type: 'string', description: 'Classes for the scrolling viewport; put a max height here to make an auto-height area scroll.' },
      { name: 'type', type: "'auto' | 'always' | 'scroll' | 'hover'", default: "'hover'", description: 'When scrollbars show (Radix).' },
      { name: 'ScrollBar orientation', type: "'vertical' | 'horizontal'", default: "'vertical'", description: 'Both bars are already mounted; render a ScrollBar only for custom placement.' },
    ],
    examples: examplesFor('scroll-area'),
    a11y:
      'Native scrolling underneath: wheel, touch and (when focused) arrow/Page keys. The viewport shows a focus ring when tabbed to. Wheel scrolling works in the non-focusable overlay.',
    related: ['panel-chrome', 'resizable'],
  },
  {
    slug: 'resizable',
    name: 'Resizable',
    category: 'layout',
    description:
      'Split layout with draggable dividers (react-resizable-panels): list | detail in the market browser, docs nav | page on the website. Use it when the user should choose the split; use fixed widths (`w-sidebar`) when they should not.',
    status: 'beta',
    importName: 'ResizablePanelGroup',
    props: [
      { name: 'direction', type: "'horizontal' | 'vertical'", required: true, description: '`horizontal` puts panels side by side.' },
      { name: 'autoSaveId', type: 'string', description: 'Persist the sizes in localStorage under this id.' },
      { name: 'onLayout', type: '(sizes: number[]) => void', description: 'Called with the panel sizes (percent) after a resize.' },
      { name: 'ResizablePanel defaultSize / minSize / maxSize', type: 'number', description: 'Sizes in percent of the group.' },
      { name: 'ResizablePanel collapsible', type: 'boolean', default: 'false', description: 'Panel collapses to `collapsedSize` when dragged below `minSize`.' },
      { name: 'ResizableHandle withHandle', type: 'boolean', default: 'false', description: 'Show the grip on the divider.' },
    ],
    examples: examplesFor('resizable'),
    a11y:
      'Handles are `role="separator"` with aria-valuenow; when focused, arrow keys resize and Home/End jump to min/max (library default), with a focus-visible ring. The hit area is wider than the hairline. In the non-focusable overlay, resizing is pointer-only.',
    related: ['scroll-area', 'panel-chrome'],
  },
  {
    slug: 'aspect-ratio',
    name: 'Aspect ratio',
    category: 'layout',
    description:
      'Keeps content at a fixed ratio (Radix AspectRatio): item art, screenshots and video embeds on the website, so the layout does not shift while media loads.',
    status: 'beta',
    importName: 'AspectRatio',
    props: [
      { name: 'ratio', type: 'number', default: '1', description: 'Width / height, e.g. `16 / 9`. The child should fill it (`size-full object-cover`).' },
    ],
    examples: examplesFor('aspect-ratio'),
    a11y: 'Layout only; give images `alt` text and iframes a `title`.',
    related: ['card'],
  },
  {
    slug: 'accordion',
    name: 'Accordion',
    category: 'layout',
    description:
      'A stack of headed sections that expand in place (Radix Accordion): FAQs, guide chapters, grouped filters. Use Collapsible for a single show-more block.',
    status: 'stable',
    importName: 'Accordion',
    props: [
      { name: 'type', type: "'single' | 'multiple'", required: true, description: '`single` keeps one item open; `multiple` lets several open.' },
      { name: 'collapsible', type: 'boolean', default: 'false', description: 'With `single`: allow closing the open item.' },
      { name: 'defaultValue', type: 'string | string[]', description: 'Initially open item(s), uncontrolled.' },
      { name: 'value / onValueChange', type: 'string | string[]', description: 'Controlled open item(s).' },
      { name: 'AccordionItem value', type: 'string', required: true, description: 'Item id; `disabled` blocks toggling.' },
    ],
    examples: examplesFor('accordion'),
    a11y:
      'Triggers are buttons inside headings with aria-expanded/aria-controls; Enter/Space toggle, arrow keys move between triggers, Home/End jump. Height animation is skipped with reduced motion. Clicking works without window focus.',
    related: ['collapsible', 'tabs'],
  },
  {
    slug: 'collapsible',
    name: 'Collapsible',
    category: 'layout',
    description:
      'One block that shows or hides extra content (Radix Collapsible): "show more" stats, an advanced-filters drawer. Use Accordion for several related sections.',
    status: 'stable',
    importName: 'Collapsible',
    props: [
      { name: 'defaultOpen', type: 'boolean', default: 'false', description: 'Initial state, uncontrolled.' },
      { name: 'open / onOpenChange', type: 'boolean / (open: boolean) => void', description: 'Controlled state.' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Blocks toggling.' },
      { name: 'CollapsibleTrigger asChild', type: 'boolean', default: 'false', description: 'Use your own Button as the trigger.' },
    ],
    examples: examplesFor('collapsible'),
    a11y:
      'The trigger gets aria-expanded/aria-controls; Enter/Space toggle. Icon-only triggers need an aria-label. Height animation is skipped with reduced motion.',
    related: ['accordion'],
  },
  {
    slug: 'settings',
    name: 'Settings',
    category: 'layout',
    description:
      'Building blocks of every settings page: SettingsSection (page header), SettingsGroup (card of rows), SettingsRow (label + description + control, a react-hook-form FormItem), SettingsHint and SettingsSkeleton. `SETTING_HIGHLIGHT` is the flash `openPanel(\'settings\', { field })` applies to the row with that `settingKey`; add it to custom rows that carry `data-setting-key`.',
    status: 'stable',
    importName: 'SettingsRow',
    props: [
      { name: 'label', type: 'ReactNode', required: true, description: 'Row label (FormLabel; clicking it focuses/toggles the control).' },
      { name: 'description', type: 'ReactNode', description: 'Muted help text (FormDescription, wired to aria-describedby).' },
      { name: 'control', type: 'ReactNode', description: 'The control. Inside a FormField wrap the focusable part in FormControl; standalone give it `id={controlId}`.' },
      { name: 'controlId', type: 'string', description: 'Standalone rows (no react-hook-form Form): the control id the label points at; the description gets `${controlId}-description` for aria-describedby.' },
      { name: 'layout', type: "'inline' | 'stacked'", default: "'inline'", description: '`stacked` puts the control under the label at full width (text inputs).' },
      { name: 'disabled', type: 'boolean', description: 'Mutes the label and hover (the control keeps its own disabled state).' },
      { name: 'settingKey', type: 'string', description: 'The ISettings key: deep links scroll to the row and flash SETTING_HIGHLIGHT.' },
      { name: 'SettingsGroup title / aside / dimmed', type: 'string / ReactNode / boolean', description: 'Group heading, its right side, and dimming the whole card.' },
      { name: 'SettingsSection as', type: "'h3' | 'h4'", default: "'h3'", description: 'Heading level; sub-sections use h4.' },
      { name: 'SettingsSkeleton rows', type: 'number', default: '3', description: 'Placeholder rows while settings load.' },
    ],
    examples: examplesFor('settings'),
    a11y:
      'Rows wire label, description and control ids through FormItem/FormControl. The skeleton is aria-hidden. Text fields need a click to focus the overlay window; switches and selects work on click.',
    related: ['form', 'switch', 'select'],
  },
];
