import { Code, Heading, Muted, Text } from '@pd2-trader/ui';

export const meta = {
  title: 'Headings and text',
  description: 'Heading levels 1-4 (use `as` when the outline differs from the visual size), Text sizes and tones, Muted captions and inline Code.',
  order: 0,
};

export default function TypographyScaleExample() {
  return (
    <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-4">
      <Heading level={1}>Market</Heading>
      <Heading level={2}>Runes</Heading>
      <Heading level={3}
        as="h2">
        Ber rune
      </Heading>
      <Heading level={4}>Recent trades</Heading>
      <Text size="base">Ber is the most traded high rune this ladder.</Text>
      <Text size="sm">Median price over the last 7 days: 1.2 HR.</Text>
      <Text>
        Type <Code>/trade ber</Code> in the overlay search to jump here.
      </Text>
      <Text tone="muted">Prices exclude listings older than 14 days.</Text>
      <Muted>Updated 3 min ago</Muted>
    </div>
  );
}
