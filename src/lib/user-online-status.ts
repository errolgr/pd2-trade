export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export const isUserOnlineIngame = (userLastIngame?: string): boolean => {
  if (!userLastIngame) return false;
  const ts = new Date(userLastIngame).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return false;
  return Date.now() - ts < ONLINE_THRESHOLD_MS;
};
