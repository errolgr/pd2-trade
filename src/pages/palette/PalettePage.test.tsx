// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { MotionGlobalConfig } from 'framer-motion';
import { usePanel, useOverlay, type OverlayApi, type PanelContextValue } from '@/overlay';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useSignIn } from '@/hooks/useSignIn';
import type { PaletteGroupId, PaletteItem, PaletteSourceInput, PaletteSourceResult } from './lib/types';
import PalettePage from './PalettePage';

vi.mock('@/overlay', () => ({ usePanel: vi.fn(), useOverlay: vi.fn(), showToast: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useSignIn', () => ({ useSignIn: vi.fn() }));

/** What each group's source answers, and the inputs it was called with. */
const answers: Partial<Record<PaletteGroupId, (input: PaletteSourceInput) => PaletteSourceResult>> = {};
const calls: Record<string, PaletteSourceInput[]> = {};
const source = (group: PaletteGroupId) => (input: PaletteSourceInput) => {
  (calls[group] ??= []).push(input);
  return answers[group]?.(input) ?? { items: [], loading: false };
};
vi.mock('./sources/actions', () => ({ useActionsSource: (i: PaletteSourceInput) => source('actions')(i) }));
vi.mock('./sources/items', () => ({ useItemsSource: (i: PaletteSourceInput) => source('items')(i) }));
vi.mock('./sources/builds', () => ({ useBuildsSource: (i: PaletteSourceInput) => source('builds')(i) }));
vi.mock('./sources/chat', () => ({ useChatSource: (i: PaletteSourceInput) => source('chat')(i) }));
vi.mock('./sources/listings', () => ({ useListingsSource: (i: PaletteSourceInput) => source('listings')(i) }));
vi.mock('./sources/settings', () => ({ useSettingsSource: (i: PaletteSourceInput) => source('settings')(i) }));

let settings: Partial<ISettings>;
let updateSettings: Mock;
let close: Mock;
let openPanel: Mock;
let openSignIn: Mock;

function row(group: PaletteGroupId, key: string, extra: Partial<PaletteItem> = {}): PaletteItem {
  return {
    ref: { id: `${group}:${key}`, group, title: key },
    primary: { id: 'open', label: `Open ${key}`, run: vi.fn() },
    ...extra,
  };
}

/** A source that matches its items' titles against the query and resolves refs on the empty state. */
function serve(group: PaletteGroupId, items: PaletteItem[]) {
  answers[group] = ({ query, refs, limit }) => {
    if (limit === 0) return { items: [], loading: false };
    if (!query) return { items: items.filter((i) => refs.some((r) => r.id === i.ref.id)), loading: false };
    return { items: items.filter((i) => i.ref.title.includes(query)).slice(0, limit), loading: false };
  };
}

const input = () => screen.getByRole('combobox');
const type = (text: string) => fireEvent.change(input(), { target: { value: text } });
const key = (k: string, init: KeyboardEventInit = {}) => fireEvent.keyDown(input(), { key: k, ...init });
const lastInput = (group: PaletteGroupId) => calls[group].at(-1)!;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
  Element.prototype.scrollIntoView ??= () => {};
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

beforeEach(() => {
  for (const g of Object.keys(answers)) delete answers[g as PaletteGroupId];
  for (const g of Object.keys(calls)) delete calls[g];
  settings = { palettePins: [], paletteRecents: [], hotkeyModifierPalette: 'ctrl', hotkeyKeyPalette: 'space' };
  updateSettings = vi.fn((patch: Partial<ISettings>) => Object.assign(settings, patch));
  close = vi.fn();
  openPanel = vi.fn();
  openSignIn = vi.fn();
  vi.mocked(useOptions).mockImplementation(() => ({ settings, updateSettings }) as unknown as ReturnType<typeof useOptions>);
  vi.mocked(usePanel).mockReturnValue({ close } as unknown as PanelContextValue);
  vi.mocked(useOverlay).mockReturnValue({ openPanel } as unknown as OverlayApi);
  vi.mocked(useSignIn).mockReturnValue({ openSignIn } as unknown as ReturnType<typeof useSignIn>);
});
afterEach(cleanup);

describe('PalettePage', () => {
  it('shows pins and recents on the empty state, resolved by their sources', () => {
    settings.palettePins = [{ id: 'actions:market', group: 'actions', title: 'market' }];
    settings.paletteRecents = [{ id: 'items:shako', group: 'items', title: 'shako' }];
    serve('actions', [row('actions', 'market')]);
    serve('items', [row('items', 'shako')]);
    render(<PalettePage />);

    expect(lastInput('items').refs.map((r) => r.id)).toEqual(['items:shako']);
    expect(screen.getByText('Pinned')).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByText('market')).toBeTruthy();
    expect(screen.getByText('shako')).toBeTruthy();
  });

  it('lists groups in the fixed order, recently picked results first within a group', () => {
    settings.paletteRecents = [{ id: 'items:sha-b', group: 'items', title: 'sha-b' }];
    serve('settings', [row('settings', 'sha-setting')]);
    serve('items', [row('items', 'sha-a'), row('items', 'sha-b')]);
    render(<PalettePage />);
    type('sha');

    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['sha-b', 'sha-a', 'sha-setting']);
  });

  it('Enter runs the highlighted row, records it as recent and closes', async () => {
    const shako = row('items', 'shako');
    serve('items', [shako]);
    render(<PalettePage />);
    type('sha');
    key('Enter');
    await waitFor(() => expect(shako.primary.run).toHaveBeenCalled());
    expect(settings.paletteRecents?.[0].id).toBe('items:shako');
    expect(close).toHaveBeenCalled();
  });

  it('keeps the first row highlighted when server results reorder the list, until the user moves', () => {
    let order = ['sha-local', 'sha-server'];
    answers.items = ({ query, limit }) => ({
      loading: false,
      items: query && limit ? order.map((k) => row('items', k)) : [],
    });
    const view = render(<PalettePage />);
    type('sha');
    const highlighted = () => screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true')?.textContent;
    expect(highlighted()).toBe('sha-local');

    order = ['sha-server', 'sha-local'];
    view.rerender(<PalettePage />);
    expect(highlighted()).toBe('sha-server');

    key('ArrowDown');
    order = ['sha-new', 'sha-server', 'sha-local'];
    view.rerender(<PalettePage />);
    expect(highlighted()).toBe('sha-local');
  });

  it('does not highlight a typo match first: Enter takes the first real match', async () => {
    const meat = row('items', 'The Meat Scraper', { weak: true });
    const theme = row('settings', 'Theme');
    answers.items = ({ query, limit }) => ({ loading: false, items: query && limit ? [meat] : [] });
    serve('settings', [theme]);
    render(<PalettePage />);
    type('Theme');

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['The Meat Scraper', 'Theme']);
    key('Enter');
    await waitFor(() => expect(theme.primary.run).toHaveBeenCalled());
    expect(meat.primary.run).not.toHaveBeenCalled();
  });

  it('keeps the palette open after an action that asks to', async () => {
    const toggle = row('settings', 'chat button', {
      primary: { id: 'toggle', label: 'Toggle', keepOpen: true, run: vi.fn() },
    });
    serve('settings', [toggle]);
    render(<PalettePage />);
    type('chat');
    key('Enter');

    await waitFor(() => expect(toggle.primary.run).toHaveBeenCalled());
    expect(close).not.toHaveBeenCalled();
  });

  it('Tab on a group name scopes to it; Backspace on the empty query goes back', () => {
    serve('settings', [row('settings', 'theme')]);
    render(<PalettePage />);
    type('set');
    key('Tab');

    expect(screen.getByRole('button', { name: /Settings/ })).toBeTruthy();
    expect(lastInput('settings')).toMatchObject({ query: '', scope: { group: 'settings' }, limit: 30 });
    expect(lastInput('items').limit).toBe(0);

    key('Backspace');
    expect(screen.queryByRole('button', { name: /Settings/ })).toBeNull();
    expect(lastInput('items').limit).toBeGreaterThan(0);
  });

  it("Tab on other text scopes to the highlighted row's group and keeps the query", () => {
    serve('items', [row('items', 'shako')]);
    render(<PalettePage />);
    type('sha');
    key('Tab');

    expect(lastInput('items')).toMatchObject({ query: 'sha', scope: { group: 'items' } });
    expect((input() as HTMLInputElement).value).toBe('sha');
  });

  it('a drill-in action scopes with its label and clears the query', async () => {
    answers.builds = ({ query, scope }) => ({
      loading: false,
      items: scope?.param
        ? [row('builds', 'character:ShadowDin')]
        : query
          ? [
              row('builds', 'account:shaman', {
                primary: {
                  id: 'drill',
                  label: 'Characters',
                  keepOpen: true,
                  run: (ctx) => ctx.scope({ group: 'builds', param: 'account:shaman', label: 'shaman' }),
                },
              }),
            ]
          : [],
    });
    render(<PalettePage />);
    type('sham');
    key('Enter');

    await waitFor(() => expect(screen.getByRole('button', { name: /shaman/ })).toBeTruthy());
    expect((input() as HTMLInputElement).value).toBe('');
    expect(screen.getByText('character:ShadowDin')).toBeTruthy();
  });

  it('Ctrl+K lists the row actions and pins it without closing', async () => {
    const watch = { id: 'watch', label: 'Watch price', run: vi.fn() };
    serve('items', [row('items', 'shako', { actions: [watch] })]);
    render(<PalettePage />);
    type('sha');
    key('k', { ctrlKey: true });

    expect(screen.getByText('Watch price')).toBeTruthy();
    fireEvent.click(screen.getByText('Pin to palette'));
    expect(settings.palettePins?.map((p) => p.id)).toEqual(['items:shako']);
    expect(close).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Watch price')).toBeNull());
  });

  it('replaces signed-out groups with one Sign in row', () => {
    answers.chat = ({ limit }) => ({ items: [], loading: false, signedOut: limit > 0 });
    answers.listings = ({ limit }) => ({ items: [], loading: false, signedOut: limit > 0 });
    render(<PalettePage />);
    type('bob');

    const signIn = screen.getAllByRole('option');
    expect(signIn.map((o) => o.textContent)).toEqual(['Sign in to search chats and listings']);
    key('Enter');
    expect(openSignIn).toHaveBeenCalled();
  });

  it('shows the loading bar while a source looks something up', () => {
    answers.builds = ({ query }) => ({ items: [], loading: query.length >= 3 });
    render(<PalettePage />);
    expect(screen.queryByRole('progressbar')).toBeNull();
    type('sham');
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });
});
