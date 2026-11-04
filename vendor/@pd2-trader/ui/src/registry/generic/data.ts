import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const dataDocs: ComponentDoc[] = [
  {
    slug: 'table',
    name: 'Table',
    category: 'data',
    description:
      'Static tabular markup (header, body, footer, caption) for a handful of rows you render yourself. For sorting, filtering, paging or long lists use DataTable, which renders these parts.',
    status: 'stable',
    importName: 'Table',
    props: [
      {
        name: 'className',
        type: 'string',
        description: 'Classes on the `<table>`; it sits in a horizontally scrolling `table-container` div.',
      },
      {
        name: 'TableRow data-state',
        type: "'selected'",
        description: 'Marks the selected row (accent fill).',
      },
      {
        name: 'TableCell / TableHead className',
        type: 'string',
        description: 'Right-align numbers with `text-right tabular-nums`; cells do not wrap (`whitespace-nowrap`).',
      },
    ],
    examples: examplesFor('table'),
    a11y:
      'Native table semantics (`table`, `thead`, `th`, `td`); give the table a `TableCaption` or an `aria-label`. Rows are not focusable: put actions in buttons inside cells.',
    related: ['data-table', 'data-row', 'market-row'],
  },
  {
    slug: 'data-table',
    name: 'Data table',
    category: 'data',
    description:
      'A data grid on TanStack Table: click-to-sort headers, a global text filter, column visibility, row selection, pagination and virtualization for thousands of rows. Use it for any list the user sorts or searches; use Table for static markup and MarketRow for listing rows.',
    status: 'beta',
    importName: 'DataTable',
    props: [
      {
        name: 'columns',
        type: 'ColumnDef<TData>[]',
        required: true,
        description:
          'TanStack column defs (`accessorKey`, `header`, `cell`, `enableSorting`, `enableHiding`). A string `header` renders a sort button; `meta.align: "end"` right-aligns, `meta.label` names the column in the view menu, `meta.className` styles its cells.',
      },
      { name: 'data', type: 'TData[]', required: true, description: 'Rows.' },
      {
        name: 'getRowId',
        type: '(row: TData, index: number) => string',
        description: 'Stable row id; keeps selection across sorting and refreshed data. Defaults to the index.',
      },
      {
        name: 'sorting / onSortingChange / defaultSorting',
        type: 'SortingState',
        default: '[]',
        description: 'Sort order, controlled or uncontrolled. A header click cycles ascending → descending → off.',
      },
      {
        name: 'filter / onFilterChange',
        type: 'string',
        description: 'Global case-insensitive filter over string and number columns; DataTableToolbar edits it.',
      },
      {
        name: 'columnVisibility / onColumnVisibilityChange / defaultColumnVisibility',
        type: 'VisibilityState',
        default: '{}',
        description: '`{ columnId: false }` hides a column; DataTableViewOptions toggles them.',
      },
      {
        name: 'selectable / rowSelection / onRowSelectionChange',
        type: 'boolean / RowSelectionState',
        default: 'false',
        description: 'Adds a checkbox column (select row, select all on the page); selection is keyed by row id.',
      },
      {
        name: 'pageSize',
        type: 'number',
        description: 'Turns on pagination with this page size; render DataTablePagination in `footer`.',
      },
      {
        name: 'virtualized',
        type: 'boolean',
        default: 'false',
        description:
          'Renders only the rows in view (TanStack Virtual) under a sticky header. Give the DataTable a height (`className="h-80"`).',
      },
      {
        name: 'rowHeight',
        type: 'number',
        default: '36 (dense: 28)',
        description: 'Fixed row height in px the virtualizer sizes the scroll area with.',
      },
      {
        name: 'onRowClick',
        type: '(row: TData) => void',
        description: 'Makes rows clickable (pointer cursor, focusable, Enter/Space activate).',
      },
      { name: 'dense', type: 'boolean', default: 'false', description: 'Compact cells for overlay panels.' },
      {
        name: 'bordered',
        type: 'boolean',
        default: 'true',
        description: 'Rounded border around the scroll area; turn off inside a Card or panel that already frames it.',
      },
      {
        name: 'empty',
        type: 'ReactNode',
        description: 'Shown when no row matches; defaults to a compact "No results" EmptyState.',
      },
      {
        name: 'toolbar / footer',
        type: 'ReactNode',
        description:
          'Slots above and below the table for DataTableToolbar (with DataTableViewOptions) and DataTablePagination; they read the table from context.',
      },
      {
        name: 'DataTableColumnHeader',
        type: '{ column: Column<TData>; title: ReactNode }',
        description: 'The sort button for a custom `header` function (`header: ({ column }) => …`).',
      },
      {
        name: 'DataTableToolbar placeholder',
        type: 'string',
        default: "labels.filterRows ('Filter…')",
        description: 'Filter field placeholder and accessible name; `children` render on the right.',
      },
      {
        name: 'DataTablePagination pageSizeOptions',
        type: 'number[]',
        default: '[10, 20, 50]',
        description: 'Rows-per-page choices. Shows "n of m selected" when the table is `selectable`.',
      },
    ],
    examples: examplesFor('data-table'),
    a11y:
      'Native table semantics; sortable headers are buttons and the `th` carries `aria-sort` (ascending / descending / none). Selection checkboxes, the filter field and the pagination buttons have UiLabels names (`selectRow`, `selectAll`, `filterRows`, `previousPage`, `nextPage`, `rowsPerPage`). Pass `aria-label` to name the table. Virtualized tables set `aria-rowcount` to the full count. Overlay: sorting, menus and paging work by pointer without focus; the filter field takes the keyboard only when clicked, like every text field.',
    related: ['table', 'pagination', 'dropdown-menu', 'empty-state', 'market-row'],
  },
  {
    slug: 'chart',
    name: 'Chart',
    category: 'data',
    description:
      'Theme-aware wrapper around recharts: ChartContainer maps a ChartConfig (series label + `--chart-*` color) to `var(--color-<key>)`, ChartTooltipContent and ChartLegendContent render the tooltip and legend with DS surfaces. Use it for full charts; SparkChart for an inline trend, PriceHistoryChart for item price history.',
    status: 'stable',
    importName: 'ChartContainer',
    props: [
      {
        name: 'config',
        type: 'ChartConfig',
        required: true,
        description:
          '`{ [series]: { label?, icon?, color? | theme?: { light, dark } } }`. Use `var(--chart-1)` … `var(--chart-5)` or q-* quality tokens as colors.',
      },
      {
        name: 'children',
        type: 'ReactElement',
        required: true,
        description: 'One recharts chart (`AreaChart`, `BarChart`, `LineChart`…); it fills the container responsively.',
      },
      {
        name: 'className',
        type: 'string',
        description: 'Give the container a size (`aspect-video w-full`, `h-40`); recharts needs a height.',
      },
      {
        name: 'ChartTooltipContent indicator',
        type: "'dot' | 'line' | 'dashed'",
        default: "'dot'",
        description: 'Series marker in the tooltip; also `hideLabel`, `hideIndicator`, `labelKey`, `nameKey`, `formatter`.',
      },
      {
        name: 'ChartLegendContent hideIcon / nameKey',
        type: 'boolean / string',
        default: 'false',
        description: 'Legend entries from the config labels (and icons).',
      },
    ],
    examples: examplesFor('chart'),
    a11y:
      'Charts are SVG pictures: state the key number in text next to them, or give the container an `aria-label`. Tooltips follow the pointer and are not keyboard reachable, so never put the only copy of a value there.',
    related: ['spark-chart', 'price-history-chart', 'card'],
  },
  {
    slug: 'item',
    name: 'Item',
    category: 'data',
    description:
      'A generic content row: media, title + description, actions, optional header/footer line (a plugin in a list, an account, a notification, a guide link). For D2 data use the domain rows: MarketRow for a listing or offer with price, DataRow for a label/value pair. For a plain one-action list row (picker options, nav lists) use `Button size="row"`.',
    status: 'beta',
    importName: 'Item',
    props: [
      {
        name: 'variant',
        type: "'default' | 'outline' | 'muted'",
        default: "'default'",
        description: '`default` has no frame (rows in a list), `outline` a border (standalone row), `muted` a quiet fill.',
      },
      {
        name: 'size',
        type: "'default' | 'sm'",
        default: "'default'",
        description: '`sm` for dense overlay lists.',
      },
      {
        name: 'asChild',
        type: 'boolean',
        default: 'false',
        description: 'Render the child (`<a>`, router `Link`) with the row styles; links get the hover fill.',
      },
      {
        name: 'ItemMedia variant',
        type: "'default' | 'icon' | 'image'",
        default: "'default'",
        description: '`icon` puts the icon in a muted tile, `image` crops an image to a 40px square.',
      },
      {
        name: 'Parts',
        type: 'ItemGroup, ItemSeparator, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemHeader, ItemFooter',
        description:
          'ItemGroup makes a list (its Items become list items); ItemDescription clamps to two lines; ItemHeader/ItemFooter take a full line.',
      },
    ],
    examples: examplesFor('item'),
    a11y:
      'A plain `div` unless `asChild` renders a link; inside an ItemGroup (`role="list"`) non-link Items get `role="listitem"`. Put actions in real buttons in ItemActions; do not nest a link Item around other interactive controls.',
    related: ['market-row', 'data-row', 'button', 'card'],
  },
];
