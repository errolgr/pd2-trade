import {
  Badge,
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
  RuneIcon,
} from '@pd2-trader/ui';
import { Fragment } from 'react';

const WATCHED = [
  { rune: 'Ber', note: 'Alert under 0.9 HR', hits: 3 },
  { rune: 'Jah', note: 'Alert under 1.1 HR', hits: 0 },
  { rune: 'Sur', note: 'Alert under 0.4 HR', hits: 1 },
];

export const meta = {
  title: 'Group',
  description:
    '`ItemGroup` makes a list (its Items become list items); `ItemSeparator` divides them. `size="sm"` and `ItemMedia variant="image"` for dense rows with art.',
  order: 1,
};

export default function ItemGroupExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-1">
      <ItemGroup>
        {WATCHED.map((watch, index) => (
          <Fragment key={watch.rune}>
            {index > 0 && <ItemSeparator />}
            <Item size="sm">
              <ItemMedia variant="image">
                <RuneIcon rune={watch.rune} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{watch.rune} Rune</ItemTitle>
                <ItemDescription>{watch.note}</ItemDescription>
              </ItemContent>
              {watch.hits > 0 && <Badge variant="count">{watch.hits}</Badge>}
            </Item>
          </Fragment>
        ))}
      </ItemGroup>
    </div>
  );
}
