/**
 * PD2 season definitions with date ranges.
 * Dates sourced from https://wiki.projectdiablo2.com/wiki/Seasons
 * Season 12+ dates are estimated based on the ~5-6 month cadence.
 */

export interface Season {
  id: string;
  label: string;
  startDate: string | null; // ISO date string (YYYY-MM-DD)
  endDate: string | null; // null = ongoing
}

export const SEASONS: Season[] = [
  { id: 'current', label: 'Betrayal (S13)', startDate: '2026-04-23', endDate: null },
  { id: 's12', label: 'Suffering (S12)', startDate: '2025-10-25', endDate: '2026-04-22' },
];

export function getSeasonById(id: string): Season | undefined {
  return SEASONS.find((s) => s.id === id);
}

/**
 * Returns startDate/endDate config for price API calls based on the selected season.
 * Returns an empty object for 'current' so the caller uses its default rolling 7-day window.
 * Past seasons return explicit start/end dates.
 */
export function getSeasonDateConfig(selectedSeasonId?: string): { startDate?: string; endDate?: string } {
  const id = selectedSeasonId || 'current';
  const season = getSeasonById(id);
  if (!season) return {};
  return {
    ...(season.startDate ? { startDate: season.startDate } : {}),
    ...(season.endDate ? { endDate: season.endDate } : {}),
  };
}
