import { useEffect } from 'react';
import { listen } from '@/lib/browser-events';
import { holdListener } from '@/lib/listener';
import { showToast } from '@/overlay';
import { t } from '@/i18n';

export function GlobalErrorHandler() {
  useEffect(
    () =>
      // Rust-emitted errors (chat watcher etc.) -> overlay toast
      holdListener(
        listen<string>('error', (event) => {
          showToast({
            title: t('app:errorHandler.title'),
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
