import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pd2-trader/ui';
import { Flame, Shield, Snowflake, Zap } from 'lucide-react';
import { useState } from 'react';

const BUILDS = [
  { value: 'blizz', label: 'Blizzard Sorceress', description: 'Cold · fast Hell cows', icon: <Snowflake className="text-dmg-cold" /> },
  { value: 'fire', label: 'Fire Ball Sorceress', description: 'Fire · needs -res', icon: <Flame className="text-dmg-fire" /> },
  { value: 'light', label: 'Lightning Sorceress', description: 'Lightning · Infinity', icon: <Zap className="text-dmg-lightning" /> },
  { value: 'smiter', label: 'Smiter', description: 'Ubers · Grief Phase Blade', icon: <Shield /> },
];

export const meta = {
  title: 'Rich rows and small size',
  description:
    '`SelectItem icon` (shown in the trigger once picked) and `description` (a muted second line, list only) for a few rich choices; `SelectTrigger size="sm"` for toolbars.',
  order: 1,
};

export default function RichRowsExample() {
  const [build, setBuild] = useState('blizz');
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <Select value={build}
        onValueChange={setBuild}>
        <SelectTrigger className="w-full"
          aria-label="Build">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUILDS.map((b) => (
            <SelectItem key={b.value}
              value={b.value}
              icon={b.icon}
              description={b.description}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select defaultValue="7d">
        <SelectTrigger size="sm"
          className="w-28"
          aria-label="Price window">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="24h">Last 24h</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
