import { Card, CardDescription, CardHeader, CardTitle } from '@pd2-trader/ui';

export const meta = {
  title: 'Link tile',
  description: '`asChild` makes the child link the card: a whole-tile link with hover and focus styles (guides index, tool grid). Pass a router `Link` in apps.',
  order: 2,
};

export default function CardLinkTileExample() {
  return (
    <div className="grid w-full max-w-xl grid-cols-2 gap-3">
      <Card asChild>
        <a href="#guides/hell-cows">
          <CardHeader>
            <CardTitle>Farming Hell cows</CardTitle>
            <CardDescription>Fastest early-ladder high rune route.</CardDescription>
          </CardHeader>
        </a>
      </Card>
      <Card asChild>
        <a href="#market/ber">
          <CardHeader>
            <CardTitle>Ber rune prices</CardTitle>
            <CardDescription>7-day median and recent trades.</CardDescription>
          </CardHeader>
        </a>
      </Card>
    </div>
  );
}
