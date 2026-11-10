// @vitest-environment happy-dom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { showToast, useOverlay, type OverlayApi } from '@/overlay';
import type { GenericToastPayload } from '@/common/types/Events';
import CorruptedZoneTimerController from './CorruptedZoneTimerController';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));
vi.mock('@/overlay', () => ({ showToast: vi.fn(), useOverlay: vi.fn() }));

// Rocky Waste until 20:00 UTC, then Canyon of the Magi, then Spider Forest at 20:15
const NOW = Date.parse('2026-10-25T19:58:00Z');
let settings: Partial<ISettings>;
const toastedZones = () =>
  vi.mocked(showToast).mock.calls.map(([p]) => String((p as GenericToastPayload).description).split(':')[0]);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(showToast).mockClear();
  vi.mocked(useOptions).mockImplementation(() => ({ settings }) as never);
  vi.mocked(useOverlay).mockReturnValue({ openPanel: vi.fn(), closePanel: vi.fn() } as unknown as OverlayApi);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CorruptedZoneTimerController alerts', () => {
  it('toasts every rotation with the purple variant under "all"', () => {
    settings = { corruptedZoneAlerts: 'all' };
    render(<CorruptedZoneTimerController />);
    act(() => vi.advanceTimersByTime(2.5 * 60_000));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showToast).mock.calls[0][0]).toMatchObject({ title: 'Corrupted zone', variant: 'corrupted-zone' });
    act(() => vi.advanceTimersByTime(15 * 60_000));
    expect(toastedZones()).toEqual([
      "Canyon of the Magi and Tal Rasha's Tomb",
      'Spider Forest, Arachnid Lair, and Spider Cavern',
    ]);
  });

  it('toasts only followed zones under "followed"', () => {
    settings = {
      corruptedZoneAlerts: 'followed',
      corruptedZoneFollowed: ['Spider Forest, Arachnid Lair, and Spider Cavern'],
    };
    render(<CorruptedZoneTimerController />);
    act(() => vi.advanceTimersByTime(18 * 60_000));
    expect(toastedZones()).toEqual(['Spider Forest, Arachnid Lair, and Spider Cavern']);
  });

  it('toasts the upcoming zone the set number of minutes before it starts', () => {
    settings = { corruptedZoneAlerts: 'all', corruptedZoneAlertLeadMinutes: 5 };
    render(<CorruptedZoneTimerController />);
    // 19:58: Canyon's 19:55 notice already passed, Spider Forest's is at 20:10
    act(() => vi.advanceTimersByTime(11 * 60_000));
    expect(showToast).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(90_000));
    expect(toastedZones()).toEqual(['Spider Forest, Arachnid Lair, and Spider Cavern in 5 min']);
  });

  it('with the full 15 minute lead, announces a zone as the one before it starts', () => {
    settings = { corruptedZoneAlerts: 'all', corruptedZoneAlertLeadMinutes: 15 };
    render(<CorruptedZoneTimerController />);
    act(() => vi.advanceTimersByTime(2.5 * 60_000));
    expect(toastedZones()).toEqual(['Spider Forest, Arachnid Lair, and Spider Cavern in 15 min']);
  });

  it.each([
    ['alerts are off', { corruptedZoneAlerts: 'off' }],
    ['toast popups are off', { corruptedZoneAlerts: 'all', toastPopupsEnabled: false }],
  ] as const)('stays quiet when %s', (_, extra) => {
    settings = extra;
    render(<CorruptedZoneTimerController />);
    act(() => vi.advanceTimersByTime(30 * 60_000));
    expect(showToast).not.toHaveBeenCalled();
  });
});
