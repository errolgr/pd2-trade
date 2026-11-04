import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type OnChangeFn,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  type Updater,
  type VisibilityState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon, Settings2Icon } from 'lucide-react';

import { cn } from '../lib/utils';
import { useUiLabels } from '../lib/labels';
import { Button } from './button';
import { Checkbox } from './checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { EmptyState } from './state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

declare module '@tanstack/react-table' {
  // Same type parameters as TanStack's declaration, required for the merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Cell and header alignment; `end` for prices and counts. */
    align?: 'start' | 'end';
    /** Column name in DataTableViewOptions when `header` is not a string. */
    label?: string;
    /** Classes on every header and body cell of the column (width, tone). */
    className?: string;
  }
}

/** The TanStack table instance behind a DataTable (what the toolbar, view options and pagination read). */
type DataTableInstance<TData> = TanstackTable<TData>;

interface DataTableContextValue {
  table: DataTableInstance<unknown>;
}

const DataTableContext = React.createContext<DataTableContextValue | null>(null);

/** The table from props, else from the enclosing DataTable. */
function useDataTable<TData>(table: DataTableInstance<TData> | undefined, part: string): DataTableInstance<TData> {
  const context = React.useContext(DataTableContext);
  const resolved = table ?? (context?.table as DataTableInstance<TData> | undefined);
  if (!resolved) throw new Error(`${part} must be rendered inside <DataTable> (toolbar/footer) or get a \`table\` prop`);
  return resolved;
}

/** Controlled when `value` is defined, otherwise internal state; `onChange` fires either way. */
function useControllableState<T>(value: T | undefined, onChange: ((next: T) => void) | undefined, initial: T) {
  const [internal, setInternal] = React.useState(initial);
  const current = value === undefined ? internal : value;
  const currentRef = React.useRef(current);
  currentRef.current = current;
  const set = React.useCallback(
    (updater: Updater<T>) => {
      const next = typeof updater === 'function' ? (updater as (old: T) => T)(currentRef.current) : updater;
      if (value === undefined) setInternal(next);
      onChange?.(next);
    },
    [value, onChange],
  );
  return [current, set] as const;
}

function ariaSort(column: Column<unknown>): React.AriaAttributes['aria-sort'] {
  if (!column.getCanSort()) return undefined;
  const sorted = column.getIsSorted();
  return sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none';
}

interface DataTableColumnHeaderProps<TData, TValue> extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  column: Column<TData, TValue>;
  title: React.ReactNode;
}

/**
 * Sortable header label: a click cycles ascending → descending → unsorted, the icon shows the state. DataTable
 * renders it for every string `header` of a sortable column; use it yourself for custom header content.
 */
function DataTableColumnHeader<TData, TValue>({ column, title, className, ...props }: DataTableColumnHeaderProps<TData, TValue>) {
  const end = column.columnDef.meta?.align === 'end';
  if (!column.getCanSort()) {
    return (
      <div data-slot="data-table-column-header"
        className={cn(end && 'text-right', className)}
        {...props}>
        {title}
      </div>
    );
  }
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUpIcon : sorted === 'desc' ? ArrowDownIcon : ChevronsUpDownIcon;
  return (
    <div data-slot="data-table-column-header"
      className={cn('flex', end && 'justify-end', className)}
      {...props}>
      <Button
        variant="ghost"
        size="xs"
        className={cn(
          '-mx-1.5 gap-1 px-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground has-[>svg]:px-1.5 data-[sorted=true]:text-foreground',
          end && 'flex-row-reverse',
        )}
        data-sorted={sorted !== false}
        onClick={column.getToggleSortingHandler()}
      >
        {title}
        <Icon aria-hidden
          className={cn('size-3', sorted === false && 'opacity-50')} />
      </Button>
    </div>
  );
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  /** Stable row id (keeps selection across sorting and new data); defaults to the row index. */
  getRowId?: (row: TData, index: number) => string;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  defaultSorting?: SortingState;
  /** Global text filter over every string/number column (`DataTableToolbar` edits it). */
  filter?: string;
  onFilterChange?: (filter: string) => void;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  defaultColumnVisibility?: VisibilityState;
  /** Prepends a checkbox column (select row / select all on the page). */
  selectable?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  /** Turns on pagination with this page size (render `DataTablePagination` in `footer`). */
  pageSize?: number;
  /** Renders only the rows in view (thousands of rows); give the DataTable a height (`className="h-80"`). */
  virtualized?: boolean;
  /** Row height in px used by `virtualized` to size the scroll area. */
  rowHeight?: number;
  onRowClick?: (row: TData) => void;
  /** Compact cells for overlay panels. */
  dense?: boolean;
  /** Frames the table; turn off when a Card or panel already frames it. */
  bordered?: boolean;
  /** Shown when no row matches; defaults to a compact "No results" EmptyState. */
  empty?: React.ReactNode;
  /** Above the table: `DataTableToolbar` (filter, view options, actions). */
  toolbar?: React.ReactNode;
  /** Below the table: `DataTablePagination`. */
  footer?: React.ReactNode;
  /** Accessible name of the table. */
  'aria-label'?: string;
  className?: string;
}

/**
 * A data grid on TanStack Table: click-to-sort headers, a global text filter, column visibility, row selection,
 * pagination and virtualization for long lists, rendered with the Table parts.
 */
function DataTable<TData>({
  columns,
  data,
  getRowId,
  sorting: sortingProp,
  onSortingChange,
  defaultSorting = [],
  filter: filterProp,
  onFilterChange,
  columnVisibility: visibilityProp,
  onColumnVisibilityChange,
  defaultColumnVisibility = {},
  selectable = false,
  rowSelection: selectionProp,
  onRowSelectionChange,
  pageSize,
  virtualized = false,
  rowHeight,
  onRowClick,
  dense = false,
  bordered = true,
  empty,
  toolbar,
  footer,
  'aria-label': ariaLabel,
  className,
}: DataTableProps<TData>) {
  const labels = useUiLabels();
  const [sorting, setSorting] = useControllableState(sortingProp, onSortingChange, defaultSorting);
  const [filter, setFilter] = useControllableState(filterProp, onFilterChange, '');
  const [columnVisibility, setColumnVisibility] = useControllableState(
    visibilityProp,
    onColumnVisibilityChange,
    defaultColumnVisibility,
  );
  const [rowSelection, setRowSelection] = useControllableState<RowSelectionState>(
    selectionProp,
    onRowSelectionChange,
    {},
  );

  const allColumns = React.useMemo<ColumnDef<TData, any>[]>(() => {
    if (!selectable) return columns;
    const select: ColumnDef<TData, any> = {
      id: '__select',
      enableSorting: false,
      enableHiding: false,
      enableGlobalFilter: false,
      meta: { className: 'w-8' },
      header: ({ table }) => (
        <Checkbox
          aria-label={labels.selectAll}
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={labels.selectRow}
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(value) => row.toggleSelected(value === true)}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    };
    return [select, ...columns];
  }, [columns, selectable, labels.selectAll, labels.selectRow]);

  const table = useReactTable<TData>({
    data,
    columns: allColumns,
    getRowId,
    state: { sorting, globalFilter: filter, columnVisibility, rowSelection },
    onSortingChange: setSorting as OnChangeFn<SortingState>,
    onGlobalFilterChange: setFilter as OnChangeFn<string>,
    onColumnVisibilityChange: setColumnVisibility as OnChangeFn<VisibilityState>,
    onRowSelectionChange: setRowSelection as OnChangeFn<RowSelectionState>,
    enableRowSelection: selectable,
    sortDescFirst: false,
    globalFilterFn: 'includesString',
    initialState: pageSize ? { pagination: { pageIndex: 0, pageSize } } : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pageSize ? getPaginationRowModel() : undefined,
  });

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const estimate = rowHeight ?? (dense ? 28 : 36);
  const virtualizer = useVirtualizer({
    count: virtualized ? rows.length : 0,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => estimate,
    overscan: 12,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const visibleRows = virtualized ? virtualItems.map((item) => rows[item.index]) : rows;
  const padTop = virtualized && virtualItems.length ? virtualItems[0].start : 0;
  const padBottom =
    virtualized && virtualItems.length ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;
  const columnCount = table.getVisibleLeafColumns().length;

  // A new value every render: the table instance is stable while its state changes, and the toolbar/footer
  // elements come from the parent, so only a changed context value re-renders them.
  const context: DataTableContextValue = { table: table as DataTableInstance<unknown> };

  const renderRow = (row: Row<TData>) => (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() ? 'selected' : undefined}
      className={cn(onRowClick && 'cursor-pointer')}
      tabIndex={onRowClick ? 0 : undefined}
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
      onKeyDown={
        onRowClick
          ? (event) => {
            if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            onRowClick(row.original);
          }
          : undefined
      }
      style={virtualized ? { height: estimate } : undefined}
    >
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta;
        return (
          <TableCell
            key={cell.id}
            className={cn(
              dense ? 'px-1.5 py-1 text-xs' : 'text-sm',
              meta?.align === 'end' && 'text-right tabular-nums',
              meta?.className,
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <DataTableContext.Provider value={context}>
      <div data-slot="data-table"
        className={cn('flex min-h-0 flex-col gap-2', className)}>
        {toolbar}
        <div
          ref={viewportRef}
          data-slot="data-table-viewport"
          className={cn(
            'relative min-h-0 flex-1 overflow-auto [&>[data-slot=table-container]]:overflow-visible',
            bordered && 'rounded-md border border-border',
          )}
        >
          <Table aria-label={ariaLabel}
            aria-rowcount={virtualized ? rows.length + 1 : undefined}>
            <TableHeader className="sticky top-0 z-raised bg-surface backdrop-blur-md">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}
                  className="hover:bg-transparent">
                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const content = header.column.columnDef.header;
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        aria-sort={ariaSort(header.column as Column<unknown>)}
                        className={cn(dense && 'h-7 px-1.5', meta?.align === 'end' && 'text-right', meta?.className)}
                      >
                        {header.isPlaceholder ? null : typeof content === 'string' ? (
                          <DataTableColumnHeader column={header.column}
                            title={content} />
                        ) : (
                          flexRender(content, header.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columnCount}
                    className="whitespace-normal">
                    {empty ?? <EmptyState compact
                      title={labels.noResults} />}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {padTop > 0 && (
                    <TableRow aria-hidden
                      className="border-0 hover:bg-transparent"
                      style={{ height: padTop }} />
                  )}
                  {visibleRows.map(renderRow)}
                  {padBottom > 0 && (
                    <TableRow aria-hidden
                      className="border-0 hover:bg-transparent"
                      style={{ height: padBottom }} />
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        {footer}
      </div>
    </DataTableContext.Provider>
  );
}

interface DataTableToolbarProps<TData> extends React.ComponentPropsWithoutRef<'div'> {
  /** Defaults to the enclosing DataTable's table. */
  table?: DataTableInstance<TData>;
  /** Filter field placeholder (and accessible name); defaults to the "Filter…" label. */
  placeholder?: string;
}

/** Row above a DataTable: the global filter field on the left, `children` (view options, actions) on the right. */
function DataTableToolbar<TData>({ table: tableProp, placeholder, className, children, ...props }: DataTableToolbarProps<TData>) {
  const table = useDataTable(tableProp, 'DataTableToolbar');
  const labels = useUiLabels();
  const value = (table.getState().globalFilter as string | undefined) ?? '';
  return (
    <div data-slot="data-table-toolbar"
      className={cn('flex items-center justify-between gap-2', className)}
      {...props}>
      <Input
        type="search"
        value={value}
        placeholder={placeholder ?? labels.filterRows}
        aria-label={placeholder ?? labels.filterRows}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        className="h-8 max-w-60"
      />
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

interface DataTableViewOptionsProps<TData> {
  table?: DataTableInstance<TData>;
  className?: string;
}

/** "Columns" menu: a checkbox per hideable column. The menu stays open while toggling. */
function DataTableViewOptions<TData>({ table: tableProp, className }: DataTableViewOptionsProps<TData>) {
  const table = useDataTable(tableProp, 'DataTableViewOptions');
  const labels = useUiLabels();
  const columns = table.getAllLeafColumns().filter((column) => column.accessorFn !== undefined && column.getCanHide());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"
          size="sm"
          className={cn('h-8', className)}>
          <Settings2Icon aria-hidden />
          {labels.columns}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"
        className="min-w-40">
        <DropdownMenuLabel>{labels.toggleColumns}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => {
          const header = column.columnDef.header;
          return (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(value === true)}
              onSelect={(event) => event.preventDefault()}
            >
              {column.columnDef.meta?.label ?? (typeof header === 'string' ? header : column.id)}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface DataTablePaginationProps<TData> extends React.ComponentPropsWithoutRef<'div'> {
  table?: DataTableInstance<TData>;
  /** Choices in the rows-per-page select. */
  pageSizeOptions?: number[];
}

/** Row below a paginated DataTable: selected count, rows per page, "Page 1 of 4", previous/next. */
function DataTablePagination<TData>({
  table: tableProp,
  pageSizeOptions = [10, 20, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const table = useDataTable(tableProp, 'DataTablePagination');
  const labels = useUiLabels();
  const { pageIndex, pageSize } = table.getState().pagination;
  const selectable = Boolean(table.options.enableRowSelection);
  const options = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);
  return (
    <div
      data-slot="data-table-pagination"
      className={cn('flex items-center justify-between gap-3 text-xs text-muted-foreground', className)}
      {...props}
    >
      <span className="tabular-nums">
        {selectable
          ? labels.rowsSelected(table.getFilteredSelectedRowModel().rows.length, table.getFilteredRowModel().rows.length)
          : null}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span>{labels.rowsPerPage}</span>
          <Select value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger aria-label={labels.rowsPerPage}
              className="h-8 w-18 tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {options.map((option) => (
                <SelectItem key={option}
                  value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular-nums">{labels.pageOf(pageIndex + 1, Math.max(table.getPageCount(), 1))}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={labels.previousPage}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={labels.nextPage}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DataTable, DataTableColumnHeader, DataTableToolbar, DataTableViewOptions, DataTablePagination };
export type {
  DataTableProps,
  DataTableInstance,
  DataTableColumnHeaderProps,
  DataTableToolbarProps,
  DataTableViewOptionsProps,
  DataTablePaginationProps,
  ColumnDef,
  Column,
  Row,
  SortingState,
  VisibilityState,
  RowSelectionState,
};
