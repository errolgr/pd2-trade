import { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { showToast } from '@/overlay';

export function GlobalErrorHandler() {
  useEffect(
    () =>
      // Rust-emitted errors (chat watcher etc.) -> overlay toast
      holdListener(
        listen<string>('error', (event) => {
          showToast({
            title: 'Error',
            description: event.payload,
            variant: 'error',
          });
        }),
        'error',
      ),
    [],
  );

  return null;
}
