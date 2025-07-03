import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from './components/DataTableColumnHeader';

export type Currency = {
  key: string;
  item: string;
  amount: number;
  price: number;
  value: number;
};

export const columns: ColumnDef<Currency>[] = [
  {
    accessorKey: 'item',
    header: 'Item',
    cell: ({ row }) => <p className="text-sm text-gray-300">{row.getValue('item')}</p>,
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column}
      title="Amount" />,
    cell: ({ row }) => <p className="text-sm text-gray-300">{row.getValue('amount')}</p>,
  },
  {
    accessorKey: 'price',
    header: ({ column }) => <DataTableColumnHeader column={column}
      title="Price" />,
    cell: ({ row }) => <p className="text-sm text-gray-300">{row.getValue('price')} HR</p>,
  },
  {
    accessorKey: 'value',
    header: ({ column }) => (
      <DataTableColumnHeader column={column}
        title="Value" />
    ),
    cell: ({ row }) => <p className="text-sm text-gray-300">{row.getValue('value')} HR</p>,
  },
];
