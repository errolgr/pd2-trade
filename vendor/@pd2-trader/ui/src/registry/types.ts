import type { ComponentType } from 'react';

/**
 * Docs registry types: the single source of truth for the Ladle catalog (stories are generated from the
 * examples) and the website's /components docs (`@pd2-trader/ui/registry`).
 */

export type ComponentCategory =
  | 'primitives'
  | 'forms'
  | 'overlay'
  | 'navigation'
  | 'data'
  | 'feedback'
  | 'layout'
  | 'd2'
  | 'slots';

export type ComponentStatus = 'stable' | 'beta';

export interface PropDoc {
  name: string;
  /** TypeScript type as written in the source (`'default' | 'outline'`, `ReactNode`). */
  type: string;
  /** Default value as code (`'default'`, `false`); omitted when there is none. */
  default?: string;
  required?: boolean;
  description: string;
}

/**
 * One runnable example: a real `.tsx` file under `src/examples/<slug>/<id>.tsx` (default export = the component,
 * `export const meta = { title, description, order? }`). `source` is the file's text without the `meta` block,
 * generated into `examples.generated.ts` by `scripts/build-registry.ts`.
 * Examples assume the host mounts `TooltipProvider`, `Toaster` and `UiLabelsProvider` (the catalog and the
 * website do); everything else they need they render themselves.
 */
export interface ExampleDoc {
  id: string;
  title: string;
  description: string;
  component: ComponentType;
  source: string;
}

/** The `meta` export of an example file. Lower `order` sorts first; ties sort by id. */
export interface ExampleMeta {
  title: string;
  description: string;
  order?: number;
}

export interface ComponentDoc {
  /** URL slug and `src/examples/<slug>` directory (kebab-case, unique). */
  slug: string;
  /** Display name ("Input group"). */
  name: string;
  category: ComponentCategory;
  /** One or two sentences: what the component is for (its job). */
  description: string;
  status: ComponentStatus;
  /** Main export name from `@pd2-trader/ui` (`InputGroup`). */
  importName: string;
  /** Props of the main export (the ones that matter; native element props pass through and are not listed). */
  props: PropDoc[];
  examples: ExampleDoc[];
  /** Keyboard and screen-reader behavior, overlay (non-focusable window) limits. */
  a11y?: string;
  /** Slugs of related entries. */
  related?: string[];
}

export interface CategoryDoc {
  id: ComponentCategory;
  label: string;
  description: string;
}
