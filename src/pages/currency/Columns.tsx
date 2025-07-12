import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from './components/DataTableColumnHeader';
import { formatHr, formatWithUnderscore } from '@/lib/utils';

export type Currency = {
  key: string;
  item: string;
  amount: number;
  price: number;
  value: number;
};

export function createColumns(category: string): ColumnDef<Currency>[] {
  return [
    {
      accessorKey: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div className="flex flex-row">
          <img src={`/${category}/${formatWithUnderscore(row.getValue('item'))}.png`} style={{ width: 20 }} />
          <p className="pl-2 text-sm text-gray-300">{row.getValue('item')}</p>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => <p className="text-sm text-gray-300">{row.getValue('amount')}</p>,
    },
    {
      accessorKey: 'price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => <p className="text-sm text-gray-300">{formatHr(row.getValue('price'))}</p>,
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => <p className="text-sm text-gray-300">{formatHr(row.getValue('value'))}</p>,
    },
  ];
}
