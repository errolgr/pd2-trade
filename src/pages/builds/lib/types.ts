import type { BuildsFilters, BuildsMode } from '@/lib/builds-api';

export type BuildsTab = 'meta' | 'characters';

/** openPanel('builds', payload). */
export interface BuildsPanelPayload {
  /** Open this character's build (mode omitted: softcore first, then hardcore). */
  character?: { name: string; mode?: BuildsMode };
  /** Meta tab with these filters (merged over the defaults). */
  filters?: Partial<BuildsFilters>;
  tab?: BuildsTab;
}
