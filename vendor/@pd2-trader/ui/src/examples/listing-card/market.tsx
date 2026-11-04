import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button, ListingCard } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Market listings',
  description: 'Listing cards in a results grid: price or offer text, age, mod preview with roll marks, corrupted / ethereal / socket flags, seller presence and mode; one selected.',
  order: 1,
};

export default function MarketExample() {
  const [selected, setSelected] = useState('shako');
  return (
    <div className="grid w-full max-w-viewport grid-cols-2 gap-2 rounded-lg border bg-surface p-3">
      <ListingCard
        item={{ name: 'Harlequin Crest', quality: 'Unique', base: 'Shako', src: `${ART}/invcapu.png`, corrupted: true, sockets: 1 }}
        price={{ amount: 1.6, unit: 'hr' }}
        age="12m"
        seller={{ name: 'Sorc_Errol', presence: 'online' }}
        ladder
        hardcore={false}
        corruption="+1 Socket"
        mods={[
          { text: '+2 to All Skills' },
          { text: 'Damage Reduced by 10%', range: [7, 10], value: 10 },
          { text: '50% Better Chance of Getting Magic Items' },
          { text: '+2 to All Attributes' },
        ]}
        actions={<Button size="icon-xs"
          variant="ghost"
          aria-label="Message seller"><MessageSquare /></Button>}
        selected={selected === 'shako'}
        onClick={() => setSelected('shako')}
      />
      <ListingCard
        item={{ name: "Reaper's Toll", quality: 'Unique', base: 'Thresher', ethereal: true, sockets: 4 }}
        priceText="Offer"
        age="3h"
        seller={{ name: 'MercGearDepot', presence: 'away' }}
        ladder={false}
        hardcore
        mods={[
          { text: '+213% Enhanced Weapon Damage', range: [190, 240], value: 213 },
          { text: '11% Life Stolen per Hit', range: [11, 15], value: 11 },
        ]}
        selected={selected === 'toll'}
        onClick={() => setSelected('toll')}
      />
    </div>
  );
}
