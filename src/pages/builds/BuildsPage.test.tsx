// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { usePanel, useOverlay, type OverlayApi, type PanelContextValue } from '@/overlay';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useSignIn } from '@/hooks/useSignIn';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { fetch } from '@/lib/browser-http';
import type { CharacterDetail, CharacterListResponse, UsageResponse } from '@/lib/builds-api';
import type { BuildsPanelPayload } from './lib/types';
import { clearBuildsCache } from './lib/useBuildsQuery';
import BuildsPage from './BuildsPage';

vi.mock('@/overlay', () => ({ usePanel: vi.fn(), useOverlay: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSignIn', () => ({ useSignIn: vi.fn() }));
vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));

const DETAIL: CharacterDetail = {
  name: 'Hammerdin',
  season: 's14',
  mode: 'softcore',
  className: 'Paladin',
  level: 92,
  life: 2100,
  mana: 600,
  attributes: { strength: 150, dexterity: 75, vitality: 300, energy: 25 },
  isDead: false,
  skills: [{ name: 'Blessed Hammer', base: 20, total: 40 }],
  equipped: [],
  merc: null,
  gearValueHr: 3.2,
  firstSeenAt: '2026-10-20T00:00:00.000Z',
  lastUpdated: '2026-10-25T00:00:00.000Z',
};
const LIST: CharacterListResponse = {
  season: 's14',
  mode: 'softcore',
  total: 0,
  page: 1,
  pageSize: 25,
  breakdown: {},
  characters: [],
};
const USAGE: UsageResponse = {
  season: 's14',
  mode: 'softcore',
  total: 0,
  classes: [],
  skills: [],
  items: [],
  mercTypes: [],
  mercItems: [],
};

let settings: Partial<ISettings>;
let panel: { payload: BuildsPanelPayload | undefined; payloadVersion: number };
let openSignIn: Mock;
let accounts: string[] | undefined;
/** PD2 game/account answers by account. */
let accountCharacters: Record<string, unknown[]>;
/** Builds characters the server tracks, by lowercase name. */
let tracked: Record<string, CharacterDetail>;
/** Characters per class the characters endpoint answers with. */
let breakdown: Record<string, number>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  clearBuildsCache();
  settings = { mode: 'softcore', followedBuildCharacters: [], recentBuildCharacters: [] };
  panel = { payload: undefined, payloadVersion: 1 };
  openSignIn = vi.fn();
  accounts = undefined;
  accountCharacters = {};
  tracked = { hammerdin: DETAIL };
  breakdown = {};
  vi.mocked(usePanel).mockImplementation(
    () => ({ ...panel, close: vi.fn(), visible: true }) as unknown as PanelContextValue<'builds'>,
  );
  vi.mocked(useOverlay).mockImplementation(() => ({ openPanel: vi.fn() }) as unknown as OverlayApi);
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings: vi.fn() }) as never);
  vi.mocked(useSignIn).mockImplementation(() => ({ openSignIn }) as never);
  vi.mocked(usePd2Website).mockImplementation(
    () => ({ authData: accounts ? { user: { game: { accounts } } } : null }) as never,
  );
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = new URL(String(input));
    const account = url.pathname.match(/^\/game\/account\/(.+)$/);
    if (account) return json({ details: accountCharacters[decodeURIComponent(account[1])] ?? [] });
    const character = url.pathname.match(/^\/api\/builds\/characters\/([^/]+)$/);
    if (character) {
      const found = tracked[decodeURIComponent(character[1]).toLowerCase()];
      return found ? json(found) : json({ message: 'Character not found' }, 404);
    }
    if (url.pathname === '/api/builds/characters') return json({ ...LIST, breakdown });
    if (url.pathname === '/api/builds/usage') return json(USAGE);
    if (url.pathname === '/api/builds/shopping-list')
      return json({ season: 's14', mode: 'softcore', total: 0, items: [] });
    if (url.pathname === '/api/builds/meta/history')
      return json({ season: 's14', mode: 'softcore', points: [], items: [] });
    return json({}, 404);
  });
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => cleanup());

const requested = (path: string) =>
  vi
    .mocked(fetch)
    .mock.calls.map(([input]) => new URL(String(input)))
    .filter((u) => u.pathname === path);

describe('BuildsPage payloads', () => {
  it('opens a character from the payload', async () => {
    panel.payload = { character: { name: 'Hammerdin' } };
    render(<BuildsPage />);
    expect(await screen.findByRole('heading', { name: 'Hammerdin' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Follow' })).toBeTruthy();
  });

  it('applies payload filters over the defaults on the Meta tab', async () => {
    panel.payload = { filters: { classes: ['Paladin'], skills: ['Blessed Hammer:20'] } };
    render(<BuildsPage />);
    const chips = await screen.findByLabelText('Active filters');
    expect(within(chips).getByText('Paladin')).toBeTruthy();
    expect(within(chips).getByText('Blessed Hammer 20+')).toBeTruthy();
    await waitFor(() => expect(requested('/api/builds/usage').length).toBeGreaterThan(0));
    const usage = requested('/api/builds/usage')[0].searchParams;
    expect(usage.get('classes')).toBe('Paladin');
    expect(usage.get('skills')).toBe('Blessed Hammer:20');
  });

  it('keeps the current view when reopened without a payload; a tab payload leaves the character', async () => {
    panel.payload = { character: { name: 'Hammerdin' } };
    const { rerender } = render(<BuildsPage />);
    await screen.findByRole('heading', { name: 'Hammerdin' });

    panel = { payload: undefined, payloadVersion: 2 };
    rerender(<BuildsPage />);
    expect(screen.getByRole('heading', { name: 'Hammerdin' })).toBeTruthy();

    panel = { payload: { tab: 'characters' }, payloadVersion: 3 };
    rerender(<BuildsPage />);
    expect(await screen.findByText('Sign in to see your characters')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Hammerdin' })).toBeNull();
  });

  it("says when a looked-up character isn't tracked", async () => {
    render(<BuildsPage />);
    const box = screen.getByLabelText('Look up a character');
    fireEvent.change(box, { target: { value: 'Nobody' } });
    fireEvent.submit(box.closest('form')!);
    expect(await screen.findByText('No tracked character named Nobody')).toBeTruthy();
  });
});

describe('BuildsPage class bar', () => {
  it('orders classes by popularity and sizes each by its share', async () => {
    breakdown = { Amazon: 100, Paladin: 500, Necromancer: 300, Druid: 0, Assassin: 50, Sorceress: 50 };
    panel.payload = { tab: 'meta' };
    render(<BuildsPage />);
    const bar = screen.getByRole('group', { name: 'Classes' });
    await within(bar).findByText('500');
    const buttons = within(bar).getAllByRole('button');
    // Ties (Assassin / Sorceress) and classes without characters keep the game's order
    expect(buttons.map((b) => b.textContent?.match(/^[A-Za-z]+/)?.[0])).toEqual([
      'Paladin',
      'Necromancer',
      'Amazon',
      'Assassin',
      'Sorceress',
      'Barbarian',
      'Druid',
    ]);
    const grow = buttons.map((b) => Number.parseFloat(b.style.flexGrow));
    expect(grow.slice(0, 3)).toEqual([50, 30, 10]);
    // Classes without characters take no share (the tile's min width keeps them readable)
    expect(grow.slice(-2)).toEqual([0, 0]);
  });
});

describe('BuildsPage Mine tab', () => {
  it('asks a signed-out user to sign in', async () => {
    panel.payload = { tab: 'characters' };
    render(<BuildsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(openSignIn).toHaveBeenCalled();
  });

  it('lists the linked accounts: ladder characters of the mode first, below 80 links to the class meta, 80+ not crawled yet', async () => {
    settings.pd2Token = 'token';
    accounts = ['MyAcc'];
    accountCharacters.MyAcc = [
      { account: 'MyAcc', name: 'LowSorc', class_name: 'Sorceress', level: 62, hardcore: false, ladder: true },
      { account: 'MyAcc', name: 'FreshZon', class_name: 'Amazon', level: 85, hardcore: false, ladder: true },
      { account: 'MyAcc', name: 'OldBarb', class_name: 'Barbarian', level: 90, hardcore: true, ladder: false },
    ];
    panel.payload = { tab: 'characters' };
    render(<BuildsPage />);

    expect(await screen.findByText('Not crawled yet; characters refresh about once a day.')).toBeTruthy();
    const names = screen.getAllByText(/^(LowSorc|FreshZon|OldBarb)$/).map((n) => n.textContent);
    expect(names).toEqual(['FreshZon', 'LowSorc', 'OldBarb']);
    expect(screen.getByText('Other modes')).toBeTruthy();
    expect(screen.getByText('Only ladder characters are tracked.')).toBeTruthy();
    expect(requested('/api/builds/characters/LowSorc')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'See level 80+ Sorceress builds' }));
    const chips = await screen.findByLabelText('Active filters');
    expect(within(chips).getByText('Sorceress')).toBeTruthy();
  });

  it('opens a tracked character of the account', async () => {
    settings.pd2Token = 'token';
    accounts = ['MyAcc'];
    accountCharacters.MyAcc = [
      { account: 'MyAcc', name: 'Hammerdin', class_name: 'Paladin', level: 92, hardcore: false, ladder: true },
    ];
    panel.payload = { tab: 'characters' };
    render(<BuildsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Blessed Hammer/ }));
    expect(await screen.findByRole('heading', { name: 'Hammerdin' })).toBeTruthy();
  });

  it('shows a PD2 account failure with Retry, without hiding the other accounts', async () => {
    settings.pd2Token = 'token';
    accounts = ['Broken', 'MyAcc'];
    accountCharacters.MyAcc = [
      { account: 'MyAcc', name: 'LowSorc', class_name: 'Sorceress', level: 62, hardcore: false, ladder: true },
    ];
    const ok = vi.mocked(fetch).getMockImplementation()!;
    vi.mocked(fetch).mockImplementation(async (input, init) =>
      String(input).includes('/game/account/Broken') ? json({}, 500) : ok(input, init),
    );
    panel.payload = { tab: 'characters' };
    render(<BuildsPage />);
    expect(await screen.findByText("Couldn't load Broken's characters from PD2")).toBeTruthy();
    expect(await screen.findByText('LowSorc')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
