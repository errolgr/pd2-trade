import { EXAMPLES } from './examples.generated';
import type { ExampleDoc } from './types';

/** The examples under `src/examples/<slug>/`, in display order (empty when the directory does not exist). */
export function examplesFor(slug: string): ExampleDoc[] {
  return EXAMPLES[slug] ?? [];
}
