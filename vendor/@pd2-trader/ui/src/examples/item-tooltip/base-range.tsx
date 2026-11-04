import { ItemTooltip } from '@pd2-trader/ui';

export const meta = {
  title: 'Base defense range',
  description: 'Without enhanced defense only the base roll is known: `defense.max` renders the range ("Defense: 120–150").',
  order: 5,
};

export default function BaseRangeExample() {
  return <ItemTooltip item={{ name: 'Archon Plate', quality: 'Superior', defense: { value: 120, max: 150 } }} />;
}
