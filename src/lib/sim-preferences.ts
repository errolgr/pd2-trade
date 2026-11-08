export type SimGoal = 'quick_sim' | 'top_gear' | 'upgrade_finder' | 'stat_weights' | 'skill_charm_optimizer';

export const SIM_CHARACTER_STORAGE_KEY = 'pd2-sim-character';

export const SIM_GOALS: readonly { value: SimGoal; label: string; description: string }[] = [
  { value: 'quick_sim', label: 'Quick Sim', description: 'Try one build or item' },
  { value: 'top_gear', label: 'Top Gear', description: 'Find the best set from selected items' },
  { value: 'upgrade_finder', label: 'Upgrade Finder', description: 'Find the best single-slot upgrades' },
  { value: 'stat_weights', label: 'Stat Weights', description: 'Measure the value of each stat' },
  { value: 'skill_charm_optimizer', label: 'Skills & Charms', description: 'Optimize skill points and charms' },
];

/** Planner links from `POST /api/sim/exports` expire after this long. */
export const SIM_EXPORT_LINK_TTL_MS = 24 * 60 * 60 * 1000;

/** The last export sent to the planner (Settings `simLastExport`): what and when, never the items. */
export interface SimLastExport {
  character: string;
  goal: SimGoal;
  items: number;
  url: string;
  /** ISO */
  sentAt: string;
}

export function simGoalLabel(goal: SimGoal): string {
  return SIM_GOALS.find((g) => g.value === goal)?.label ?? goal;
}

export function legacySimCharacter(): string {
  try {
    return localStorage.getItem(SIM_CHARACTER_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberLegacySimCharacter(name: string): void {
  try {
    localStorage.setItem(SIM_CHARACTER_STORAGE_KEY, name);
  } catch {
    // settings.json remains the source of truth when localStorage is unavailable
  }
}
