import { Prose } from '@pd2-trader/ui';

export const meta = {
  title: 'Prose',
  description: 'Prose styles plain long-form markup (website articles, docs and guides) at the `text-base` article size: headings, paragraphs, lists, strong, links and inline code need no classes. `as="article"` for a page body.',
  order: 1,
};

export default function ProseExample() {
  return (
    <div className="rounded-lg border bg-surface p-6">
      <Prose as="article">
        <h2>Farming Hell cows</h2>
        <p>
          Cow runs are the fastest way to find high runes early in the ladder. Open the portal with <code>Wirt&apos;s Leg</code>{' '}
          and a Tome of Town Portal in the Horadric Cube.
        </p>
        <h3>What to bring</h3>
        <ul>
          <li>Area damage: Blizzard, Fist of the Heavens or Fury.</li>
          <li>A merc with Infinity for physical immune packs.</li>
        </ul>
        <ol>
          <li>Clear the portal area.</li>
          <li>Kill the Cow King last if you want to come back.</li>
        </ol>
        <p>
          Price your drops with the <a href="#price-check">price check</a> hotkey.
        </p>
      </Prose>
    </div>
  );
}
