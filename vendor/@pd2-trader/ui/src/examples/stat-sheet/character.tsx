import { StatSheet, type StatSection } from '@pd2-trader/ui';

export const meta = {
  title: 'Character sheet',
  description: 'Resists with cap states, damage in its element color with sub-rows, breakpoint chips (current and next marked), and a stat whose sources show on hover or focus.',
  order: 1,
};

const SECTIONS: StatSection[] = [
  {
    id: 'resists',
    label: 'Resistances (Hell)',
    rows: [
      { id: 'fire', label: 'Fire', value: { text: '75%', tone: 'fire' }, state: { text: '23 over cap', tone: 'good' } },
      { id: 'cold', label: 'Cold', value: { text: '75%', tone: 'cold' }, state: { text: 'capped', tone: 'good' } },
      { id: 'light', label: 'Lightning', value: { text: '61%', tone: 'lightning' }, state: { text: '14 below cap', tone: 'warn' } },
      { id: 'poison', label: 'Poison', value: { text: '-14%', tone: 'poison' }, state: { text: '89 below cap', tone: 'bad' } },
    ],
  },
  {
    id: 'speed',
    label: 'Breakpoints',
    rows: [
      {
        id: 'fcr',
        label: 'Faster Cast Rate',
        abbr: 'FCR',
        value: { text: '105%' },
        note: '8 frames',
        ladder: [
          { at: 63, state: 'past' },
          { at: 105, state: 'current' },
          { at: 200, state: 'next' },
        ],
        sources: [
          {
            title: 'Faster Cast Rate',
            sources: [
              { kind: 'Item', name: 'Spirit', value: '+35%' },
              { kind: 'Item', name: 'Arachnid Mesh', value: '+20%' },
              { kind: 'Item', name: 'Mara\'s Kaleidoscope', value: '+20%' },
              { kind: 'Item', name: 'Magefist', value: '+20%' },
              { kind: 'Corruption', name: 'Harlequin Crest', value: '+10%' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'damage',
    label: 'Damage',
    rows: [
      {
        id: 'blizzard',
        label: 'Blizzard',
        value: { text: '2,410 avg', tone: 'cold' },
        parts: [
          { label: 'Min', text: '1,960', tone: 'cold' },
          { label: 'Max', text: '2,860', tone: 'cold' },
        ],
      },
    ],
  },
];

export default function CharacterExample() {
  return <StatSheet sections={SECTIONS}
    className="w-sidebar" />;
}
