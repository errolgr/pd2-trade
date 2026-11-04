import { ItemTooltip, type TooltipItem } from '@pd2-trader/ui';

export const meta = {
  title: 'Set item',
  description: "Tal Rasha's Adjudication with its set bonuses (active ones lit, inactive muted) and the worn pieces.",
  order: 3,
};

const AMULET: TooltipItem = {
  name: "Tal Rasha's Adjudication",
  base: 'Amulet',
  quality: 'Set',
  requirements: { level: 67 },
  mods: [
    { text: '+2 to Sorceress Skill Levels' },
    { text: '+50 to Life' },
    { text: '+42 to Mana' },
    { text: 'Lightning Resist +33%' },
    { text: 'Adds 3-32 Lightning Damage' },
  ],
  set: {
    name: "Tal Rasha's Wrappings",
    bonuses: [
      { items: 2, text: '+60 to Mana', active: true },
      { items: 3, text: '+10% to All Resistances', active: true },
      { items: 4, text: '+15% Faster Cast Rate', active: false },
      { items: 'full', text: '+3 to All Skills', active: false },
    ],
    pieces: [
      { name: "Tal Rasha's Adjudication", worn: true },
      { name: "Tal Rasha's Horadric Crest", worn: true },
      { name: "Tal Rasha's Guardianship", worn: true },
      { name: "Tal Rasha's Fine-Spun Cloth", worn: false },
      { name: "Tal Rasha's Lidless Eye", worn: false },
    ],
  },
};

export default function SetItemExample() {
  return <ItemTooltip item={AMULET} />;
}
