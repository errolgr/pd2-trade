// @vitest-environment happy-dom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { fetch } from '@/lib/browser-http';
import { reportApiError } from '@/lib/error-reporting';
import { PALETTE_DEBOUNCE_MS, type PaletteRunContext, type PaletteSourceInput } from '../lib/types';
import { matchLocal, resetBuildsSource, useBuildsSource } from './builds';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function pause(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

const SUGGEST = {
  characters: [
    { name: 'NovaQueen', account: 'Bob', className: 'Sorceress', level: 95, isHardcore: false, matchedOn: 'name' },
    { name: 'Novadin', account: null, className: 'Paladin', level: 97, isHardcore: true, matchedOn: 'name' },
  ],
  accounts: [{ account: 'NovaAcc', characters: 4 }],
};

let settings: Partial<ISettings>;
let suggest: () => Promise<Response>;
let accountDetails: unknown[];

const input = (over: Partial<PaletteSourceInput> = {}): PaletteSourceInput => ({
  query: '',
  scope: null,
  limit: 20,
  refs: [],
  ...over,
});

const ctx = (): PaletteRunContext => ({ openPanel: vi.fn(), close: vi.fn(), scope: vi.fn() });

const suggestCalls = () =>
  vi.mocked(fetch).mock.calls.filter(([url]) => new URL(String(url)).pathname === '/api/builds/suggest');

afterEach(cleanup);

beforeEach(() => {
  resetBuildsSource();
  vi.mocked(fetch).mockReset();
  vi.mocked(reportApiError).mockReset();
  settings = { followedBuildCharacters: [] };
  suggest = async () => json(SUGGEST);
  accountDetails = [];
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings: vi.fn() }) as never);
  vi.mocked(fetch).mockImplementation(async (url) => {
    const { pathname } = new URL(String(url));
    if (pathname === '/api/builds/suggest') return suggest();
    if (pathname.startsWith('/game/account/')) return json({ details: accountDetails });
    return json({}, 404);
  });
});

describe('matchLocal', () => {
  it('matches class and skill nicknames exactly, with the nickname as badge', () => {
    expect(matchLocal('sorc')[0]).toMatchObject({ exact: true, badge: 'sorc', entry: { kind: 'class', value: 'Sorceress' } });
    expect(matchLocal('ZON')[0]).toMatchObject({ exact: true, entry: { kind: 'class', value: 'Amazon' } });
    expect(matchLocal('trapsin')[0]).toMatchObject({
      exact: true,
      badge: 'trapsin',
      entry: { kind: 'skill', value: 'Lightning Sentry', className: 'Assassin' },
    });
    expect(matchLocal('javazon')[0]).toMatchObject({ exact: true, entry: { value: 'Lightning Fury' } });
  });

  it("uses PD2's skill names and drops placeholder skills", () => {
    expect(matchLocal('berserker')[0]).toMatchObject({ exact: true, entry: { kind: 'skill', className: 'Barbarian' } });
    expect(matchLocal('werewolf')[0]).toMatchObject({ exact: true, entry: { value: 'Werewolf', className: 'Druid' } });
    expect(matchLocal('wearwolf')).toEqual([]);
    expect(matchLocal('amatemp')).toEqual([]);
  });

  it('ranks name prefixes over word prefixes and nickname prefixes', () => {
    const values = matchLocal('ham').map((m) => m.entry.value);
    expect(values[0]).toBe('Blessed Hammer');
    expect(matchLocal('ham').find((m) => m.entry.value === 'Blessed Hammer')).toMatchObject({ exact: false });
    expect(matchLocal('fist').map((m) => m.entry.value)).toEqual(['Fist of the Heavens', 'Fists of Fire']);
  });
});

describe('useBuildsSource', () => {
  it('shows the Blessed Hammer meta row at once for "hammerdin"', () => {
    const { result } = renderHook(() => useBuildsSource(input({ query: 'hammerdin' })));

    const [first] = result.current.items;
    expect(first).toMatchObject({ ref: { id: 'builds:skill:Blessed Hammer' }, badge: 'hammerdin', subtitle: 'Paladin skill' });
    const run = ctx();
    void first.primary.run(run);
    expect(run.openPanel).toHaveBeenCalledWith('builds', {
      tab: 'meta',
      filters: { classes: ['Paladin'], skills: ['Blessed Hammer:20'] },
    });
  });

  it('orders exact local matches, characters, accounts, then partial local matches', async () => {
    const { result } = renderHook(() => useBuildsSource(input({ query: 'nova' })));
    expect(result.current.items.map((i) => i.ref.id)).toEqual([
      'builds:skill:Nova',
      'builds:skill:Frost Nova',
      'builds:skill:Holy Nova',
      'builds:skill:Poison Nova',
    ]);

    await waitFor(() => expect(result.current.items).toHaveLength(7));
    expect(result.current.loading).toBe(false);
    expect(result.current.items.map((i) => i.ref.id)).toEqual([
      'builds:skill:Nova',
      'builds:character:softcore:novaqueen',
      'builds:character:hardcore:novadin',
      'builds:account:novaacc',
      'builds:skill:Frost Nova',
      'builds:skill:Holy Nova',
      'builds:skill:Poison Nova',
    ]);
    expect(new URL(String(suggestCalls()[0][0])).searchParams.get('q')).toBe('nova');

    const character = result.current.items[2];
    const run = ctx();
    void character.primary.run(run);
    expect(run.openPanel).toHaveBeenCalledWith('builds', { character: { name: 'Novadin', mode: 'hardcore' } });
    expect(character.actions?.map((a) => a.id)).toEqual(['follow', 'site']);
  });

  it('caps the group at the limit', async () => {
    const { result } = renderHook(() => useBuildsSource(input({ query: 'nova', limit: 3 })));
    await waitFor(() => expect(result.current.items[1]?.ref.id).toBe('builds:character:softcore:novaqueen'));
    expect(result.current.items.map((i) => i.ref.id)).toEqual([
      'builds:skill:Nova',
      'builds:character:softcore:novaqueen',
      'builds:character:hardcore:novadin',
    ]);
  });

  it('does not ask the server below the minimum length', async () => {
    const { result } = renderHook(() => useBuildsSource(input({ query: 'no' })));
    await pause(PALETTE_DEBOUNCE_MS + 100);
    expect(suggestCalls()).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it('is loading while the lookup is in flight, then answers the local rows and reports once', async () => {
    const pending = Promise.withResolvers<Response>();
    suggest = () => pending.promise;
    const { result, rerender } = renderHook((props: PaletteSourceInput) => useBuildsSource(props), {
      initialProps: input({ query: 'nova' }),
    });

    await waitFor(() => expect(result.current.loading).toBe(true));
    pending.resolve(json({ message: 'Not Found' }, 404));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((i) => i.ref.id)).toEqual([
      'builds:skill:Nova',
      'builds:skill:Frost Nova',
      'builds:skill:Holy Nova',
      'builds:skill:Poison Nova',
    ]);
    expect(reportApiError).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reportApiError).mock.calls[0][3]).toBe(404);

    suggest = async () => json({}, 503);
    rerender(input({ query: 'blizz' }));
    await waitFor(() => expect(suggestCalls()).toHaveLength(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((i) => i.ref.id)).toEqual(['builds:skill:Blizzard']);
    expect(reportApiError).toHaveBeenCalledTimes(1);
  });

  it("drills an account row into that account's characters, filtered by the query", async () => {
    const { result: mixed } = renderHook(() => useBuildsSource(input({ query: 'nova' })));
    await waitFor(() => expect(mixed.current.items).toHaveLength(7));
    const accountRow = mixed.current.items[3];
    expect(accountRow.primary.keepOpen).toBe(true);
    const run = ctx();
    void accountRow.primary.run(run);
    expect(run.scope).toHaveBeenCalledWith({ group: 'builds', param: 'account:NovaAcc', label: 'NovaAcc' });

    accountDetails = [
      { name: 'HamSC', class_name: 'Paladin', level: 85, hardcore: false, ladder: true },
      { name: 'Zappy', class_name: 'Sorceress', level: 99, hardcore: false, ladder: true },
      { name: 'HammyHC', class_name: 'Paladin', level: 97, hardcore: true, ladder: true },
    ];
    const scope = { group: 'builds' as const, param: 'account:NovaAcc', label: 'NovaAcc' };
    const { result } = renderHook(() => useBuildsSource(input({ query: 'ham', scope })));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.loading).toBe(false);
    expect(result.current.items.map((i) => i.ref.id)).toEqual([
      'builds:character:hardcore:hammyhc',
      'builds:character:softcore:hamsc',
    ]);
    const accountCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/game/account/'));
    expect(new URL(String(accountCalls[0][0])).pathname).toBe('/game/account/NovaAcc');
    expect(suggestCalls()).toHaveLength(1);
  });

  it('lists nothing for an account PD2 does not know', async () => {
    vi.mocked(fetch).mockImplementation(async () => json({ message: 'nope' }, 404));
    const scope = { group: 'builds' as const, param: 'account:Ghost' };
    const { result } = renderHook(() => useBuildsSource(input({ scope })));
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('resolves its refs on the empty query without a lookup', async () => {
    const { result: typed } = renderHook(() => useBuildsSource(input({ query: 'nova' })));
    await waitFor(() => expect(typed.current.items).toHaveLength(7));
    const { result: classes } = renderHook(() => useBuildsSource(input({ query: 'pala' })));
    const refs = [...typed.current.items.slice(0, 4), classes.current.items[0]].map((i) => i.ref);
    refs.push({ id: 'builds:skill:Gone', group: 'builds', title: 'Gone', data: { kind: 'skill', value: 'Gone' } });
    cleanup();
    resetBuildsSource();
    vi.mocked(fetch).mockClear();

    const { result } = renderHook(() => useBuildsSource(input({ refs: JSON.parse(JSON.stringify(refs)) })));

    expect(result.current.items.map((i) => [i.ref.id, i.ref.title])).toEqual([
      ['builds:skill:Nova', 'Nova'],
      ['builds:character:softcore:novaqueen', 'NovaQueen'],
      ['builds:character:hardcore:novadin', 'Novadin'],
      ['builds:account:novaacc', 'NovaAcc'],
      ['builds:class:Paladin', 'Paladin'],
    ]);
    expect(result.current.items[4].badge).toBeUndefined();
    const run = ctx();
    void result.current.items[2].primary.run(run);
    expect(run.openPanel).toHaveBeenCalledWith('builds', { character: { name: 'Novadin', mode: 'hardcore' } });
    await pause(PALETTE_DEBOUNCE_MS + 50);
    expect(fetch).not.toHaveBeenCalled();
  });
});
