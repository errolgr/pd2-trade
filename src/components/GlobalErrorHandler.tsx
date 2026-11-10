import { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { notify } from '@/overlay';
import { t } from '@/i18n';

export function GlobalErrorHandler() {
  useEffect(
    () =>
      // Rust-emitted errors (chat watcher etc.) -> overlay toast
      holdListener(
        listen<string>('error', (event) => {
          notify(
            'error',
            { title: t('app:errorHandler.title'), description: event.payload, variant: 'error' },
            { toast: true },
          );
        }),
        'error',
      ),
    [],
  );

  return null;
}
