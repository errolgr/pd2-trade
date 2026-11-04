import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const navigationDocs: ComponentDoc[] = [
  {
    slug: 'breadcrumb',
    name: 'Breadcrumb',
    category: 'navigation',
    description:
      'Where the current page sits in a hierarchy (Builds / Sorceress / Blizzard), with links back up. For website pages and deep overlay views; not for switching sibling views (use Tabs).',
    status: 'stable',
    importName: 'Breadcrumb',
    props: [
      {
        name: 'BreadcrumbLink asChild',
        type: 'boolean',
        default: 'false',
        description: 'Style the child (a router `Link`) instead of rendering an `<a>`.',
      },
      {
        name: 'BreadcrumbSeparator children',
        type: 'ReactNode',
        default: '<ChevronRight />',
        description: 'Custom separator icon (`<Slash />`).',
      },
      {
        name: 'BreadcrumbPage',
        type: 'span',
        description: 'The current page: plain text with `aria-current="page"`; never a link.',
      },
      {
        name: 'BreadcrumbEllipsis',
        type: 'span',
        description: 'Collapsed middle segments; screen-reader text from `UiLabels.more`. Wrap in a DropdownMenu trigger to reveal them.',
      },
    ],
    examples: examplesFor('breadcrumb'),
    a11y:
      '`<nav aria-label="breadcrumb">` with an ordered list; separators are `aria-hidden`. The current page has `aria-current="page"`. Links are native anchors (Tab/Enter).',
    related: ['tabs', 'navigation-menu', 'dropdown-menu'],
  },
  {
    slug: 'tabs',
    name: 'Tabs',
    category: 'navigation',
    description:
      'Switch between sibling views of the same subject inside one panel or card (Offers / Listings / Sold). For a pressed filter or segmented value use ToggleGroup; for pages use links.',
    status: 'stable',
    importName: 'Tabs',
    props: [
      {
        name: 'value',
        type: 'string',
        description: 'Controlled active tab (pair with `onValueChange`).',
      },
      {
        name: 'defaultValue',
        type: 'string',
        description: 'Uncontrolled initial tab.',
      },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        description: 'Called when the user selects another tab.',
      },
      {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        default: "'horizontal'",
        description: 'Arrow-key direction for roving focus.',
      },
      {
        name: 'activationMode',
        type: "'automatic' | 'manual'",
        default: "'automatic'",
        description: '`manual` selects on Enter/Space instead of on focus.',
      },
      {
        name: 'TabsTrigger value / disabled',
        type: 'string / boolean',
        required: true,
        description: 'Each trigger matches the `TabsContent` with the same `value`; disabled triggers stay visible.',
      },
    ],
    examples: examplesFor('tabs'),
    a11y:
      'Radix Tabs: `tablist`/`tab`/`tabpanel` roles, arrow keys move between triggers, Home/End jump. Pointer clicks work while the overlay window is not focused; arrow keys need the panel to have the keyboard.',
    related: ['toggle-group', 'navigation-menu', 'sidebar'],
  },
  {
    slug: 'pagination',
    name: 'Pagination',
    category: 'navigation',
    description:
      'Page links for long server-paged lists (market results, leaderboard). Prefer a virtualized list or "Show more" in the overlay; use pagination when the page number is shareable or the server pages.',
    status: 'stable',
    importName: 'Pagination',
    props: [
      {
        name: 'PaginationLink isActive',
        type: 'boolean',
        default: 'false',
        description: 'Current page: outline style and `aria-current="page"`.',
      },
      {
        name: 'PaginationLink size',
        type: "'default' | 'sm' | 'icon' | 'icon-sm'",
        default: "'icon'",
        description: 'Button size of the link (square `icon` for numbers).',
      },
      {
        name: 'PaginationPrevious / PaginationNext children',
        type: 'ReactNode',
        default: 'UiLabels.previous / UiLabels.next',
        description: 'Visible text (hidden below `sm`); the `aria-label` comes from `UiLabels.previousPage` / `nextPage`.',
      },
      {
        name: 'PaginationEllipsis',
        type: 'span',
        description: 'Skipped range; screen-reader text from `UiLabels.morePages`.',
      },
    ],
    examples: examplesFor('pagination'),
    a11y:
      '`<nav>` landmark labelled by `UiLabels.pagination`; links are anchors (`href` + `onClick` for client paging). Disable an end with `aria-disabled` plus `pointer-events-none` (anchors have no `disabled`).',
    related: ['table', 'button'],
  },
  {
    slug: 'navigation-menu',
    name: 'Navigation menu',
    category: 'navigation',
    description:
      'The website top navigation: section links plus hover-opened panels of links (Net worth, Tools). For actions on a single trigger use DropdownMenu; for the side navigation of an admin or split view use Sidebar.',
    status: 'beta',
    importName: 'NavigationMenu',
    props: [
      {
        name: 'viewport',
        type: 'boolean',
        default: 'true',
        description:
          'Render the shared viewport under the list (animates between items). `false`: each content opens as its own popover under its trigger, or inside a `NavigationMenuViewport` you place.',
      },
      {
        name: 'value / defaultValue / onValueChange',
        type: 'string / string / (value: string) => void',
        description: 'Open item (its `NavigationMenuItem value`), controlled or not; empty string = closed.',
      },
      {
        name: 'delayDuration',
        type: 'number',
        default: '200',
        description: 'Hover delay (ms) before a content opens.',
      },
      {
        name: 'NavigationMenuLink active',
        type: 'boolean',
        default: 'false',
        description:
          'Current page (`aria-current="page"`). With `navigationMenuTriggerStyle()` it takes the glow; inside a content it gets the accent row.',
      },
      {
        name: 'NavigationMenuViewport align',
        type: "'start' | 'center' | 'end'",
        default: "'start'",
        description: 'Edge of the menu the hand-placed viewport lines up with.',
      },
      {
        name: 'navigationMenuTriggerStyle()',
        type: '() => string',
        description: 'Class string that makes a top-level `NavigationMenuLink` look like a trigger.',
      },
    ],
    examples: examplesFor('navigation-menu'),
    a11y:
      'Radix NavigationMenu: `nav` landmark, Tab/arrow keys move between triggers, Enter/Space/ArrowDown open, Escape closes. Opens on hover, so it works in the non-focusable overlay; the viewport is inline (no portal) and stacks with `z-popup`, so give the header room or `relative z-raised`.',
    related: ['dropdown-menu', 'sidebar', 'breadcrumb'],
  },
  {
    slug: 'sidebar',
    name: 'Sidebar',
    category: 'navigation',
    description:
      'Collapsible side column for overlay split panels (filters, conversations) and website developer/admin pages: grouped menu rows, header/footer, collapse to icons or off-canvas, a sheet on narrow viewports. For a resizable split use Resizable; for a one-off drawer use Sheet.',
    status: 'beta',
    importName: 'SidebarProvider',
    props: [
      {
        name: 'defaultOpen',
        type: 'boolean',
        default: 'true',
        description: 'Uncontrolled initial expanded state.',
      },
      {
        name: 'open / onOpenChange',
        type: 'boolean / (open: boolean) => void',
        description: 'Controlled expanded state. Nothing is persisted: store `open` yourself if it should be remembered.',
      },
      {
        name: 'isMobile',
        type: 'boolean',
        description:
          'Force the sheet layout (`true`, e.g. a narrow overlay panel) or the in-flow layout (`false`). Default: viewport below 768px.',
      },
      {
        name: 'Sidebar side',
        type: "'left' | 'right'",
        default: "'left'",
        description: 'Edge of the border and of the sheet. The sidebar is in-flow: place it after `SidebarInset` for `right`.',
      },
      {
        name: 'Sidebar collapsible',
        type: "'offcanvas' | 'icon' | 'none'",
        default: "'offcanvas'",
        description: '`offcanvas` collapses to zero width, `icon` to a 48px icon rail, `none` never collapses.',
      },
      {
        name: 'SidebarMenuButton isActive / size / tooltip',
        type: "boolean / 'default' | 'sm' | 'lg' / string | TooltipContentProps",
        default: "false / 'default'",
        description: 'Current row; row height (32/28/48px); label shown to the right while collapsed to icons.',
      },
      {
        name: 'SidebarMenuAction showOnHover',
        type: 'boolean',
        default: 'false',
        description: 'Hide the row action until the row is hovered or focused.',
      },
      {
        name: 'SidebarMenuSubButton size / isActive',
        type: "'sm' | 'md' / boolean",
        default: "'md' / false",
        description: 'Nested link row; `isActive` sets `aria-current="page"`.',
      },
      {
        name: 'useSidebar()',
        type: '{ state, open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar }',
        description: 'State for any child. No keyboard shortcut is registered: wire host hotkeys to `toggleSidebar`.',
      },
    ],
    examples: examplesFor('sidebar'),
    a11y:
      '`SidebarTrigger` and `SidebarRail` are labelled by `UiLabels.toggleSidebar`; the rail is pointer-only (`tabIndex=-1`). Rows are buttons or links (`asChild`); `isActive` sets `data-active` (and `aria-current` on links). Collapsed-icon tooltips open on hover, so they work in the non-focusable overlay. The narrow layout is a modal Sheet (focus trapped, Escape and the scrim close it; the title is screen-reader only, `UiLabels.sidebar`).',
    related: ['sheet', 'resizable', 'navigation-menu', 'tooltip'],
  },
];
