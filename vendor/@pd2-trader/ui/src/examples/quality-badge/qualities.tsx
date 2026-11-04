import { QUALITY_KEYS, QualityBadge } from '@pd2-trader/ui';

export const meta = {
  title: 'Qualities',
  description: 'One chip per quality; any API spelling works (`Unique`, `unique`, `Superior` → normal). `children` replaces the name.',
  order: 1,
};

export default function QualitiesExample() {
  return (
    <div className="flex w-popover flex-wrap gap-1.5 rounded-lg border bg-surface p-4">
      {QUALITY_KEYS.map((q) => (
        <QualityBadge key={q}
          quality={q} />
      ))}
      <QualityBadge quality="Superior" />
      <QualityBadge quality="Unique">Elite unique</QualityBadge>
    </div>
  );
}
