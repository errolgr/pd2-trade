// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast, useOverlay, type OverlayApi } from '@/overlay';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { useNetWorth, type NetWorthContextValue } from '@/hooks/useNetWorth';
import type { SnapshotResponse, ValuationLine } from '@/lib/networth-api';
import type { GenericToastPayload } from '@/common/types/Events';
import NetWorthOverlayController from './NetWorthOverlayController';

vi.mock('@/overlay', () => ({ showToast: vi.fn(), useOverlay: vi.fn() }));
vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/hooks/useNetWorth', () => ({ useNetWorth: vi.fn() }));

let settings: Partial<ISettings>;
let latest: SnapshotResponse | null;
const overlay = { openPanel: vi.fn(), closePanel: vi.fn() };

function line(key: string, qty: number, unitPrice: number | null): ValuationLine {
  return {
    key,
    name: key,
    category: 'runes',
    qty,
    unitPrice,
    value: qty * (unitPrice ?? 0),
    confidence: 'ok',
    sampleCount: 10,
    priceChange7dPercent: null,
    tab: null,
    iconPath: null,
  };
}

function snapshot(
  sincePrevious: number | null,
  lines: ValuationLine[] = [],
  overrides: Partial<SnapshotResponse> = {},
): SnapshotResponse {
  return {
    valuation: { lines } as SnapshotResponse['valuation'],
    snapshotId: 'snap',
    deduped: false,
    delta: { sincePrevious, previousTakenAt: null },
    ...overrides,
  };
}

function toasts(): GenericToastPayload[] {
  return vi.mocked(showToast).mock.calls.map(([payload]) => payload as GenericToastPayload);
}

function renderController() {
  const utils = render(<NetWorthOverlayController />);
  const update = () => utils.rerender(<NetWorthOverlayController />);
  return { ...utils, update };
}

beforeEach(() => {
  vi.clearAllMocks();
  settings = { pd2Token: 'tok', netWorthTickerEnabled: true };
  latest = null;
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as never);
  vi.mocked(useNetWorth).mockImplementation(() => ({ latest }) as NetWorthContextValue);
  vi.mocked(useOverlay).mockReturnValue(overlay as unknown as OverlayApi);
});

afterEach(cleanup);

describe('NetWorthOverlayController snapshot toasts', () => {
  it('toasts a gain above the threshold', () => {
    const { update } = renderController();
    latest = snapshot(1.24);
    update();
    expect(toasts()).toEqual([{ title: 'Net Worth', description: '+1.2 HR', variant: 'success' }]);
  });

  it('names the biggest movers in the direction of the change', () => {
    const { update } = renderController();
    latest = snapshot(0.6, [line('Ber', 1, 6), line('Ist', 2, 0.5), line('Mal', 1, 1), line('Lem', 3, 0.01)]);
    update();
    latest = snapshot(7.7, [
      line('Ber', 2, 6),
      line('Ist', 5, 0.5),
      line('Sol', 1, 0.1),
      line('Lem', 3, 0.01),
      line('Pul', 1, 0.05),
      line('Unpriced', 4, null),
    ]);
    update();
    expect(toasts()[1]).toEqual({ title: 'Net Worth', description: '+7.7 HR · Ber, 3× Ist, Sol', variant: 'success' });
  });

  it('names removed holdings when the total dropped', () => {
    const { update } = renderController();
    latest = snapshot(0.6, [line('Ber', 1, 6), line('Mal', 2, 1), line('Ist', 1, 0.5)]);
    update();
    latest = snapshot(-2.7, [line('Ist', 4, 0.5)]);
    update();
    expect(toasts()[1]).toEqual({ title: 'Net Worth', description: '-2.7 HR · Ber, 2× Mal', variant: 'warning' });
  });

  it('leaves out movers when none moved in the direction of the change', () => {
    const { update } = renderController();
    latest = snapshot(0.6, [line('Ber', 1, 6)]);
    update();
    // Market drift: same holdings, higher total
    latest = snapshot(1, [line('Ber', 1, 7)]);
    update();
    expect(toasts()[1].description).toBe('+1.0 HR');
  });

  it.each([
    ['below the default 0.5 HR threshold', {}, snapshot(0.49)],
    ['below a custom threshold', { netWorthToastThresholdHr: 2 }, snapshot(-1.9)],
    ['deduped', {}, snapshot(3, [], { deduped: true })],
    ['not stored', {}, snapshot(3, [], { snapshotId: null })],
    ['without a previous snapshot', {}, snapshot(null)],
    ['with net worth toasts turned off', { toastPopupTypes: ['whispers'] }, snapshot(3)],
    ['with all toasts turned off', { toastPopupsEnabled: false }, snapshot(3)],
  ] as const)('does not toast a snapshot %s', (_, extraSettings, next) => {
    settings = { ...settings, ...(extraSettings as Partial<typeof settings>) };
    const { update } = renderController();
    latest = next;
    update();
    expect(toasts()).toEqual([]);
  });

  it('toasts each snapshot once', () => {
    const { update } = renderController();
    latest = snapshot(1);
    update();
    settings = { ...settings };
    update();
    expect(toasts()).toHaveLength(1);
  });

  it('stays quiet while the ticker is off (the default)', () => {
    settings = { pd2Token: 'tok' };
    const { update } = renderController();
    latest = snapshot(3);
    update();
    expect(toasts()).toEqual([]);
  });

  it('toasts a change exactly at the threshold', () => {
    const { update } = renderController();
    latest = snapshot(-0.5);
    update();
    expect(toasts()).toEqual([{ title: 'Net Worth', description: '-0.5 HR', variant: 'warning' }]);
  });
});

describe('NetWorthOverlayController ticker', () => {
  it('opens the ticker while it is on and the user is signed in, and closes it otherwise', () => {
    const { update } = renderController();
    expect(overlay.openPanel.mock.calls).toEqual([['netWorthTicker']]);

    settings = { ...settings, pd2Token: undefined };
    update();
    expect(overlay.closePanel.mock.calls).toEqual([['netWorthTicker']]);

    settings = { ...settings, pd2Token: 'tok', netWorthTickerEnabled: false };
    update();
    expect(overlay.openPanel).toHaveBeenCalledTimes(1);

    settings = { ...settings, netWorthTickerEnabled: true };
    update();
    expect(overlay.openPanel).toHaveBeenCalledTimes(2);
  });

  it('keeps the ticker closed by default', () => {
    settings = { pd2Token: 'tok' };
    renderController();
    expect(overlay.openPanel).not.toHaveBeenCalled();
    expect(overlay.closePanel.mock.calls).toEqual([['netWorthTicker']]);
  });
});
