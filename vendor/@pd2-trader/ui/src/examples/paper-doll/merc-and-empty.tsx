import { PaperDoll } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Mercenary, empty slots',
  description: '`variant="merc"` drops the rings and amulet; empty slots show their name and glyph.',
  order: 2,
};

export default function MercAndEmptyExample() {
  return (
    <div className="flex w-fit gap-6 rounded-lg border bg-surface p-3">
      <PaperDoll variant="merc"
        items={{
          helm: { name: "Andariel's Visage", quality: 'Unique', src: `${ART}/invhlmu.png` },
          weapon: { name: 'Insight', quality: 'Normal', runeword: true, src: `${ART}/invpik.png` },
          armor: { name: 'Fortitude', quality: 'Normal', runeword: true, src: `${ART}/invaaru.png` },
        }} />
      <PaperDoll items={{}} />
    </div>
  );
}
