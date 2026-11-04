import { SocketRow } from '@pd2-trader/ui';

export const meta = {
  title: 'Sockets',
  description: 'Runes in socket order with their art, gems and jewels as quality-colored stones, empty sockets; the row reads its contents to screen readers.',
  order: 1,
};

export default function SocketsExample() {
  return (
    <div className="flex w-sidebar flex-col gap-3 rounded-lg border bg-surface p-4">
      <SocketRow sockets={3}
        filled={[{ name: 'Jah Rune' }, { name: 'Ith Rune' }, { name: 'Ber Rune' }]} />
      <SocketRow sockets={4}
        filled={[{ name: 'Rainbow Facet', quality: 'Unique' }, { name: 'Perfect Amethyst' }]} />
      <SocketRow sockets={6}
        size={16} />
    </div>
  );
}
