import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const slotsDocs: ComponentDoc[] = [
  {
    slug: 'slots',
    name: 'Slot components',
    category: 'slots',
    description:
      'The only building blocks a plugin renders into a host slot (the price-check popover and other extension points): SlotSection (titled card), SlotColumn, SlotRow (label/value), SlotText, SlotBadge, SlotList, SlotDivider and SlotAction (the one button). Props are plain data so the host can validate and serialise them; `tone` is one of `SLOT_TONES` (status + q-* quality colors) and unknown values fall back to `default` (`isSlotTone`, `slotToneClass`).',
    status: 'stable',
    importName: 'SlotSection',
    props: [
      { name: 'title', type: 'string', required: true, description: 'SlotSection heading (the plugin name or feature).' },
      { name: 'SlotRow label / value / tone', type: 'ReactNode / ReactNode / SlotTone', description: 'Label-value line; `tone` colors the value.' },
      { name: 'SlotText text / tone / size', type: "string / SlotTone / 'sm' | 'md'", default: "size 'md'", description: 'A line of body (`md`) or caption (`sm`) text.' },
      { name: 'SlotBadge text / tone', type: 'string / SlotTone', description: 'Short status pill ("Perfect roll").' },
      { name: 'SlotList items', type: 'ReactNode[]', description: 'Bulleted list of short items.' },
      { name: 'SlotAction label / onClick / disabled', type: 'string / () => void / boolean', description: 'The slot\'s single outline xs button.' },
      { name: 'tone', type: 'SlotTone', default: "'default'", description: "'default' | 'muted' | 'success' | 'warning' | 'danger' | 'q-unique' | 'q-set' | 'q-rare' | 'q-magic' | 'q-crafted' | 'q-rune'." },
    ],
    examples: examplesFor('slots'),
    a11y:
      'SlotSection is a `<section>` with a visible title; SlotList is a real list; SlotAction is a native button (click works without window focus). Tones are color only, so put the meaning in the text too.',
    related: ['panel-chrome'],
  },
];
