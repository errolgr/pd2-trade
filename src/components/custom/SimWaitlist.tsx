import { useState } from 'react';
import { AlertTriangle, ExternalLink, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openUrl } from '@/lib/browser-opener';
import type { SimAccess } from '@/lib/sim-export-api';
import { trackMeasurement } from '@/lib/telemetry';
import { cn } from '@/lib/utils';

/** Popover wrapper for {@link SimWaitlist}: the banner is the whole popover. */
export const SIM_WAITLIST_POPOVER_CLASS = 'w-[420px] border-0 p-0';

/**
 * What every sim entry point (price check, market cards, Net Worth) shows a user outside Horadric Sim's closed beta:
 * the website's waitlist, as a sign-up or, once signed up, the user's place. `onOpen` runs after the link opens.
 */
export function SimWaitlist({
  access,
  onOpen,
  className,
}: {
  access: SimAccess;
  onOpen?: () => void;
  className?: string;
}) {
  const [openFailed, setOpenFailed] = useState(false);
  const openWaitlist = async () => {
    setOpenFailed(false);
    try {
      await openUrl(access.waitlistUrl);
      trackMeasurement(
        'sim_waitlist_handoff',
        {},
        {
          outcome: 'success',
          state: access.waitlistPosition === null ? 'new' : 'pending',
        },
      );
      onOpen?.();
    } catch {
      setOpenFailed(true);
      trackMeasurement(
        'sim_waitlist_handoff',
        {},
        {
          outcome: 'error',
          state: access.waitlistPosition === null ? 'new' : 'pending',
        },
      );
    }
  };
  const position = access.waitlistPosition;
  return (
    <div role="status"
      className={cn('flex gap-3 rounded-lg border border-info/30 bg-info/10 p-3 text-sm', className)}>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-info/15 text-info [&_svg]:size-4">
        <Hourglass />
      </span>
      <div className="min-w-0 space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Horadric Sim · Closed beta
        </div>
        <p>
          {position === null
            ? 'The Simulator is invite-only for now. Join the waitlist on pd2trader.com to get in.'
            : `You're #${position} on the waitlist. You'll be able to send items here once you're invited.`}
        </p>
        <Button
          size="sm"
          variant={position === null ? 'default' : 'outline'}
          className="mt-1"
          onClick={() => void openWaitlist()}
        >
          {position === null ? 'Join the waitlist' : 'View waitlist'}
          <ExternalLink className="size-3.5" />
        </Button>
        {openFailed && (
          <p role="alert"
            className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> Could not open the browser. Try again.
          </p>
        )}
      </div>
    </div>
  );
}
