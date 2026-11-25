// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetch } from '@/lib/browser-http';
import { openUrl } from '@/lib/browser-opener';
import { publishIntent, type OverlayIntent } from '@/lib/overlay-intents';
import type { SimCardBody, SimJobStatus, SimReportCard } from '@/lib/sim-jobs-api';
import { useSimAccess } from '@/hooks/useSimAccess';
import type { SavedSearch } from '@/pages/market/lib/types';
import { clearSimCardCache } from './components/SimResultCard';
import SimPage, { ACTIVE_POLL_MS, IDLE_POLL_MS } from './SimPage';

const h = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  updateSettings: vi.fn(),
  openPanel: vi.fn(),
  payload: undefined as { slug: string; url: string } | undefined,
  payloadVersion: 0,
  store: {} as Record<string, any>,
}));

vi.mock('@/hooks/useOptions', () => ({
  useOptions: () => ({ settings: h.settings, isLoading: false, updateSettings: h.updateSettings }),
}));
vi.mock('@/hooks/useSimAccess', () => ({ useSimAccess: vi.fn() }));
vi.mock('@/hooks/useSimLadderCharacters', () => ({
  useSimLadderCharacters: () => ({
    status: 'ok',
    data: [
      { name: 'HammerPal', account: 'Acc', className: 'Paladin', level: 92 },
      { name: 'FrozenDez', account: 'Acc', className: 'Sorceress', level: 90 },
    ],
  }),
}));
vi.mock('@/components/custom/SimCharacterPicker', () => ({
  SimCharacterPicker: ({ value, onChange }: { value: string; onChange: (name: string) => void }) => (
    <button type="button"
      aria-label="Character"
      onClick={() => onChange('FrozenDez')}>
      {value}
    </button>
  ),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select aria-label="Default goal"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));
vi.mock('@/overlay', () => ({
  usePanel: () => ({ close: vi.fn(), payload: h.payload, payloadVersion: h.payloadVersion, visible: true }),
  useOverlay: () => ({ openPanel: h.openPanel }),
  showToast: vi.fn(),
}));
vi.mock('@/pages/market/store/useMarketStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/pages/market/store/useMarketStore')>()),
  useMarketStore: () => h.store,
}));
vi.mock('@/pages/chat/hooks/useListingMarketPrices', () => ({
  useMarketPrices: (items: { id: string }[]) =>
    new Map(items.map((item) => [item.id, { hr: 4.2, window: '24h', fellBack: false, samples: 9 }])),
}));
vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/browser-opener', () => ({ openUrl: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/telemetry', () => ({ trackMeasurement: vi.fn() }));
vi.mock('@/components/custom/window-chrome', () => ({
  WindowPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  WindowChrome: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <header>
      <h2>{title}</h2>
      {actions}
    </header>
  ),
}));
vi.mock('@/lib/pkce', () => ({ BACKEND_URL: 'https://api.test' }));

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const job = (over: Partial<SimJobStatus>): SimJobStatus => ({
  id: 'j',
  goal: 'top_gear',
  character: 'HammerPal',
  status: 'succeeded',
  progress: null,
  queuePosition: null,
  etaSeconds: null,
  source: 'website',
  error: null,
  reportUrl: null,
  headline: [],
  createdAt: minutesAgo(10),
  finishedAt: null,
  ...over,
});
/** A finished sim with report `slug`, finished `ago` minutes ago. */
const done = (slug: string, goal: SimJobStatus['goal'], ago: number, over: Partial<SimJobStatus> = {}) =>
  job({
    id: slug,
    goal,
    reportUrl: `https://pd2trader.com/sim/r/${slug}`,
    createdAt: minutesAgo(ago + 5),
    finishedAt: minutesAgo(ago),
    ...over,
  });

const shako = {
  name: 'Harlequin Crest',
  base: 'Shako',
  quality: 'unique',
  marketQuery: '/item/harlequin_crest?category=equipment-helm',
};
const BODIES: Record<string, SimCardBody> = {
  tg: {
    goal: 'top_gear',
    baseDps: 10_000,
    bestDps: 11_240,
    gainPct: 12.4,
    ciPct: 0.8,
    setsSimmed: 48,
    changes: [
      {
        slot: 'Helm',
        from: { name: 'Peasant Crown', base: 'War Hat', quality: 'unique', marketQuery: null },
        to: shako,
        source: 'candidate',
      },
      {
        slot: 'Left ring',
        from: null,
        to: { name: 'Stone of Jordan', base: 'Ring', quality: 'unique', marketQuery: '/item/stone_of_jordan' },
        source: 'stash',
      },
    ],
  },
  uf: {
    goal: 'upgrade_finder',
    baseDps: 9_000,
    upgrades: [
      { slot: 'Amulet', item: { ...shako, name: "Mara's Kaleidoscope" }, gainPct: 6.2 },
      {
        slot: 'Gloves',
        item: { name: 'Rare Gloves', base: 'Heavy Gloves', quality: 'rare', marketQuery: null },
        gainPct: 2.1,
      },
    ],
  },
  qs: {
    goal: 'quick_sim',
    dps: 12_345.6,
    ciPct: 1.2,
    killTimeSec: 42.5,
    sources: [
      { label: 'Blessed Hammer', share: 0.82 },
      { label: 'Holy Fire', share: 0.18 },
    ],
    vsPreviousPct: -2,
  },
  sw: {
    goal: 'stat_weights',
    weights: [
      { label: '+1 All Skills', pct: 4.5 },
      { label: 'Faster Cast Rate', pct: 1.2 },
    ],
    // The server can't know the stat's current total: no target
    nextBreakpoint: { stat: 'FCR', target: null, needed: 20, gainPct: 3.1 },
  },
  sc: {
    goal: 'skill_charm_optimizer',
    gainPct: 3.3,
    skillMoves: [{ from: 'Vigor', to: 'Blessed Aim', points: 5 }],
    charmSwaps: [
      { from: 'Small Charm of Life', to: 'Small Charm of Vita' },
      { from: null, to: 'Grand Charm of Vita' },
      { from: 'Jewel of Fervor', to: null },
    ],
  },
};
const card = (slug: string): SimReportCard => ({
  slug,
  goal: BODIES[slug].goal,
  character: 'HammerPal',
  scenario: 'Uber Tristram',
  reportUrl: `https://pd2trader.com/sim/r/${slug}`,
  plannerUrl: `https://pd2trader.com/sim/plan?report=${slug}`,
  createdAt: minutesAgo(1),
  card: BODIES[slug],
});

let jobs: SimJobStatus[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
function serve() {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith('/api/sim/jobs/mine')) return json(200, { jobs });
    const slug = /\/api\/sim\/reports\/([^/]+)\/card$/.exec(url)?.[1];
    if (slug === 'cmp') return json(404, { code: 'card_unsupported' });
    if (slug && BODIES[slug]) return json(200, card(slug));
    return json(404, {});
  });
}
const cardCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/card'));

const access = (canUse: boolean, waitlistPosition: number | null = null) =>
  ({ canUse, waitlistUrl: 'https://pd2trader.com/sim/waitlist', waitlistPosition }) as ReturnType<typeof useSimAccess>;
const settle = async () => {
  await act(() => vi.advanceTimersByTimeAsync(0));
  await act(() => vi.advanceTimersByTimeAsync(0));
};
const show = async (list: SimJobStatus[]) => {
  jobs = list;
  serve();
  const view = render(<SimPage />);
  await settle();
  return view;
};

beforeEach(() => {
  vi.useFakeTimers();
  h.settings = { pd2Token: 'tok', simCharacter: 'HammerPal', simGoal: 'top_gear' };
  h.updateSettings.mockReset();
  h.openPanel.mockReset();
  h.payload = undefined;
  h.payloadVersion = 0;
  h.store = {
    savedSearches: [] as SavedSearch[],
    alertsEnabled: true,
    saveSearch: vi.fn(),
    setSearchWatching: vi.fn(() => true),
    setAlertsEnabled: vi.fn(),
  };
  vi.mocked(useSimAccess).mockReturnValue(access(true));
  vi.mocked(fetch).mockReset();
  vi.mocked(openUrl).mockClear();
  clearSimCardCache();
  jobs = [];
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SimPage', () => {
  it('asks a signed-out user to sign in, without loading', async () => {
    h.settings = {};
    vi.mocked(useSimAccess).mockReturnValue(null);
    render(<SimPage />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(h.openPanel).toHaveBeenCalledWith('signIn');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows the waitlist outside the closed beta', async () => {
    vi.mocked(useSimAccess).mockReturnValue(access(false, 7));
    render(<SimPage />);
    await settle();
    expect(screen.getByText(/#7 on the waitlist/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows an empty state with the bearer-token request', async () => {
    await show([]);
    expect(vi.mocked(fetch).mock.calls[0]).toEqual([
      'https://api.test/api/sim/jobs/mine',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }),
    ]);
    expect(screen.getByText('Horadric Sim')).toBeTruthy();
    expect(screen.getByText(/No results in the last 24 hours/)).toBeTruthy();
  });

  it('lists running sims and results, read-only, with the newest result selected', async () => {
    await show([
      job({ id: 'r', status: 'running', progress: { done: 25, total: 100 }, etaSeconds: 90, source: 'overlay' }),
      job({ id: 'q', goal: 'quick_sim', status: 'queued', queuePosition: 3 }),
      done('uf', 'upgrade_finder', 120, { headline: ['Best upgrade +6.2% DPS', 'x'] }),
      done('tg', 'top_gear', 30, { headline: ['Best set +12.4% DPS'] }),
      job({ id: 'f', status: 'failed', error: 'Character not found', createdAt: minutesAgo(300) }),
    ]);

    expect(screen.getAllByTestId('sim-running')).toHaveLength(2);
    expect(screen.getAllByRole('progressbar')[0].getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByText('~2m left')).toBeTruthy();
    expect(screen.getByText('Queued · #3 in line')).toBeTruthy();
    const rows = screen.getAllByTestId('sim-result');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('Best upgrade +6.2% DPS')).toBeTruthy();
    // Goal, then character · time, then the headline: each on its own line
    expect(within(rows[0]).getByText('Upgrade Finder')).toBeTruthy();
    expect(within(rows[0]).getByText('HammerPal · 2h ago')).toBeTruthy();
    expect(screen.getByText('Character not found')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start|stop|cancel|edit/i })).toBeNull();

    // Newest finished (tg, 30 min ago) is selected and its card loaded
    expect(rows[1].getAttribute('aria-current')).toBe('true');
    expect(cardCalls().map(([url]) => url)).toEqual(['https://api.test/api/sim/reports/tg/card']);
    expect(cardCalls()[0][1]).toEqual(expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }));
    expect(screen.getByText('+12.4%')).toBeTruthy();
  });

  it('switches the card with the selected result', async () => {
    await show([done('tg', 'top_gear', 30), done('qs', 'quick_sim', 60)]);
    expect(screen.getByText('+12.4%')).toBeTruthy();
    fireEvent.click(screen.getAllByTestId('sim-result')[1]);
    expect(screen.getByRole('status', { name: 'Loading result' })).toBeTruthy();
    await settle();
    expect(screen.queryByText('+12.4%')).toBeNull();
    expect(screen.getByText('12,346 DPS')).toBeTruthy();
    expect(screen.getAllByTestId('sim-result')[1].getAttribute('aria-current')).toBe('true');
    // Back to the first: no second request for its card
    fireEvent.click(screen.getAllByTestId('sim-result')[0]);
    expect(screen.getByText('+12.4%')).toBeTruthy();
    expect(cardCalls()).toHaveLength(2);
  });

  it('top gear: gain, DPS, sets and changes with stash tags and market actions', async () => {
    await show([done('tg', 'top_gear', 5)]);
    expect(screen.getByText('+12.4%')).toBeTruthy();
    expect(screen.getByText('10,000 → 11,240 DPS')).toBeTruthy();
    expect(screen.getByText('best of 48 sets · ±0.8%')).toBeTruthy();
    const [helm, ring] = screen.getAllByTestId('sim-change');
    expect(within(helm).getByText('Peasant Crown').tagName).toBe('S');
    expect(within(helm).getByText('~4.2 HR')).toBeTruthy();
    expect(within(helm).getByRole('button', { name: /market/i })).toBeTruthy();
    expect(within(ring).getByText('stash')).toBeTruthy();
    expect(within(ring).queryByRole('button', { name: /market/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /open full report/i }));
    expect(openUrl).toHaveBeenCalledWith('https://pd2trader.com/sim/r/tg');
    fireEvent.click(screen.getByRole('button', { name: /open in planner/i }));
    expect(openUrl).toHaveBeenCalledWith('https://pd2trader.com/sim/plan?report=tg');
  });

  it('upgrade finder: upgrades with gain, slot and market actions for marketable items', async () => {
    await show([done('uf', 'upgrade_finder', 5)]);
    expect(screen.getByText('Base 9,000 DPS')).toBeTruthy();
    const [mara, gloves] = screen.getAllByTestId('sim-upgrade');
    expect(within(mara).getByText("Mara's Kaleidoscope")).toBeTruthy();
    expect(within(mara).getByText('Amulet')).toBeTruthy();
    expect(within(mara).getByText('+6.2%')).toBeTruthy();
    expect(within(mara).getByRole('button', { name: /watch/i })).toBeTruthy();
    expect(within(gloves).getByText('+2.1%')).toBeTruthy();
    expect(within(gloves).queryByRole('button', { name: /market/i })).toBeNull();
  });

  it('quick sim: DPS, confidence and scenario, damage sources, kill time and change', async () => {
    await show([done('qs', 'quick_sim', 5)]);
    expect(screen.getByText('12,346 DPS')).toBeTruthy();
    expect(screen.getByText('±1.2% · Uber Tristram')).toBeTruthy();
    const sources = screen.getAllByTestId('sim-source');
    expect(sources).toHaveLength(2);
    expect(within(sources[0]).getByText('Blessed Hammer')).toBeTruthy();
    expect(within(sources[0]).getByText('82%')).toBeTruthy();
    expect(screen.getByText('42.5s')).toBeTruthy();
    expect(screen.getByText('−2.0%')).toBeTruthy();
  });

  it('stat weights: weights and the next breakpoint', async () => {
    await show([done('sw', 'stat_weights', 5)]);
    const weights = screen.getAllByTestId('sim-weight');
    expect(within(weights[0]).getByText('+1 All Skills')).toBeTruthy();
    expect(within(weights[0]).getByText('+4.5%')).toBeTruthy();
    expect(within(weights[1]).getByText('+1.2%')).toBeTruthy();
    expect(screen.getByTestId('sim-breakpoint').textContent).toBe('FCR: 20 more+3.1%');
  });

  it('skills & charms: gain, skill moves and charm swaps', async () => {
    await show([done('sc', 'skill_charm_optimizer', 5)]);
    expect(screen.getByText('+3.3%')).toBeTruthy();
    expect(screen.getByTestId('sim-skill-move').textContent).toBe('5 pts Vigor → Blessed Aim');
    expect(screen.getAllByTestId('sim-charm-swap').map((li) => li.textContent)).toEqual([
      'Small Charm of Life → Small Charm of Vita',
      'Add Grand Charm of Vita',
      'Drop Jewel of Fervor',
    ]);
  });

  it('a report without a card says so and links the full report', async () => {
    await show([done('cmp', 'quick_sim', 5)]);
    expect(screen.getByText('This report has no summary card here.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /open full report/i }));
    expect(openUrl).toHaveBeenCalledWith('https://pd2trader.com/sim/r/cmp');
  });

  it('a failed sim shows its error and opens the planner on its character and goal', async () => {
    await show([
      done('tg', 'top_gear', 5),
      job({ id: 'f', goal: 'stat_weights', status: 'failed', error: 'Character not found' }),
    ]);
    fireEvent.click(screen.getAllByTestId('sim-result')[1]);
    expect(screen.getAllByText('Character not found')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /open in planner/i }));
    expect(openUrl).toHaveBeenCalledWith('https://api.test/sim/plan?import=HammerPal&goal=stat_weights');
  });

  it('Market opens the market browser searching for the item', async () => {
    await show([done('tg', 'top_gear', 5)]);
    fireEvent.click(within(screen.getAllByTestId('sim-change')[0]).getByRole('button', { name: /market/i }));
    expect(h.openPanel).toHaveBeenCalledWith('market', { filters: { itemName: 'Harlequin Crest' } });
  });

  it('Watch saves one watched search named for the item, then shows Watching', async () => {
    const view = await show([done('tg', 'top_gear', 5)]);
    const watch = () => within(screen.getAllByTestId('sim-change')[0]).getByRole('button', { name: /watch/i });
    expect(watch().textContent).toBe('Watch');
    fireEvent.click(watch());
    expect(h.store.saveSearch).toHaveBeenCalledTimes(1);
    const [name, filters, watching] = h.store.saveSearch.mock.calls[0];
    expect(name).toBe('Harlequin Crest (sim upgrade)');
    expect(filters).toMatchObject({ itemName: 'Harlequin Crest', source: 'live', ladder: true, hardcore: false });
    expect(watching).toBe(true);

    // The store now has it: Watching, and no second save
    h.store = { ...h.store, savedSearches: [{ id: 's1', name, filters, watching: true, createdAt: '', updatedAt: '' }] };
    view.rerender(<SimPage />);
    expect(watch().textContent).toBe('Watching');
    expect((watch() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(watch());
    expect(h.store.saveSearch).toHaveBeenCalledTimes(1);
  });

  it('Watch watches an existing saved search instead of saving another', async () => {
    const view = await show([done('tg', 'top_gear', 5)]);
    const watch = () => within(screen.getAllByTestId('sim-change')[0]).getByRole('button', { name: /watch/i });
    fireEvent.click(watch());
    const filters = h.store.saveSearch.mock.calls[0][1];
    h.store.saveSearch.mockClear();
    h.store = { ...h.store, savedSearches: [{ id: 's2', name: 'Shako', filters, watching: false, createdAt: '', updatedAt: '' }] };
    view.rerender(<SimPage />);
    fireEvent.click(watch());
    expect(h.store.setSearchWatching).toHaveBeenCalledWith('s2', true);
    expect(h.store.saveSearch).not.toHaveBeenCalled();
  });

  it('header pickers change the shared default character and goal; Open planner and Send stash hand off', async () => {
    await show([]);
    expect(screen.getByText('defaults')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Character' }));
    expect(h.updateSettings).toHaveBeenCalledWith({ simCharacter: 'FrozenDez' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Default goal' }), { target: { value: 'upgrade_finder' } });
    expect(h.updateSettings).toHaveBeenCalledWith({ simGoal: 'upgrade_finder' });

    fireEvent.click(screen.getByRole('button', { name: /open planner/i }));
    expect(openUrl).toHaveBeenCalledWith('https://api.test/sim/plan?import=HammerPal&goal=top_gear');
    fireEvent.click(screen.getByRole('button', { name: /send stash/i }));
    expect(h.openPanel).toHaveBeenCalledWith('currency', { tab: 'simulator' });
  });

  it('opened on a report (a toast) selects its sim', async () => {
    h.payload = { slug: 'qs', url: 'https://pd2trader.com/sim/r/qs' };
    h.payloadVersion = 1;
    await show([done('tg', 'top_gear', 5), done('qs', 'quick_sim', 60)]);
    expect(screen.getAllByTestId('sim-result')[1].getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('12,346 DPS')).toBeTruthy();
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('opened on a report it does not list, opens the report in the browser', async () => {
    h.payload = { slug: 'old', url: 'https://pd2trader.com/sim/r/old' };
    h.payloadVersion = 1;
    await show([done('tg', 'top_gear', 5)]);
    expect(openUrl).toHaveBeenCalledWith('https://pd2trader.com/sim/r/old');
    expect(screen.getAllByTestId('sim-result')[0].getAttribute('aria-current')).toBe('true');
  });

  it('polls every 5 s while a sim is in flight, then every minute', async () => {
    const mine = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/jobs/mine')).length;
    jobs = [job({ status: 'running' })];
    serve();
    render(<SimPage />);
    await settle();
    expect(mine()).toBe(1);
    jobs = [job({ status: 'cancelled' })];
    await act(() => vi.advanceTimersByTimeAsync(ACTIVE_POLL_MS));
    expect(mine()).toBe(2);
    await act(() => vi.advanceTimersByTimeAsync(ACTIVE_POLL_MS));
    expect(mine()).toBe(2);
    await act(() => vi.advanceTimersByTimeAsync(IDLE_POLL_MS));
    expect(mine()).toBe(3);
  });

  it('refetches right away on an overlay intent', async () => {
    await show([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => publishIntent({ id: 'x', kind: 'report_ready' } as OverlayIntent));
    await settle();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
