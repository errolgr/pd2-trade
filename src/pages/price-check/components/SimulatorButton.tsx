import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ClipboardCheck, FlaskConical, Loader2, LogIn, PackageCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimCharacterPicker } from '@/components/custom/SimCharacterPicker';
import { SIM_WAITLIST_POPOVER_CLASS, SimWaitlist } from '@/components/custom/SimWaitlist';
import { Skeleton } from '@/components/ui/skeleton';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { useSimLadderCharacters } from '@/hooks/useSimLadderCharacters';
import { openUrl } from '@/lib/browser-opener';
import { preferredSimCharacter } from '@/lib/sim-characters';
import {
  createSimExport,
  describeSimExportError,
  isSessionError,
  SimExportApiError,
  type SimExportItems,
} from '@/lib/sim-export-api';
import {
  legacySimCharacter,
  rememberLegacySimCharacter,
  SIM_CHARACTER_STORAGE_KEY,
  type SimGoal,
  type SimLastExport,
} from '@/lib/sim-preferences';
import { findSimItem, type FoundSimItem, type SimItemSource } from '@/lib/sim-item-sources';
import { trackMeasurement } from '@/lib/telemetry';
import { cn } from '@/lib/utils';
import { useOverlay } from '@/overlay';
import { Banner } from '@/pages/currency/components/StatePanel';
import type { Item as PriceCheckItem } from '../lib/interfaces';

type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: unknown };
/** PD2's copy of the price-checked item, or null when PD2 has none (the clipboard's is sent then). */
type ItemMatch = Load<FoundSimItem | null>;
type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'error'; error: unknown };
type Mode = 'try' | 'pool';

/** The character last sent from the price check (character names are unique on PD2 across accounts). */
export { SIM_CHARACTER_STORAGE_KEY } from '@/lib/sim-preferences';
/** Set once the user dismissed the "try this item on" callout or opened the Simulator: it shows only before that. */
export const SIM_CALLOUT_STORAGE_KEY = 'pd2-sim-callout-seen';

const MODES: { value: Mode; title: string; description: string }[] = [
  { value: 'try', title: 'Try it on', description: 'Swaps it into its slot and compares against your current gear' },
  { value: 'pool', title: 'Add to Top Gear pool', description: 'Candidate only; the optimizer decides where it goes' },
];

function calloutSeen(): boolean {
  try {
    return localStorage.getItem(SIM_CALLOUT_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

/**
 * "Sim" in the price check's action row, shown while Horadric Sim is on: for beta users (allowlisted, or open beta)
 * it sends the checked item with one of the user's characters to the planner, tried on in its slot or as a Top Gear
 * candidate. PD2's copy of the item (stash or a character) is sent when PD2 has one, else the item as copied (just
 * picked up, not saved yet). Everyone else gets the closed-beta waitlist on the website.
 */
export function SimulatorButton({ item }: { item: PriceCheckItem }) {
  const access = useSimAccess();
  const { settings, updateSettings } = useOptions();
  const [open, setOpen] = useState(false);
  const [callout, setCallout] = useState(() => !calloutSeen());
  if (!access) return null;
  const token = settings?.pd2Token || null;

  const dismissCallout = () => {
    setCallout(false);
    try {
      localStorage.setItem(SIM_CALLOUT_STORAGE_KEY, '1');
    } catch {
      // storage unavailable: it shows again next launch
    }
  };

  return (
    <div className="relative">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) dismissCallout();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="cursor-pointer border border-primary/70 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
          >
            <FlaskConical />
            Sim
            <span className="rounded-full bg-primary/20 px-1.5 py-px text-[10px] font-bold tracking-wider">BETA</span>
          </Button>
        </PopoverTrigger>
        {!access.canUse ? (
          <PopoverContent side="top"
            align="start"
            className={SIM_WAITLIST_POPOVER_CLASS}>
            <SimWaitlist access={access}
              onOpen={() => setOpen(false)} />
          </PopoverContent>
        ) : (
          <PopoverContent side="top"
            align="start"
            className="w-[420px] space-y-3 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Send to Simulator
            </div>
            {token ? (
              <SimulatorForm
                token={token}
                account={settings?.account ?? ''}
                item={item}
                savedCharacter={settings.simCharacter || legacySimCharacter()}
                defaultGoal={settings.simGoal}
                onCharacterChange={(name) => updateSettings({ simCharacter: name })}
                onSent={(simLastExport) => {
                  setOpen(false);
                  updateSettings({ simLastExport });
                }}
              />
            ) : (
              <SignInBanner>Sign in to send items to the planner.</SignInBanner>
            )}
          </PopoverContent>
        )}
      </Popover>
      {callout && !open && (
        <div
          role="note"
          className="absolute right-0 top-full z-20 mt-2.5 w-80 rounded-lg border border-primary bg-popover p-3 shadow-panel"
        >
          <span
            aria-hidden
            className="absolute -top-[7px] right-6 size-3 rotate-45 border-l border-t border-primary bg-popover"
          />
          <div className="flex items-start gap-2">
            <span className="mt-0.5 rounded-full bg-primary px-1.5 py-px text-[10px] font-bold tracking-wider text-primary-foreground">
              NEW
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Try this item on your character</p>
              <p className="text-xs text-muted-foreground">See what it does to your build in the planner</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismissCallout}
              className="cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignInBanner({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'destructive' }) {
  const { openPanel } = useOverlay();
  return (
    <Banner
      tone={tone}
      role={tone === 'destructive' ? 'alert' : 'status'}
      icon={tone === 'destructive' ? <AlertTriangle /> : <LogIn />}
      actions={
        <Button size="sm"
          variant="outline"
          onClick={() => openPanel('signIn')}>
          <LogIn className="size-3.5" />
          Sign in
        </Button>
      }
    >
      <span className={cn(tone === 'destructive' && 'text-destructive')}>{children}</span>
    </Banner>
  );
}

function SimulatorForm({
  token,
  account,
  item,
  onSent,
  savedCharacter,
  defaultGoal,
  onCharacterChange,
}: {
  token: string;
  account: string;
  item: PriceCheckItem;
  /** The planner link is ready: the popover closes as the browser opens it, and the export is remembered. */
  onSent: (sent: SimLastExport) => void;
  savedCharacter: string;
  defaultGoal?: SimGoal;
  onCharacterChange: (name: string) => void;
}) {
  const { fetchAndCacheStash } = usePd2Website();
  const characters = useSimLadderCharacters(token, account);
  const [chosen, setChosen] = useState(savedCharacter);
  const [match, setMatch] = useState<ItemMatch>({ status: 'loading' });
  const [mode, setMode] = useState<Mode>(defaultGoal === 'top_gear' ? 'pool' : 'try');
  const [send, setSend] = useState<SendState>({ status: 'idle' });

  const list = characters.status === 'ok' ? characters.data : [];
  const character = preferredSimCharacter(list, chosen);
  // Searched once per item and character list; the chosen character, read when the search starts, goes first
  const names = list.map((c) => c.name).join('\n');
  const characterRef = useRef(character);
  // The provider's fetch changes identity with every settings update; only the item refetches.
  const fetchStashRef = useRef(fetchAndCacheStash);
  useEffect(() => {
    characterRef.current = character;
    fetchStashRef.current = fetchAndCacheStash;
  });
  const charactersReady = characters.status !== 'loading';
  useEffect(() => {
    if (!charactersReady) return;
    let live = true;
    setMatch({ status: 'loading' });
    const first = characterRef.current;
    const order = [first, ...names.split('\n').filter((name) => name && name !== first)].filter(Boolean);
    findSimItem(item, { stash: () => fetchStashRef.current(), characters: order }).then(
      (data) => live && setMatch({ status: 'ok', data }),
      (error) => live && setMatch({ status: 'error', error }),
    );
    return () => {
      live = false;
    };
  }, [item, names, charactersReady]);

  const chooseCharacter = (name: string) => {
    setChosen(name);
    rememberLegacySimCharacter(name);
    onCharacterChange(name);
  };

  const found = match.status === 'ok' ? match.data : null;
  // PD2's copy when it has one; else the item as copied, which the server converts
  const itemSource = found?.source ?? 'clipboard';
  const openPlanner = async () => {
    if (match.status === 'loading' || !character) return;
    const tried = mode === 'try';
    const items: SimExportItems = found
      ? { stashItems: [found.item], ...(tried && { try: { stash: 0 } }) }
      : { clipboardItems: [item], ...(tried && { try: { clipboard: 0 } }) };
    const started = performance.now();
    setSend({ status: 'sending' });
    try {
      const goal: SimGoal = mode === 'try' ? 'quick_sim' : 'top_gear';
      const { url } = await createSimExport(token, character, items, goal);
      await openUrl(url);
      trackMeasurement(
        'sim_export',
        { duration_ms: performance.now() - started, stash_items: 1 },
        { outcome: 'success', source: 'price_check', mode, item_source: itemSource },
      );
      onSent({ character, goal, items: 1, url, sentAt: new Date().toISOString() });
    } catch (error) {
      trackMeasurement(
        'sim_export',
        { duration_ms: performance.now() - started, stash_items: 1 },
        {
          outcome: 'error',
          source: 'price_check',
          mode,
          item_source: itemSource,
          status: error instanceof SimExportApiError ? error.status : undefined,
        },
      );
      setSend({ status: 'error', error });
    }
  };

  return (
    <>
      <section className="space-y-1.5">
        <span className="text-xs text-muted-foreground">Character</span>
        {characters.status === 'loading' && <Skeleton className="h-9 w-full" />}
        {characters.status === 'error' &&
          (isSessionError(characters.error) ? (
            <SignInBanner tone="destructive">{describeSimExportError(characters.error)}</SignInBanner>
          ) : (
            <p role="alert"
              className="text-xs text-destructive">
              {describeSimExportError(characters.error)}
            </p>
          ))}
        {characters.status === 'ok' &&
          (character ? (
            <SimCharacterPicker characters={list}
              value={character}
              onChange={chooseCharacter} />
          ) : (
            <p className="text-xs text-muted-foreground">No ladder characters found on your PD2 accounts.</p>
          ))}
      </section>

      <div role="radiogroup"
        aria-label="How to send it"
        className="grid gap-1.5">
        {MODES.map((option) => {
          const checked = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setMode(option.value)}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors',
                checked ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-muted/40',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                  checked ? 'border-primary' : 'border-muted-foreground/60',
                )}
              >
                {checked && <span className="size-1.5 rounded-full bg-primary" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <ItemStatus match={match} />

      {send.status === 'error' &&
        (isSessionError(send.error) ? (
          <SignInBanner tone="destructive">{describeSimExportError(send.error)}</SignInBanner>
        ) : (
          <Banner tone="destructive"
            role="alert"
            icon={<AlertTriangle />}>
            <span className="text-destructive">{describeSimExportError(send.error)}</span>
          </Banner>
        ))}

      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={match.status === 'loading' || !character || send.status === 'sending'}
          onClick={() => void openPlanner()}
        >
          {send.status === 'sending' && <Loader2 className="animate-spin" />}
          Open planner ↗
        </Button>
      </div>
    </>
  );
}

const SOURCE_TEXT: Record<SimItemSource, (holder: string) => string> = {
  stash: (holder) => (holder ? `Found in ${holder}'s personal stash` : 'Found in your stash'),
  inventory: (holder) => `Found in ${holder}'s inventory`,
  cube: (holder) => `Found in ${holder}'s cube`,
  equipped: (holder) => `Found on ${holder} (equipped)`,
  mercenary: (holder) => `Found on ${holder}'s mercenary`,
};

function ItemStatus({ match }: { match: ItemMatch }) {
  if (match.status === 'loading') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Looking for this item in your stash and on your characters…
      </p>
    );
  }
  if (match.status === 'error') {
    return (
      <div className="space-y-1">
        {isSessionError(match.error) ? (
          <SignInBanner tone="destructive">{describeSimExportError(match.error)}</SignInBanner>
        ) : (
          <p role="alert"
            className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            {describeSimExportError(match.error)}
          </p>
        )}
        <AsCopied />
      </div>
    );
  }
  const found = match.data;
  if (!found) return <AsCopied />;
  return (
    <p className="flex items-center gap-1.5 text-xs text-success">
      <PackageCheck className="size-3.5 shrink-0" />
      {SOURCE_TEXT[found.source](found.holder ?? '')}
    </p>
  );
}

/** PD2 has no copy of the item: the export takes the clipboard's. */
function AsCopied() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <ClipboardCheck className="size-3.5 shrink-0" />
      PD2 hasn&apos;t saved this item yet, so it&apos;s sent as you copied it
    </p>
  );
}
