import { Alert, AlertDescription, AlertTitle } from '@pd2-trader/ui';

import { AlertTriangle, Info } from 'lucide-react';

export const meta = {
  title: 'Variants',
  description: 'Default and destructive alerts with an icon, title and description, plus a title-only alert.',
  order: 0,
};

export default function VariantsExample() {
  return (
    <div className="flex w-popover flex-col gap-3">
      <Alert>
        <Info />
        <AlertTitle>Ladder reset in 3 days</AlertTitle>
        <AlertDescription>Listings on the current ladder are archived when the season ends.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Could not reach pd2trader.com</AlertTitle>
        <AlertDescription>Price data is from your last session. Check your connection and retry.</AlertDescription>
      </Alert>
      <Alert>
        <AlertTitle>Title only, no icon</AlertTitle>
      </Alert>
    </div>
  );
}
