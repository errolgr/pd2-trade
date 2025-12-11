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
  sampleCount?: number; // Optional sample count for display
};

export function createColumns(category: string): ColumnDef<Currency>[] {
  return [
    {
      accessorKey: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div className="flex flex-row">
          <img src={`/${category}/${formatWithUnderscore(row.getValue('item'))}.png`}
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
      cell: ({ row }) => {
        const price = row.getValue('price') as number;
        const sampleCount = row.original.sampleCount;
        return (
          <div className="flex flex-row flex-col items-center gap-2">
            <p className="text-sm text-gray-300">{formatHr(price)}</p>
            {sampleCount !== undefined && sampleCount > 0 && (
              <p className="text-xs text-gray-500">({sampleCount} listings)</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'value',
      header: ({ column }) => <DataTableColumnHeader column={column}
        title="Value" />,
      cell: ({ row }) => <p className="text-sm text-gray-300">{formatHr(row.getValue('value'))}</p>,
    },
  ];
}
