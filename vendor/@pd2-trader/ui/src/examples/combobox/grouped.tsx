import { Combobox, type ComboboxOption } from '@pd2-trader/ui';
import { useState } from 'react';

const skill = (label: string, cls: string): ComboboxOption => ({ value: label, label, hint: cls, group: cls });
const SKILLS = [
  skill('Bash', 'Barbarian'),
  skill('Battle Command', 'Barbarian'),
  skill('Battle Orders', 'Barbarian'),
  skill('Whirlwind', 'Barbarian'),
  skill('Blade Fury', 'Assassin'),
  skill('Blade Sentinel', 'Assassin'),
  skill('Blizzard', 'Sorceress'),
  skill('Fire Ball', 'Sorceress'),
  skill('Frozen Orb', 'Sorceress'),
  skill('Blessed Hammer', 'Paladin'),
  skill('Fist of the Heavens', 'Paladin'),
];

export const meta = {
  title: 'Groups and flat search',
  description:
    'Options with a `group` show under headings. With `flatSearch` a typed query drops the headings and ranks across groups (the hint names the class); hint-only matches sit under "Other matches". `limit` caps the rows with a "keep typing" footer.',
  order: 1,
};

export default function ComboboxGroupedExample() {
  const [grouped, setGrouped] = useState<string | null>(null);
  const [flat, setFlat] = useState<string | null>('Frozen Orb');
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <Combobox aria-label="Skill"
        placeholder="Search skills…"
        options={SKILLS}
        value={grouped}
        onChange={setGrouped} />
      <Combobox aria-label="Skill (flat search)"
        options={SKILLS}
        value={flat}
        onChange={setFlat}
        flatSearch
        limit={6} />
    </div>
  );
}
