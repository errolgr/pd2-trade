import * as React from 'react';

import { cn } from '../lib/utils';

const Table = React.forwardRef<React.ElementRef<'table'>, React.ComponentPropsWithoutRef<'table'>>(function Table(
  { className, ...props },
  ref,
) {
  return (
    <div data-slot="table-container"
      className="relative w-full overflow-x-auto">
      <table data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        ref={ref}
        {...props} />
    </div>
  );
});

const TableHeader = React.forwardRef<React.ElementRef<'thead'>, React.ComponentPropsWithoutRef<'thead'>>(
  function TableHeader({ className, ...props }, ref) {
    return <thead data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      ref={ref}
      {...props} />;
  },
);

const TableBody = React.forwardRef<React.ElementRef<'tbody'>, React.ComponentPropsWithoutRef<'tbody'>>(
  function TableBody({ className, ...props }, ref) {
    return (
      <tbody data-slot="table-body"
        className={cn('[&_tr:last-child]:border-0', className)}
        ref={ref}
        {...props} />
    );
  },
);

const TableFooter = React.forwardRef<React.ElementRef<'tfoot'>, React.ComponentPropsWithoutRef<'tfoot'>>(
  function TableFooter({ className, ...props }, ref) {
    return (
      <tfoot
        data-slot="table-footer"
        className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const TableRow = React.forwardRef<React.ElementRef<'tr'>, React.ComponentPropsWithoutRef<'tr'>>(function TableRow(
  { className, ...props },
  ref,
) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b border-border transition-colors duration-(--dur-fast)',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const TableHead = React.forwardRef<React.ElementRef<'th'>, React.ComponentPropsWithoutRef<'th'>>(function TableHead(
  { className, ...props },
  ref,
) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-muted-foreground h-10 px-2 text-left text-xs uppercase tracking-wide align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const TableCell = React.forwardRef<React.ElementRef<'td'>, React.ComponentPropsWithoutRef<'td'>>(function TableCell(
  { className, ...props },
  ref,
) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const TableCaption = React.forwardRef<React.ElementRef<'caption'>, React.ComponentPropsWithoutRef<'caption'>>(
  function TableCaption({ className, ...props }, ref) {
    return (
      <caption
        data-slot="table-caption"
        className={cn('text-muted-foreground mt-4 text-sm', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
