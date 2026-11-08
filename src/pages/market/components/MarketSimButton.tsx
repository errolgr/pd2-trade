import { useState } from 'react';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { SimCharacterPicker } from '@/components/custom/SimCharacterPicker';
import { SIM_WAITLIST_POPOVER_CLASS, SimWaitlist } from '@/components/custom/SimWaitlist';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useOptions } from '@/hooks/useOptions';
import { useSimLadderCharacters } from '@/hooks/useSimLadderCharacters';
import { openUrl } from '@/lib/browser-opener';
import { simListingPlanUrl } from '@/lib/sim-try-on';
import { preferredSimCharacter } from '@/lib/sim-characters';
import { legacySimCharacter, rememberLegacySimCharacter } from '@/lib/sim-preferences';
import type { SimAccess } from '@/lib/sim-export-api';
import { trackMeasurement } from '@/lib/telemetry';

const SIM_BUTTON_CLASS =
  'h-7 border border-primary/70 bg-primary/10 px-2.5 text-xs text-primary hover:bg-primary/20 hover:text-primary';

/** A market card's “Sim”: opens the listing on the user's selected character. */
export function MarketSimButton({ access, listingId }: { access: SimAccess; listingId: string }) {
  const { settings, updateSettings } = useOptions();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(settings.simCharacter || legacySimCharacter());
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<unknown>();
  const token = settings.pd2Token ?? '';
  const characters = useSimLadderCharacters(access.canUse && open ? token : '', settings.account ?? '');
  const list = characters.status === 'ok' ? characters.data : [];
  const character = preferredSimCharacter(list, picked);

  const launch = async (name: string) => {
    setOpening(true);
    setError(undefined);
    const started = performance.now();
    try {
      await openUrl(simListingPlanUrl(listingId, name, settings.simGoal));
      trackMeasurement(
        'sim_handoff',
        { duration_ms: performance.now() - started },
        {
          outcome: 'success',
          source: 'market',
          goal: settings.simGoal ?? 'quick_sim',
        },
      );
      setOpen(false);
    } catch (cause) {
      setError(cause);
      trackMeasurement(
        'sim_handoff',
        { duration_ms: performance.now() - started },
        {
          outcome: 'error',
          source: 'market',
          goal: settings.simGoal ?? 'quick_sim',
        },
      );
    } finally {
      setOpening(false);
    }
  };

  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={SIM_BUTTON_CLASS}
      aria-label="Try in the sim planner"
      title="Try in the sim planner"
    >
      <FlaskConical className="size-3.5" />
      Sim
    </Button>
  );

  if (!access.canUse) {
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

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent side="top"
        align="end"
        className="w-80 space-y-3 p-3">
        <div>
          <p className="text-sm font-semibold">Try listing on character</p>
          <p className="text-xs text-muted-foreground">The planner imports this character before adding the listing.</p>
        </div>
        {characters.status === 'loading' && <Skeleton className="h-9 w-full" />}
        {characters.status === 'error' && (
          <p role="alert"
            className="text-xs text-destructive">
            Could not load characters.
          </p>
        )}
        {characters.status === 'ok' && character && (
          <SimCharacterPicker
            characters={list}
            value={character}
            onChange={(name) => {
              setPicked(name);
              rememberLegacySimCharacter(name);
              updateSettings({ simCharacter: name });
            }}
          />
        )}
        {characters.status === 'ok' && !character && (
          <p className="text-xs text-muted-foreground">No ladder characters found. Choose an account in Settings.</p>
        )}
        {error && (
          <p role="alert"
            className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="size-3.5" /> Could not open the browser. Try again.
          </p>
        )}
        <Button size="sm"
          disabled={!character || opening}
          onClick={() => void launch(character)}>
          {opening ? 'Opening…' : 'Open planner'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
