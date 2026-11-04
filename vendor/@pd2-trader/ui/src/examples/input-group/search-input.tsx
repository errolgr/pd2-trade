import { SearchInput } from '@pd2-trader/ui';
import { useState } from 'react';

export const meta = {
  title: 'Search input',
  description:
    '`SearchInput`: the search box built on InputGroup. With `onClear` a clear (×) button shows while it has text; `size="sm"` for toolbars, `size="lg"` for a landing page\'s main search. Every other prop (and `ref`) goes to the input.',
  order: 1,
};

export default function SearchInputExample() {
  const [query, setQuery] = useState('shako');
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <SearchInput aria-label="Search items"
        placeholder="Shako, Enigma, Ber…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onClear={() => setQuery('')} />
      <SearchInput size="sm"
        aria-label="Filter listings"
        placeholder="Filter listings…"
        onClear={() => undefined} />
      <SearchInput aria-label="Disabled search"
        placeholder="Disabled"
        disabled />
      <SearchInput size="lg"
        aria-label="Character name"
        placeholder="Character name or planner link" />
    </div>
  );
}
