import { useCallback, useState } from 'react';
import { showToast } from '@/overlay';
import { useTranslation } from '@/i18n';
import type { Listing } from '../../marketplace/api';
import { marketplace } from '../../PluginHostBridge';

export interface Installer {
  /** Listing id of the install/update in flight (one at a time). */
  pending: string | null;
  errors: Record<string, string>;
  install(listing: Pick<Listing, 'id' | 'name'>): Promise<void>;
  /** Update to the latest version (consent sheet first when it asks for more). Resolves whether it applied. */
  update(listing: Pick<Listing, 'id' | 'name'>): Promise<boolean>;
}

/** Verified install/update (hash + signature, then the consent sheet); errors kept per listing. */
export function useInstaller(): Installer {
  const { t } = useTranslation('plugins');
  const [pending, setPending] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const run = useCallback(
    async (id: string, action: () => Promise<boolean>, done: string, failed: string): Promise<boolean> => {
      setPending(id);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        const ok = await action();
        if (ok) showToast({ title: done, variant: 'success' });
        return ok;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setErrors((prev) => ({ ...prev, [id]: message }));
        showToast({ title: failed, description: message, variant: 'error' });
        return false;
      } finally {
        setPending(null);
      }
    },
    [],
  );

  const install = useCallback(
    async ({ id, name }: Pick<Listing, 'id' | 'name'>) => {
      await run(
        id,
        () => marketplace.install(id),
        t('marketplace.installedToast', { name }),
        t('marketplace.installFailed', { name }),
      );
    },
    [run, t],
  );
  const update = useCallback(
    ({ id, name }: Pick<Listing, 'id' | 'name'>) =>
      run(
        id,
        () => marketplace.update(id),
        t('marketplace.update.doneToast', { name }),
        t('marketplace.update.failed', { name }),
      ),
    [run, t],
  );
  return { pending, errors, install, update };
}
