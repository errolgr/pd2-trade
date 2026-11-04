import { MercenaryCard, PriceTag } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Act 2 hireling',
  description: 'A Holy Freeze Desert Mercenary with its gear; header only when `items` is omitted.',
  order: 1,
};

export default function Act2Example() {
  return (
    <div className="flex w-fit flex-col gap-3 rounded-lg border bg-surface p-3">
      <MercenaryCard
        type="Desert Mercenary"
        name="Fiona"
        level={92}
        act={2}
        skill="Holy Freeze"
        aside={<PriceTag amount={3.4}
          unit="hr"
          className="text-xs font-semibold text-q-gold" />}
        items={{
          helm: { name: "Andariel's Visage", quality: 'Unique', src: `${ART}/invhlmu.png`, corrupted: true },
          weapon: { name: 'Infinity', quality: 'Normal', runeword: true, src: `${ART}/invpik.png` },
          armor: { name: 'Fortitude', quality: 'Normal', runeword: true, src: `${ART}/invaaru.png` },
        }}
      />
      <MercenaryCard type="Barbarian"
        level={74}
        act={5}
        skill="Bash" />
    </div>
  );
}
