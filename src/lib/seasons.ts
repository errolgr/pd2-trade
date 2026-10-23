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
  startDate: string; // YYYY-MM-DD (UTC), the season's first day
  /** ISO launch instant when the season doesn't start at 00:00 UTC on startDate */
  startsAt?: string;
  endDate: string | null; // YYYY-MM-DD (UTC), last (possibly partial) day; null = ongoing
}

/** Settings value meaning "follow the current season". Never sent to the net worth API. */
export const CURRENT_SEASON_SETTING = 'current';

// Keep in sync with the server list (pd2-trader-server src/seasons/seasons.ts).
export const SEASONS: Season[] = [
  // PD2 launch: 2026-10-23 10:00 PDT.
  { id: 's14', label: 'Alliance (S14)', startDate: '2026-10-23', startsAt: '2026-10-23T17:00:00.000Z', endDate: null },
  { id: 's13', label: 'Betrayal (S13)', startDate: '2026-04-23', endDate: '2026-10-23' },
  { id: 's12', label: 'Suffering (S12)', startDate: '2025-10-25', endDate: '2026-04-22' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Season start instant (ms since epoch): `startsAt`, else 00:00 UTC on `startDate`. */
function seasonStartMs(season: Season): number {
  return Date.parse(season.startsAt ?? `${season.startDate}T00:00:00.000Z`);
}

/** Exclusive end instant (ms): the next season's start, else the day after `endDate`; null while running. */
function seasonEndMs(season: Season, seasons: Season[]): number | null {
  if (!season.endDate) return null;
  const start = seasonStartMs(season);
  const nextStarts = seasons.map(seasonStartMs).filter((ms) => ms > start);
  return nextStarts.length
    ? Math.min(...nextStarts)
    : Date.parse(`${season.endDate}T00:00:00.000Z`) + DAY_MS;
}

/** Seasons that have started by `now` (announced future seasons are excluded). */
export function startedSeasons(seasons: Season[] = SEASONS, now: Date = new Date()): Season[] {
  return seasons.filter((s) => seasonStartMs(s) <= now.getTime());
}

/** The current season: the most recently started one. */
export function getCurrentSeason(seasons: Season[] = SEASONS, now: Date = new Date()): Season | undefined {
  const started = startedSeasons(seasons, now);
  return [...(started.length ? started : seasons)].sort((a, b) => seasonStartMs(b) - seasonStartMs(a))[0];
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
 * Returns startDate/endDate (ISO instants) for price API calls based on the selected season.
 * The current season (including one with a known, future end date) returns { startDate } to constrain to
 * the season's launch. Ended seasons return their start and last instant (the next season's launch − 1 ms).
 */
export function getSeasonDateConfig(selectedSeasonId?: string): { startDate?: string; endDate?: string } {
  const season = getSeasonById(selectedSeasonId || CURRENT_SEASON_SETTING);
  if (!season) return {};
  const end = seasonEndMs(season, SEASONS);
  return {
    startDate: new Date(seasonStartMs(season)).toISOString(),
    ...(end !== null && end <= Date.now() ? { endDate: new Date(end - 1).toISOString() } : {}),
  };
}
