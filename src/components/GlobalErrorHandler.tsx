import { useEffect } from 'react';
import { listen, emit } from '@tauri-apps/api/event';

export function GlobalErrorHandler() {
    useEffect(() => {
        const unlistenPromise = listen<string>('error', (event) => {
            // Re-emit as a toast event for the Toast window to handle
            emit('toast-event', {
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
