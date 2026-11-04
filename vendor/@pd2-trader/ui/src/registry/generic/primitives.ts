import { examplesFor } from '../examples';
import type { ComponentDoc } from '../types';

export const primitivesDocs: ComponentDoc[] = [
  {
    slug: 'button',
    name: 'Button',
    category: 'primitives',
    description:
      'Every clickable action: main and secondary actions, icon buttons, list rows, picker triggers and inline text actions. Pick the variant by job, never restyle.',
    status: 'stable',
    importName: 'Button',
    props: [
      {
        name: 'variant',
        type: "'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'quiet' | 'field'",
        default: "'default'",
        description:
          '`default` = the one main action; `ghost` for icon and row buttons; `quiet` for inline text actions; `field` for picker triggers.',
      },
      {
        name: 'size',
        type: "'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-xs' | 'icon-2xs' | 'row' | 'inline'",
        default: "'default'",
        description:
          '`icon*` are square (chrome bar: `icon-sm`); `row` is a full-width list row; `inline` sits in running text.',
      },
      {
        name: 'asChild',
        type: 'boolean',
        default: 'false',
        description: 'Render the child element (a router `Link`, an `<a>`) with the button styles (Radix Slot).',
      },
    ],
    examples: examplesFor('button'),
    a11y:
      'Native `<button>`: Enter/Space activate. Icon-only buttons need an `aria-label`. Rows mark selection with `aria-selected`, `aria-current` or `data-active`. Focus ring via `focus-visible`.',
    related: ['button-group', 'toggle'],
  },
];
