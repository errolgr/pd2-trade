import { DataRow } from '@pd2-trader/ui';

export const meta = {
  title: 'Label and value',
  description: 'Muted label left, tabular value right; long values truncate.',
  order: 1,
};

export default function RowsExample() {
  return (
    <div className="flex w-sidebar flex-col gap-1 rounded-lg border bg-surface p-4">
      <DataRow label="Samples"
        value="84" />
      <DataRow label="Listed"
        value="2h ago" />
      <DataRow label="Confidence"
        value="High"
        valueClassName="font-medium text-success" />
      <DataRow label="Seller"
        value="A_really_long_account_name_that_truncates_in_the_row" />
    </div>
  );
}
