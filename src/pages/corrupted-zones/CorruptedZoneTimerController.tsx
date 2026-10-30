import React, { useEffect } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { showToast, useOverlay } from '@/overlay';
import { CORRUPTED_ZONE_SLOT_MS, MAX_ALERT_LEAD_MINUTES, corruptedZoneAt } from '@/lib/corrupted-zones';
import { currentLocale, t } from '@/i18n';

/** Past the moment to notify before reading the zone, so a timer firing a hair early still sees the right slot. */
const ROTATION_SLACK_MS = 500;

/**
 * Corrupted zone overlay behaviour (renders nothing): shows the timer panel while it is turned on in
 * Settings → Interface, and toasts each rotation (every zone, or only followed ones) while alerts are on: when the
 * zone starts, or `corruptedZoneAlertLeadMinutes` before.
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
  const leadMs =
    Math.min(Math.max(Math.round(settings.corruptedZoneAlertLeadMinutes ?? 0), 0), MAX_ALERT_LEAD_MINUTES) * 60_000;
  useEffect(() => {
    if (alerts === 'off' || !toastsOn) return;
    const follows = new Set(followed ?? []);
    const time = (ms: number) =>
      new Date(ms).toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' });
    let timer: number;
    const schedule = () => {
      // The next slot whose notify moment (its start minus the lead) is still ahead
      const now = Date.now();
      let slotStart = corruptedZoneAt(now).end;
      while (slotStart - leadMs + ROTATION_SLACK_MS <= now) slotStart += CORRUPTED_ZONE_SLOT_MS;
      timer = window.setTimeout(
        () => {
          const slot = corruptedZoneAt(slotStart);
          if (alerts === 'all' || follows.has(slot.zone)) {
            showToast({
              title: t('app:corruptedZones.toastTitle'),
              description:
                leadMs > 0
                  ? t('app:corruptedZones.toastSoonDescription', {
                      zone: slot.zone,
                      minutes: leadMs / 60_000,
                      from: time(slot.start),
                      until: time(slot.end),
                    })
                  : t('app:corruptedZones.toastDescription', { zone: slot.zone, until: time(slot.end) }),
              variant: 'corrupted-zone',
              duration: 10_000,
            });
          }
          schedule();
        },
        slotStart - leadMs + ROTATION_SLACK_MS - now,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [alerts, toastsOn, followed, leadMs]);

  return null;
};

export default CorruptedZoneTimerController;
