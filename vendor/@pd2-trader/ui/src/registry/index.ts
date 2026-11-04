/**
 * `@pd2-trader/ui/registry`: the component docs registry, the single source of truth for the Ladle catalog
 * (stories are generated from it, `scripts/build-registry.ts`) and the website's component docs. Separate entry
 * from the component barrel: importing it pulls in every example, so apps that only render components never do.
 */
import { d2Docs } from './d2';
import { genericDocs } from './generic';
import type { CategoryDoc, ComponentCategory, ComponentDoc } from './types';

export type * from './types';

/** Categories in display order. */
export const CATEGORIES: CategoryDoc[] = [
  { id: 'primitives', label: 'Primitives', description: 'Buttons, badges, text and the other building blocks.' },
  { id: 'forms', label: 'Forms', description: 'Inputs, pickers and the field layout around them.' },
  { id: 'overlay', label: 'Overlay', description: 'Dialogs, sheets, popovers, menus and tooltips.' },
  { id: 'navigation', label: 'Navigation', description: 'Tabs, breadcrumbs, pagination, menus and sidebars.' },
  { id: 'data', label: 'Data', description: 'Tables, charts and list items.' },
  { id: 'feedback', label: 'Feedback', description: 'Loading, empty, error and notice states, toasts.' },
  { id: 'layout', label: 'Layout', description: 'Panels, sections, disclosure and resizable splits.' },
  { id: 'd2', label: 'Diablo II', description: 'Items, runes, prices and other PD2 domain components.' },
  { id: 'slots', label: 'Plugin slots', description: 'The components plugins render inside host slots.' },
];

const CATEGORY_ORDER = new Map<ComponentCategory, number>(CATEGORIES.map((c, i) => [c.id, i]));

/** Every documented component, by category order then name. */
export const registry: ComponentDoc[] = [...genericDocs, ...d2Docs].sort(
  (a, b) => CATEGORY_ORDER.get(a.category)! - CATEGORY_ORDER.get(b.category)! || a.name.localeCompare(b.name),
);

export function getComponentDoc(slug: string): ComponentDoc | undefined {
  return registry.find((doc) => doc.slug === slug);
}
