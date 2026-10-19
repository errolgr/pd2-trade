/**
 * Build-time feature flags (set in the build env or a .env file, injected by vite.config.ts).
 *
 * LEADERBOARD_LIVE (`VITE_LEADERBOARD_LIVE=true`): wealth rank from `/api/networth/standing` on Stash Value and
 * the net worth ticker. Off until leaderboards launch with Season 14 (same flag name as the website).
 */
export const LEADERBOARD_LIVE: boolean = __LEADERBOARD_LIVE__;
