import { ResistanceBar, StatSheet, type StatSection } from '@pd2-trader/ui';

export const meta = {
  title: 'Visual rows',
  description: '`visual` puts a ResistanceBar in place of the label/value line; the cap state and the sources tooltip still render.',
  order: 2,
};

const SECTIONS: StatSection[] = [
  {
    id: 'resists',
    label: 'Resistances (Hell)',
    rows: [
      {
        id: 'fire',
        label: 'Fire',
        visual: <ResistanceBar element="fire"
          total={98} />,
        state: { text: '23 over cap', tone: 'good' },
        sources: [{ title: 'Fire resistance', sources: [{ kind: 'item', name: 'Mara\'s Kaleidoscope', value: '+25%' }] }],
      },
      { id: 'cold', label: 'Cold', visual: <ResistanceBar element="cold"
        total={61} />, state: { text: '14 below cap', tone: 'warn' } },
    ],
  },
];

export default function VisualRowsExample() {
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-2">
      <StatSheet sections={SECTIONS} />
    </div>
  );
}
