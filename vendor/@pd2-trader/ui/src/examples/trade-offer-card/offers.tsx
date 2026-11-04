import { Button, TradeOfferCard } from '@pd2-trader/ui';

const ART = 'https://pd2trader.com/assets/items';

export const meta = {
  title: 'Offers',
  description: 'A received offer below the asking price with accept / counter / decline, a countered offer you sent in runes, and a declined one.',
  order: 1,
};

export default function OffersExample() {
  return (
    <div className="flex w-popover flex-col gap-2 rounded-lg border bg-surface p-3">
      <TradeOfferCard
        item={{ name: 'Harlequin Crest', quality: 'Unique', src: `${ART}/invcapu.png` }}
        direction="received"
        counterparty="BlizzQueen"
        offer={{ amount: 1.3, unit: 'hr' }}
        asking={{ amount: 1.6, unit: 'hr' }}
        status="pending"
        age="5m ago"
        message="Can do Ist + Lo, online now in Hell Baal games."
        actions={
          <>
            <Button size="xs"
              variant="ghost">Decline</Button>
            <Button size="xs"
              variant="outline">Counter</Button>
            <Button size="xs">Accept</Button>
          </>
        }
      />
      <TradeOfferCard
        item={{ name: 'Enigma', quality: 'Superior', runeword: true, src: `${ART}/invaaru.png` }}
        direction="sent"
        counterparty="RuneMule"
        offer={{ amount: 5, unit: 'rune', rune: 'Ber' }}
        status="countered"
        age="1h ago"
      />
      <TradeOfferCard
        item={{ name: 'Grim Shell', quality: 'Rare' }}
        direction="sent"
        counterparty="Hammerfall"
        offer="Ohm + Vex"
        status="declined"
        age="1d ago"
      />
    </div>
  );
}
