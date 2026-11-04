import { ItemTooltip, type TooltipItem } from '@pd2-trader/ui';

export const meta = {
  title: 'Runeword',
  description: 'Enigma in an Archon Plate: rune order under the name, the base muted, sockets filled with the runes.',
  order: 2,
};

const ENIGMA: TooltipItem = {
  name: 'Enigma',
  base: 'Archon Plate',
  quality: 'Superior',
  runeword: true,
  runes: ['Jah', 'Ith', 'Ber'],
  defense: { value: 1037, enhanced: true },
  durability: [60, 60],
  requirements: { strength: 103, level: 65 },
  mods: [
    { text: '+2 to All Skills' },
    { text: '+45% Faster Run/Walk' },
    { text: '+1 to Teleport' },
    { text: '+762 Defense', range: [750, 775], value: 762 },
    { text: '+0.75 to Strength (Based on Character Level)' },
    { text: 'Increase Maximum Life 5%' },
    { text: 'Damage Reduced by 8%' },
    { text: '+14 Life after each Kill' },
    { text: '15% Damage Taken Goes To Mana' },
    { text: '+1% Better Chance of Getting Magic Items (Based on Character Level)' },
  ],
  sockets: 3,
  socketed: [{ name: 'Jah Rune' }, { name: 'Ith Rune' }, { name: 'Ber Rune' }],
};

export default function RunewordExample() {
  return <ItemTooltip item={ENIGMA} />;
}
