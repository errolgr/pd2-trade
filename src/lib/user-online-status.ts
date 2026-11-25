export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/** Seen less than ONLINE_THRESHOLD_MS before `now` (default: the current time). */
export const isUserOnlineIngame = (userLastIngame?: string, now: number = Date.now()): boolean => {
  if (!userLastIngame) return false;
  const ts = new Date(userLastIngame).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return now - ts < ONLINE_THRESHOLD_MS;
};
