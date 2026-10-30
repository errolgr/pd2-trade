import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  FlaskConical,
  LogIn,
  PackageOpen,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { openUrl } from '@/lib/browser-opener';
import {
  createSimExport,
  describeSimExportError,
  getMyCharacters,
  isSessionError,
  isSimCandidate,
  MAX_SIM_EXPORT_ITEMS,
  SimExportApiError,
  type SimCharacters,
} from '@/lib/sim-export-api';
import { trackMeasurement } from '@/lib/telemetry';
import { cn } from '@/lib/utils';
import { useOverlay } from '@/overlay';
import { qualityColor } from '@/pages/price-check/lib/qualityColor';
import { Banner, EmptyState } from './StatePanel';

type Load<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; error: unknown };
type SendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; url: string }
  | { status: 'error'; error: unknown };

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';

/**
 * "Send to Simulator": the signed-in user's character plus checked stash items go to Horadric Sim
 * (`POST /api/sim/exports`), and the returned planner link opens in the browser.
 */
export function SimExportTab({ token, account }: { token: string; account: string }) {
  const { fetchAndCacheStash } = usePd2Website();
  const { openPanel } = useOverlay();
  const [characters, setCharacters] = useState<Load<SimCharacters>>({ status: 'loading' });
  const [charactersVersion, setCharactersVersion] = useState(0);
  const [stash, setStash] = useState<Load<GameStashItem[]>>({ status: 'loading' });
  const [stashVersion, setStashVersion] = useState(0);
  const [character, setCharacter] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [send, setSend] = useState<SendState>({ status: 'idle' });

  useEffect(() => {
    let live = true;
    setCharacters({ status: 'loading' });
    getMyCharacters(token).then(
      (data) => {
        if (!live) return;
        setCharacters({ status: 'ok', data });
        // The selected account's characters come first; keep a choice that still exists.
        const names = orderedAccounts(data, account).flatMap((a) => a.characters);
        setCharacter((current) => (names.includes(current) ? current : (names[0] ?? '')));
      },
      (error) => live && setCharacters({ status: 'error', error }),
    );
    return () => {
      live = false;
    };
  }, [token, account, charactersVersion]);

  // The provider's fetch changes identity with every settings update; only account and retries refetch.
  const fetchStashRef = useRef(fetchAndCacheStash);
  useEffect(() => {
    fetchStashRef.current = fetchAndCacheStash;
  });
  useEffect(() => {
    let live = true;
    setStash({ status: 'loading' });
    fetchStashRef.current().then(
      (data) => live && setStash({ status: 'ok', data: data.items.filter(isSimCandidate) }),
      (error) => live && setStash({ status: 'error', error }),
    );
    return () => {
      live = false;
    };
  }, [account, stashVersion]);

  const items = useMemo(() => (stash.status === 'ok' ? stash.data : []), [stash]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.name} ${item.base?.name ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);
  const chosen = useMemo(() => items.filter((item) => selected.has(item.hash)), [items, selected]);
  const full = chosen.length >= MAX_SIM_EXPORT_ITEMS;

  const toggle = (hash: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(hash);
      else next.delete(hash);
      return next;
    });

  const sendExport = async () => {
    const started = performance.now();
    setSend({ status: 'sending' });
    try {
      const { url } = await createSimExport(token, character, chosen);
      trackMeasurement(
        'sim_export',
        { duration_ms: performance.now() - started, stash_items: chosen.length },
        { outcome: 'success' },
      );
      setSend({ status: 'sent', url });
      await openUrl(url).catch((error) => console.warn('[SimExport] Could not open the browser:', error));
    } catch (error) {
      trackMeasurement(
        'sim_export',
        { duration_ms: performance.now() - started, stash_items: chosen.length },
        { outcome: 'error', status: error instanceof SimExportApiError ? error.status : undefined },
      );
      setSend({ status: 'error', error });
    }
  };

  const signIn = (
    <Button size="sm"
      variant="outline"
      onClick={() => openPanel('signIn')}>
      <LogIn className="size-3.5" />
      Sign in
    </Button>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Send a character and stash items to the Horadric Sim planner on pd2trader.com. The planner imports the
        character&apos;s gear, charms and merc from PD2 and adds the checked items as Top Gear candidates. The link
        works for 24 hours while you&apos;re signed in.
      </p>

      <section className="space-y-2">
        <span className={sectionLabel}>Character</span>
        {characters.status === 'loading' && <Skeleton className="h-9 w-64" />}
        {characters.status === 'error' && (
          <Banner
            tone="destructive"
            role="alert"
            icon={<AlertTriangle />}
            actions={
              isSessionError(characters.error) ? (
                signIn
              ) : (
                <Button size="sm"
                  variant="outline"
                  onClick={() => setCharactersVersion((v) => v + 1)}>
                  <RefreshCw className="size-3.5" />
                  Retry
                </Button>
              )
            }
          >
            <span className="text-destructive">{describeSimExportError(characters.error)}</span>
          </Banner>
        )}
        {characters.status === 'ok' &&
          (character ? (
            <Select value={character}
              onValueChange={setCharacter}>
              <SelectTrigger className="w-64"
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
            <EmptyState compact
              icon={<UserRound />}
              title="No characters found on your PD2 accounts." />
          ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={sectionLabel}>
            Stash items{' '}
            <span className="font-normal normal-case tracking-normal tabular-nums">
              ({chosen.length}/{MAX_SIM_EXPORT_ITEMS} checked)
            </span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={stash.status === 'loading'}
            onClick={() => setStashVersion((v) => v + 1)}
          >
            <RefreshCw className={cn('size-3.5', stash.status === 'loading' && 'animate-spin')} />
            Reload stash
          </Button>
        </div>
        {stash.status === 'error' && (
          <Banner
            tone="warning"
            role="alert"
            icon={<AlertTriangle />}
            actions={isSessionError(stash.error) ? signIn : undefined}
          >
            {describeSimExportError(stash.error)} You can still send the character alone.
          </Banner>
        )}
        {stash.status === 'loading' && (
          <div className="space-y-2"
            aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i}
                className="h-8 w-full" />
            ))}
          </div>
        )}
        {stash.status === 'ok' &&
          (items.length === 0 ? (
            <EmptyState compact
              icon={<PackageOpen />}
              title="No gear in your stash." />
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by name or base"
                  aria-label="Filter stash items"
                  className="h-8 pl-8"
                />
              </div>
              <ul className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
                {visible.map((item) => {
                  const checked = selected.has(item.hash);
                  return (
                    <li key={item.hash}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                        <Checkbox
                          checked={checked}
                          disabled={!checked && full}
                          onCheckedChange={(value) => toggle(item.hash, value === true)}
                        />
                        <span className={cn('min-w-0 truncate font-medium', qualityColor(item.quality?.name ?? ''))}>
                          {item.name}
                        </span>
                        {item.base?.name && item.base.name !== item.name && (
                          <span className="min-w-0 truncate text-xs text-muted-foreground">{item.base.name}</span>
                        )}
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {[item.is_ethereal && 'Eth', item.corrupted && 'Corrupted', item.location?.storage]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {full && (
                <p className="text-xs text-muted-foreground">At most {MAX_SIM_EXPORT_ITEMS} items per export.</p>
              )}
            </>
          ))}
      </section>

      {send.status === 'error' && (
        <Banner
          tone="destructive"
          role="alert"
          icon={<AlertTriangle />}
          actions={isSessionError(send.error) ? signIn : undefined}
        >
          <span className="text-destructive">{describeSimExportError(send.error)}</span>
        </Banner>
      )}
      {send.status === 'sent' && (
        <Banner
          tone="info"
          role="status"
          icon={<FlaskConical />}
          actions={
            <Button size="sm"
              variant="outline"
              onClick={() => void openUrl(send.url)}>
              <ExternalLink className="size-3.5" />
              Open planner
            </Button>
          }
        >
          Sent. The planner opened in your browser.
        </Banner>
      )}

      <Button disabled={!character || send.status === 'sending'}
        onClick={() => void sendExport()}>
        <Send className="size-3.5" />
        {send.status === 'sending'
          ? 'Sending…'
          : chosen.length > 0
            ? `Send to Simulator (${chosen.length} item${chosen.length === 1 ? '' : 's'})`
            : 'Send to Simulator'}
      </Button>
    </div>
  );
}

/** The selected account first, then the others as PD2 lists them. */
function orderedAccounts(data: SimCharacters, account: string): SimCharacters['accounts'] {
  const key = account.toLowerCase();
  return [...data.accounts].sort(
    (a, b) => Number(b.account.toLowerCase() === key) - Number(a.account.toLowerCase() === key),
  );
}
