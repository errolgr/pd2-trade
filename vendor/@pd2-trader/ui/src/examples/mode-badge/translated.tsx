import { D2LabelsProvider, ModeBadge } from '@pd2-trader/ui';

export const meta = {
  title: 'Translated labels',
  description:
    'Game strings of every D2 component come from `D2LabelsProvider` (English defaults); the app maps them to its i18n, here German.',
  order: 2,
};

export default function TranslatedExample() {
  return (
    <D2LabelsProvider
      labels={{ ladder: 'Ladder', nonLadder: 'Nicht-Ladder', softcore: 'Softcore', hardcore: 'Hardcore', dead: 'Tot', season: (s) => `Saison ${s}` }}
    >
      <div className="flex w-popover flex-col gap-2 rounded-lg border bg-surface p-4">
        <ModeBadge ladder={false}
          hardcore
          dead />
        <ModeBadge ladder
          hardcore={false}
          season={12} />
      </div>
    </D2LabelsProvider>
  );
}
