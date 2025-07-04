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

function flipAndJoinRuneName(str) {
  const parts = str.trim().split(/\s+/); // Split by any whitespace
  if (parts.length !== 2) {
    throw new Error('Input must contain exactly two words.');
  }
  return parts[1] + parts[0];
}

export const columns: ColumnDef<Currency>[] = [
  {
    accessorKey: 'item',
    header: 'Item',
    cell: ({ row }) => (
      <div className="flex flex-row">
        <img src={`/runes/${flipAndJoinRuneName(row.getValue('item'))}.png`}
          style={{ width: 20 }} />
        <p className="pl-2 text-sm text-gray-300">{row.getValue('item')}</p>
      </div>
    ),
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
    header: ({ column }) => <DataTableColumnHeader column={column}
      title="Value" />,
    cell: ({ row }) => <p className="text-sm text-gray-300">{row.getValue('value')} HR</p>,
  },
];
