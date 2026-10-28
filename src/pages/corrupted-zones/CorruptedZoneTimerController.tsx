import React, { useEffect } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { showToast, useOverlay } from '@/overlay';
import { corruptedZoneAt } from '@/lib/corrupted-zones';
import { currentLocale, t } from '@/i18n';

/** Past the slot boundary before reading the new zone, so a timer firing a hair early still sees it. */
const ROTATION_SLACK_MS = 500;

/**
 * Corrupted zone overlay behaviour (renders nothing): shows the timer panel while it is turned on in
 * Settings → Interface, and toasts each rotation (every zone, or only followed ones) while alerts are on.
 */
const CorruptedZoneTimerController: React.FC = () => {
  const { settings } = useOptions();
  const { openPanel, closePanel } = useOverlay();
  const wanted = settings.corruptedZoneTimerEnabled === true;
  useEffect(() => {
    if (wanted) openPanel('corruptedZoneTimer');
    else closePanel('corruptedZoneTimer');
  }, [wanted, openPanel, closePanel]);

  const alerts = settings.corruptedZoneAlerts ?? 'off';
  const toastsOn = settings.toastPopupsEnabled ?? true;
  const followed = settings.corruptedZoneFollowed;
  useEffect(() => {
    if (alerts === 'off' || !toastsOn) return;
    const follows = new Set(followed ?? []);
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          const slot = corruptedZoneAt(Date.now());
          if (alerts === 'all' || follows.has(slot.zone)) {
            const until = new Date(slot.end).toLocaleTimeString(currentLocale(), {
              hour: 'numeric',
              minute: '2-digit',
            });
            showToast({
              title: t('app:corruptedZones.toastTitle'),
              description: t('app:corruptedZones.toastDescription', { zone: slot.zone, until }),
              variant: 'corrupted-zone',
              duration: 10_000,
            });
          }
          schedule();
        },
        corruptedZoneAt(Date.now()).end - Date.now() + ROTATION_SLACK_MS,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [alerts, toastsOn, followed]);

  return null;
};

export default CorruptedZoneTimerController;
