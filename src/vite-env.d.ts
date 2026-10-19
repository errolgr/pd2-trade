/// <reference types="vite/client" />

declare global {
  interface Window {
    __TAURI__?: any;
  }

  interface ImportMetaEnv {
    /** Grafana Faro collector URL; Faro stays disabled when unset. */
    readonly VITE_FARO_URL?: string;
  }

  /** package.json version, injected by vite.config.ts. */
  const __APP_VERSION__: string;
  /** VITE_LEADERBOARD_LIVE === 'true' at build time, injected by vite.config.ts (src/lib/feature-flags.ts). */
  const __LEADERBOARD_LIVE__: boolean;
}

export {};
