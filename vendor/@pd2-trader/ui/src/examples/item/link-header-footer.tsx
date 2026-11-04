import {
  Badge,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@pd2-trader/ui';
import { BookOpen, ChevronRight } from 'lucide-react';

export const meta = {
  title: 'Link, header and footer',
  description:
    '`asChild` renders a link with the row styles (hover fill, focus ring). `ItemHeader` and `ItemFooter` take a full line above and below the content.',
  order: 2,
};

export default function ItemLinkExample() {
  return (
    <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-4">
      <Item asChild
        variant="outline"
        size="sm">
        <a href="#guides">
          <ItemMedia variant="icon">
            <BookOpen />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Hell cows farming guide</ItemTitle>
          </ItemContent>
          <ItemActions>
            <ChevronRight className="size-4 text-muted-foreground" />
          </ItemActions>
        </a>
      </Item>
      <Item variant="outline">
        <ItemHeader>
          <span className="text-3xs font-medium tracking-caps text-muted-foreground uppercase">Season 12</span>
          <Badge variant="secondary">Ladder</Badge>
        </ItemHeader>
        <ItemContent>
          <ItemTitle>Blizzard Sorceress</ItemTitle>
          <ItemDescription>Cold mastery, Hell cows and Chaos runs. 6 items, 2 of them Uber-tier.</ItemDescription>
        </ItemContent>
        <ItemFooter>
          <span className="text-2xs text-muted-foreground">Updated 2h ago</span>
          <span className="text-2xs tabular-nums">14.5 HR</span>
        </ItemFooter>
      </Item>
    </div>
  );
}
