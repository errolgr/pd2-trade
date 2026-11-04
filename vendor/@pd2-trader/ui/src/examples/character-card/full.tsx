import { Star } from 'lucide-react';
import { Button, CharacterCard, classPortraitUrl } from '@pd2-trader/ui';

export const meta = {
  title: 'Full card',
  description: 'The header card of a character page: portrait, name in the D2 face, mode chips with season, guild and build tag, stats line, follow action, gear value and last seen.',
  order: 2,
};

export default function FullExample() {
  return (
    <div className="w-popover rounded-lg border bg-surface p-3">
      <CharacterCard
        variant="full"
        name="BlizzQueen"
        cls="Sorceress"
        level={94}
        ladder
        hardcore={false}
        season={12}
        guild="Horadrim Rune Society"
        build="Blizzard"
        portraitSrc={classPortraitUrl('sorceress', 'https://pd2trader.com')}
        stats="Life 2,140 · Mana 1,380 · Str 156 · Dex 80 · Vit 420 · Ene 35"
        value={{ amount: 18.4, unit: 'hr', label: 'Gear value' }}
        lastSeen="Updated 2h ago"
        actions={
          <Button size="xs"
            variant="outline">
            <Star /> Follow
          </Button>
        }
      />
    </div>
  );
}
