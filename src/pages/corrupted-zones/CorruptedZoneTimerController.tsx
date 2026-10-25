import React, { useEffect } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { useOverlay } from '@/overlay';

/** Shows the corrupted zone timer panel while it is turned on in Settings → Interface (renders nothing). */
const CorruptedZoneTimerController: React.FC = () => {
  const { settings } = useOptions();
  const { openPanel, closePanel } = useOverlay();
  const wanted = settings.corruptedZoneTimerEnabled === true;
  useEffect(() => {
    if (wanted) openPanel('corruptedZoneTimer');
    else closePanel('corruptedZoneTimer');
  }, [wanted, openPanel, closePanel]);
  return null;
};

export default CorruptedZoneTimerController;
