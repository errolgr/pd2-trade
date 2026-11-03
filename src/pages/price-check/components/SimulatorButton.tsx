import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FlaskConical, Loader2, LogIn, PackageCheck, PackageX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { useOptions } from '@/hooks/useOptions';
import { useSimAccess } from '@/hooks/useSimAccess';
import { openUrl } from '@/lib/browser-opener';
import { isStashItem } from '@/lib/item-utils';
import {
  createSimExport,
  describeSimExportError,
  getMyCharacters,
  isSessionError,
  isSimCandidate,
  orderedAccounts,
  SimExportApiError,
  type SimCharacters,
} from '@/lib/sim-export-api';
import { matchStashItem } from '@/lib/sim-item-match';
import { trackMeasurement } from '@/lib/telemetry';
import { cn } from '@/lib/utils';
import { useOverlay } from '@/overlay';
import { Banner } from '@/pages/currency/components/StatePanel';
import type { Item as PriceCheckItem } from '../lib/interfaces';

type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: unknown };
/** The price-checked item in the stash: only stash items can be sent (the export needs PD2's copy of it). */
type StashMatch = Load<GameStashItem | null> | { status: 'not-in-stash' };
type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'sent' } | { status: 'error'; error: unknown };
type Mode = 'try' | 'pool';

/** The character last sent from the price check (character names are unique on PD2 across accounts). */
export const SIM_CHARACTER_STORAGE_KEY = 'pd2-sim-character';
/** Set once the user dismissed the "try this item on" callout or opened the Simulator: it shows only before that. */
export const SIM_CALLOUT_STORAGE_KEY = 'pd2-sim-callout-seen';

const MODES: { value: Mode; title: string; description: string }[] = [
  { value: 'try', title: 'Try it on', description: 'Swaps it into its slot and compares against your current gear' },
  { value: 'pool', title: 'Add to Top Gear pool', description: 'Candidate only; the optimizer decides where it goes' },
];

function savedCharacter(): string {
  try {
    return localStorage.getItem(SIM_CHARACTER_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function calloutSeen(): boolean {
  try {
    return localStorage.getItem(SIM_CALLOUT_STORAGE_KEY) === '1';
  } catch {
    return true;
  }
}

/**
 * "Sim" in the price check's action row (Horadric Sim beta users only): sends the checked stash item with
 * one of the user's characters to the planner, tried on in its slot or as a Top Gear candidate.
 */
export function SimulatorButton({ item }: { item: PriceCheckItem }) {
  const access = useSimAccess();
  const { settings } = useOptions();
  const [open, setOpen] = useState(false);
  const [callout, setCallout] = useState(() => !calloutSeen());
  if (access !== true) return null;
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
        <PopoverContent side="top"
          align="start"
          className="w-[420px] space-y-3 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Send to Simulator
          </div>
          {token ? (
            <SimulatorForm token={token}
              account={settings?.account ?? ''}
              item={item} />
          ) : (
            <SignInBanner>Sign in to send items to the planner.</SignInBanner>
          )}
        </PopoverContent>
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

function SimulatorForm({ token, account, item }: { token: string; account: string; item: PriceCheckItem }) {
  const { fetchAndCacheStash } = usePd2Website();
  const [characters, setCharacters] = useState<Load<SimCharacters>>({ status: 'loading' });
  const [character, setCharacter] = useState(savedCharacter);
  const [found, setFound] = useState<Load<GameStashItem | null>>({ status: 'loading' });
  const inStash = isStashItem(item);
  const match: StashMatch = inStash ? found : { status: 'not-in-stash' };
  const [mode, setMode] = useState<Mode>('try');
  const [send, setSend] = useState<SendState>({ status: 'idle' });

  useEffect(() => {
    let live = true;
    setCharacters({ status: 'loading' });
    getMyCharacters(token).then(
      (data) => {
        if (!live) return;
        setCharacters({ status: 'ok', data });
        // The last used character when it still exists, else the selected account's first.
        const names = orderedAccounts(data, account).flatMap((a) => a.characters);
        setCharacter((current) => (names.includes(current) ? current : (names[0] ?? '')));
      },
      (error) => live && setCharacters({ status: 'error', error }),
    );
    return () => {
      live = false;
    };
  }, [token, account]);

  // The provider's fetch changes identity with every settings update; only the item refetches.
  const fetchStashRef = useRef(fetchAndCacheStash);
  useEffect(() => {
    fetchStashRef.current = fetchAndCacheStash;
  });
  useEffect(() => {
    if (!inStash) return;
    let live = true;
    setFound({ status: 'loading' });
    fetchStashRef.current().then(
      (data) =>
        live && setFound({ status: 'ok', data: matchStashItem(item, (data.items ?? []).filter(isSimCandidate)) }),
      (error) => live && setFound({ status: 'error', error }),
    );
    return () => {
      live = false;
    };
  }, [item, inStash]);

  const chooseCharacter = (name: string) => {
    setCharacter(name);
    try {
      localStorage.setItem(SIM_CHARACTER_STORAGE_KEY, name);
    } catch {
      // localStorage unavailable: the choice lasts until the popover closes.
    }
  };

  const stashItem = match.status === 'ok' ? match.data : null;
  const openPlanner = async () => {
    if (!stashItem || !character) return;
    const started = performance.now();
    setSend({ status: 'sending' });
    try {
      const { url } = await createSimExport(token, character, [stashItem], mode === 'try' ? { try: 0 } : {});
      trackMeasurement(
        'sim_export',
        { duration_ms: performance.now() - started, stash_items: 1 },
        { outcome: 'success', source: 'price_check', mode },
      );
      setSend({ status: 'sent' });
      await openUrl(url).catch((error) => console.warn('[SimExport] Could not open the browser:', error));
    } catch (error) {
      trackMeasurement(
        'sim_export',
        { duration_ms: performance.now() - started, stash_items: 1 },
        {
          outcome: 'error',
          source: 'price_check',
          mode,
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
            <Select value={character}
              onValueChange={chooseCharacter}>
              <SelectTrigger className="w-full"
                aria-label="Character">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderedAccounts(characters.data, account).map((a) => (
                  <SelectGroup key={a.account}>
                    <SelectLabel>{a.account}</SelectLabel>
                    {a.characters.map((name) => (
                      <SelectItem key={`${a.account}/${name}`}
                        value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">No characters found on your PD2 accounts.</p>
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

      <StashStatus match={match} />

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

      <div className="flex items-center justify-between gap-2">
        <span role="status"
          className="text-xs text-muted-foreground">
          {send.status === 'sent' && 'The planner opened in your browser.'}
        </span>
        <Button
          size="sm"
          className="cursor-pointer"
          disabled={!stashItem || !character || send.status === 'sending'}
          onClick={() => void openPlanner()}
        >
          {send.status === 'sending' && <Loader2 className="animate-spin" />}
          Open planner ↗
        </Button>
      </div>
    </>
  );
}

function StashStatus({ match }: { match: StashMatch }) {
  if (match.status === 'loading') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Looking for this item in your stash…
      </p>
    );
  }
  if (match.status === 'error') {
    return isSessionError(match.error) ? (
      <SignInBanner tone="destructive">{describeSimExportError(match.error)}</SignInBanner>
    ) : (
      <p role="alert"
        className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertTriangle className="size-3.5 shrink-0" />
        {describeSimExportError(match.error)}
      </p>
    );
  }
  const found = match.status === 'ok' && match.data !== null;
  return (
    <p className={cn('flex items-center gap-1.5 text-xs', found ? 'text-success' : 'text-muted-foreground')}>
      {found ? <PackageCheck className="size-3.5 shrink-0" /> : <PackageX className="size-3.5 shrink-0" />}
      {match.status === 'not-in-stash'
        ? 'Only items in your stash can be sent'
        : found
          ? 'Found in your stash'
          : "Couldn't find this item in your stash — reload the stash in Net Worth"}
    </p>
  );
}
