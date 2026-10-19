import { useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { check } from '@tauri-apps/plugin-updater';

const RECHECK_MS = 30 * 60 * 1000;

/**
 * Version of a newer release, or null. For overlay windows (price check) that live in their own
 * webview and can't see the main window's update state; checks on mount, then every 30 minutes.
 */
export function useAvailableUpdate(): string | null {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const update = await check();
        if (!cancelled) setVersion(update?.version ?? null);
      } catch (error) {
        // Offline / GitHub unreachable: keep the last known state
        console.warn('Update check failed:', error);
      }
    };

    refresh();
    const interval = setInterval(refresh, RECHECK_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return version;
}
