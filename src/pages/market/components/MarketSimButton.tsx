import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@pd2-trader/ui';
import { SIM_WAITLIST_POPOVER_CLASS, SimWaitlist } from '@/components/custom/SimWaitlist';
import { openUrl } from '@/lib/browser-opener';
import { BACKEND_URL } from '@/lib/pkce';
import type { SimAccess } from '@/lib/sim-export-api';

const SIM_BUTTON_CLASS =
  'h-7 border border-primary/70 bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/20 hover:text-primary';

/**
 * A market card's "Sim": opens the listing in the planner for beta users; anyone outside the closed beta gets the
 * waitlist instead.
 */
export function MarketSimButton({ access, listingId }: { access: SimAccess; listingId: string }) {
  const [open, setOpen] = useState(false);
  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={SIM_BUTTON_CLASS}
      aria-label="Try in the sim planner"
      title="Try in the sim planner"
      onClick={
        access.canUse
          ? () => void openUrl(`${BACKEND_URL}/sim/plan?listing=${encodeURIComponent(listingId)}`)
          : undefined
      }
    >
      <FlaskConical className="size-3.5" />
      Sim
    </Button>
  );
  if (access.canUse) return button;

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent side="top"
        align="end"
        className={SIM_WAITLIST_POPOVER_CLASS}>
        <SimWaitlist access={access}
          onOpen={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
