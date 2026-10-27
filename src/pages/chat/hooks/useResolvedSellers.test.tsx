// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WhisperPerson } from '@/lib/whisper-history';
import type { SellerLookup } from '../lib/seller-lookup';
import {
  _resetResolvedSellers,
  LOOKUP_GAP_MS,
  MISS_TTL_MS,
  RETRY_DELAY_MS,
  STORAGE_KEY,
  useResolvedSellers,
} from './useResolvedSellers';

const lookup = vi.fn<(name: string, opts: { beforeRequest?: () => Promise<void> }) => Promise<SellerLookup>>();
vi.mock('../lib/seller-lookup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/seller-lookup')>()),
  lookupSellerByName: (name: string, opts: { beforeRequest?: () => Promise<void> }) => lookup(name, opts),
}));

const SC_LADDER = { hardcore: false, ladder: true };
const THAROK = { userId: 'u-tharok', username: 'tharok_web', accounts: ['Tharok'] };

const person = (key: string, over: Partial<WhisperPerson> = {}): WhisperPerson => ({
  key,
  playerName: key,
  messages: [],
  trades: [],
  readAt: 0,
  ...over,
});
const peopleOf = (...list: WhisperPerson[]) => Object.fromEntries(list.map((p) => [p.key, p]));

/** Lookups that pace like the real one, answering from `owners` (account → seller). */
function answerFrom(owners: Record<string, typeof THAROK>) {
  lookup.mockImplementation(async (name, { beforeRequest }) => {
    await beforeRequest?.();
    const seller = owners[name.toLowerCase()];
    return seller ? { status: 'found', seller } : { status: 'none' };
  });
}

const settle = (ms = 0) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

function render(people: Record<string, WhisperPerson>, options: { enabled?: boolean; priorityKey?: string } = {}) {
  return renderHook(
    (props: { people: Record<string, WhisperPerson>; priorityKey?: string }) =>
      useResolvedSellers(props.people, {
        enabled: options.enabled ?? true,
        mode: SC_LADDER,
        priorityKey: props.priorityKey,
      }),
    { initialProps: { people, priorityKey: options.priorityKey } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(Date.parse('2026-10-27T12:00:00Z'));
});
afterEach(() => {
  cleanup();
  _resetResolvedSellers();
  lookup.mockReset();
  vi.useRealTimers();
});

describe('useResolvedSellers', () => {
  it('resolves each account once, keyed by person, leaving out accounts nobody owns', async () => {
    answerFrom({ tharok: THAROK });
    const people = peopleOf(person('tharok', { accountName: 'tharok' }), person('quietvale'));
    const { result, rerender } = render(people);
    await settle(LOOKUP_GAP_MS);

    expect(result.current.get('tharok')).toEqual(THAROK);
    expect(result.current.has('quietvale')).toBe(false);

    rerender({ people: { ...people } });
    await settle(LOOKUP_GAP_MS);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('keeps the same map until a lookup settles or the people change', async () => {
    answerFrom({ tharok: THAROK });
    const people = peopleOf(person('tharok'));
    const { result, rerender } = render(people);
    await settle();
    const first = result.current;

    rerender({ people });
    expect(result.current).toBe(first);
  });

  it('spaces requests LOOKUP_GAP_MS apart', async () => {
    answerFrom({});
    render(peopleOf(person('a'), person('b'), person('c')));
    await settle();
    expect(lookup).toHaveBeenCalledTimes(2); // the second is waiting on its gap
    await settle(LOOKUP_GAP_MS);
    expect(lookup).toHaveBeenCalledTimes(3);
  });

  it('looks the open thread up first', async () => {
    answerFrom({});
    render(peopleOf(person('a'), person('b'), person('c')), { priorityKey: 'c' });
    await settle(3 * LOOKUP_GAP_MS);
    expect(lookup.mock.calls.map(([name]) => name)).toEqual(['c', 'a', 'b']);
  });

  it('retries a failed lookup after the wait, never remembering it as a miss', async () => {
    lookup.mockResolvedValueOnce({ status: 'failed' }).mockResolvedValueOnce({ status: 'found', seller: THAROK });
    const { result } = render(peopleOf(person('tharok')));
    await settle();
    expect(result.current.size).toBe(0);

    await settle(RETRY_DELAY_MS);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.current.get('tharok')).toEqual(THAROK);
  });

  it('waits the Retry-After the service named', async () => {
    lookup.mockResolvedValueOnce({ status: 'failed', retryAfterMs: 5000 }).mockResolvedValue({ status: 'none' });
    render(peopleOf(person('tharok')));
    await settle(4999);
    expect(lookup).toHaveBeenCalledTimes(1);
    await settle(1);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('looks nothing up while disabled (signed out)', async () => {
    answerFrom({ tharok: THAROK });
    render(peopleOf(person('tharok')), { enabled: false });
    await settle(LOOKUP_GAP_MS);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('keeps settled lookups for the next launch instead of asking again', async () => {
    answerFrom({ tharok: THAROK });
    const people = peopleOf(person('tharok'), person('quietvale'));
    render(people);
    await settle(LOOKUP_GAP_MS);
    expect(lookup).toHaveBeenCalledTimes(2);

    vi.resetModules();
    const fresh = await import('./useResolvedSellers');
    const { result } = renderHook(() => fresh.useResolvedSellers(people, { enabled: true, mode: SC_LADDER }));
    await settle(LOOKUP_GAP_MS);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(result.current.get('tharok')).toEqual(THAROK);
  });

  it('asks again about a stored miss once it is older than a day', async () => {
    answerFrom({});
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        quietvale: { seller: null, at: Date.now() - MISS_TTL_MS - 1 },
        frostwind: { seller: null, at: Date.now() },
      }),
    );
    vi.resetModules();
    const fresh = await import('./useResolvedSellers');
    renderHook(() =>
      fresh.useResolvedSellers(peopleOf(person('quietvale'), person('frostwind')), { enabled: true, mode: SC_LADDER }),
    );
    await settle(LOOKUP_GAP_MS);
    expect(lookup.mock.calls.map(([name]) => name)).toEqual(['quietvale']);
  });

  it('looks a legacy "character*account" sender up by the account', async () => {
    answerFrom({ tharok: THAROK });
    const { result } = render(peopleOf(person('frostwind*tharok')));
    await settle();

    expect(lookup.mock.calls[0][0]).toBe('tharok');
    expect(result.current.get('frostwind*tharok')).toEqual(THAROK);
  });
});
