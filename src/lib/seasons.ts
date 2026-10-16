/**
 * PD2 season definitions with date ranges.
 * Dates sourced from https://wiki.projectdiablo2.com/wiki/Seasons
 *
 * Season ids are stable (`s13`, `s12`, ...). The settings value `'current'` means
 * "follow whatever season is current" and must be resolved with `resolveSeasonId`
 * before being sent to the net worth API. The bundled list is a fallback; the net worth
 * provider prefers the server list from `GET /api/seasons`.
 */

export interface Season {
  id: string;
  label: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string | null; // null = ongoing
}

/** Settings value meaning "follow the current season". Never sent to the net worth API. */
export const CURRENT_SEASON_SETTING = 'current';

export const SEASONS: Season[] = [
  { id: 's14', label: 'Alliance (S14)', startDate: '2026-10-23', endDate: null },
  { id: 's13', label: 'Betrayal (S13)', startDate: '2026-04-23', endDate: '2026-10-22' },
  { id: 's12', label: 'Suffering (S12)', startDate: '2025-10-25', endDate: '2026-04-22' },
];

/** Seasons that have started by `now` (announced future seasons are excluded). */
export function startedSeasons(seasons: Season[] = SEASONS, now: Date = new Date()): Season[] {
  const today = now.toISOString().slice(0, 10);
  return seasons.filter((s) => s.startDate <= today);
}

/** The current season: the most recently started one (by UTC date). */
export function getCurrentSeason(seasons: Season[] = SEASONS, now: Date = new Date()): Season | undefined {
  const started = startedSeasons(seasons, now);
  return [...(started.length ? started : seasons)].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

/** Resolves a settings value (`'current'`, a season id, or undefined) to a real season id. */
export function resolveSeasonId(selectedSeasonId?: string, seasons: Season[] = SEASONS): string | undefined {
  if (selectedSeasonId && selectedSeasonId !== CURRENT_SEASON_SETTING) {
    if (seasons.some((s) => s.id === selectedSeasonId)) return selectedSeasonId;
  }
  return getCurrentSeason(seasons)?.id;
}

export function getSeasonById(id: string, seasons: Season[] = SEASONS): Season | undefined {
  return seasons.find((s) => s.id === resolveSeasonId(id, seasons));
}

/** Options for the season selector: "current" (follows the live season) plus every past season. */
export function getSeasonSettingOptions(seasons: Season[] = SEASONS): { value: string; label: string }[] {
  const current = getCurrentSeason(seasons);
  return [
    { value: CURRENT_SEASON_SETTING, label: current ? `${current.label} (current)` : 'Current season' },
    ...startedSeasons(seasons)
      .filter((s) => s.id !== current?.id)
      .map((s) => ({ value: s.id, label: s.label })),
  ];
}

/**
 * Returns startDate/endDate config for price API calls based on the selected season.
 * For current season, returns { startDate } to constrain to season start.
 * Past seasons return explicit start/end dates.
 */
export function getSeasonDateConfig(selectedSeasonId?: string): { startDate?: string; endDate?: string } {
  const season = getSeasonById(selectedSeasonId || CURRENT_SEASON_SETTING);
  if (!season) return {};
  return {
    startDate: season.startDate,
    ...(season.endDate ? { endDate: season.endDate } : {}),
  };
}
