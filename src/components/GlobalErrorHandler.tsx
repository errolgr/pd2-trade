import { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { showToast } from '@/overlay';

export function GlobalErrorHandler() {
  useEffect(() => {
    // Rust-emitted errors (chat watcher etc.) -> overlay toast
    const unlistenPromise = listen<string>('error', (event) => {
      showToast({
        title: 'Error',
        description: event.payload,
        variant: 'error',
      });
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return null;
}
