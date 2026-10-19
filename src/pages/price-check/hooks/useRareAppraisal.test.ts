// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRareAppraisal, type RareAppraisalResponse } from '@/lib/rare-appraisal-api';
import { reportApiError } from '@/lib/error-reporting';
import { trackEvent } from '@/lib/telemetry';
import type { Item } from '../lib/interfaces';
import { useRareAppraisal } from './useRareAppraisal';

vi.mock('@/lib/rare-appraisal-api', () => ({ fetchRareAppraisal: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));
vi.mock('@/lib/telemetry', () => ({ trackEvent: vi.fn() }));

type Mode = { isLadder: boolean; isHardcore: boolean } | null;

const rare = (name = 'Grim Band'): Item => ({ name, quality: 'Rare', type: 'Ring', iLevel: 80, stats: [] });
const sc: Mode = { isLadder: true, isHardcore: false };
const response = (verdict: 'keep' | 'vendor' | null): RareAppraisalResponse => ({
  appraisal: verdict ? ({ verdict } as RareAppraisalResponse['appraisal']) : null,
  history: null,
  reason: verdict ? null : 'unknown base',
});

function render(item: Item, mode: Mode) {
  return renderHook(({ item, mode }: { item: Item; mode: Mode }) => useRareAppraisal(item, mode), {
    initialProps: { item, mode },
  });
}

beforeEach(() => {
  vi.mocked(fetchRareAppraisal).mockReset();
});

afterEach(() => {
  cleanup();
});

describe('useRareAppraisal', () => {
  it('stays idle and never fetches for non-rare items', () => {
    const { result } = render({ ...rare(), quality: 'Unique' }, sc);
    expect(result.current).toEqual({ status: 'idle' });
    expect(fetchRareAppraisal).not.toHaveBeenCalled();
  });

  it('appraises Crafted items exactly like rares', () => {
    vi.mocked(fetchRareAppraisal).mockReturnValue(new Promise(() => {}));
    const item: Item = { ...rare('Doom Collar'), quality: 'Crafted', type: 'Amulet' };
    const { result } = render(item, sc);
    expect(result.current).toEqual({ status: 'loading' });
    expect(fetchRareAppraisal).toHaveBeenCalledWith(JSON.stringify(item), sc, expect.any(AbortSignal));
  });

  it('stays idle while settings are loading (mode null), then loads once mode arrives', () => {
    vi.mocked(fetchRareAppraisal).mockReturnValue(new Promise(() => {}));
    const item = rare();
    const { result, rerender } = render(item, null);
    expect(result.current).toEqual({ status: 'idle' });
    expect(fetchRareAppraisal).not.toHaveBeenCalled();

    rerender({ item, mode: sc });
    expect(result.current).toEqual({ status: 'loading' });
    expect(fetchRareAppraisal).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchRareAppraisal).mock.calls[0][0]).toBe(JSON.stringify(item));
  });

  it('goes loading -> done with the response and tracks the verdict', async () => {
    const d = Promise.withResolvers<RareAppraisalResponse | null>();
    vi.mocked(fetchRareAppraisal).mockReturnValue(d.promise);
    const { result } = render(rare(), sc);
    expect(result.current.status).toBe('loading');

    await act(async () => d.resolve(response('keep')));

    expect(result.current).toEqual({ status: 'done', response: response('keep') });
    expect(trackEvent).toHaveBeenCalledWith('item_overlay_rare_appraisal', { verdict: 'keep' });
  });

  it("tracks verdict 'none' when the server could not appraise the item", async () => {
    vi.mocked(fetchRareAppraisal).mockResolvedValue(response(null));
    const { result } = render(rare(), sc);
    await act(async () => {});
    expect(result.current.status).toBe('done');
    expect(trackEvent).toHaveBeenCalledWith('item_overlay_rare_appraisal', { verdict: 'none' });
  });

  it("reports 'off' (not error) when the feature is disabled on the server", async () => {
    vi.mocked(fetchRareAppraisal).mockResolvedValue(null);
    const { result } = render(rare(), sc);
    await act(async () => {});
    expect(result.current).toEqual({ status: 'off' });
    expect(reportApiError).not.toHaveBeenCalled();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('goes to error and reports failures, wrapping non-Error rejections', async () => {
    vi.mocked(fetchRareAppraisal).mockRejectedValue('boom');
    const { result } = render(rare(), sc);
    await act(async () => {});
    expect(result.current).toEqual({ status: 'error' });
    const [err, source] = vi.mocked(reportApiError).mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('boom');
    expect(source).toBe('rare-appraisal-api');
  });

  it('shows loading again and aborts the old request when the mode changes, ignoring its late result', async () => {
    const first = Promise.withResolvers<RareAppraisalResponse | null>();
    const second = Promise.withResolvers<RareAppraisalResponse | null>();
    vi.mocked(fetchRareAppraisal).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const item = rare();
    const { result, rerender } = render(item, sc);
    const firstSignal = vi.mocked(fetchRareAppraisal).mock.calls[0][2]!;

    rerender({ item, mode: { isLadder: true, isHardcore: true } });
    expect(firstSignal.aborted).toBe(true);
    expect(result.current).toEqual({ status: 'loading' });
    expect(vi.mocked(fetchRareAppraisal).mock.calls[1][1]).toEqual({ isLadder: true, isHardcore: true });

    // The stale softcore answer arrives after the switch: must not be shown.
    await act(async () => first.resolve(response('vendor')));
    expect(result.current).toEqual({ status: 'loading' });

    await act(async () => second.resolve(response('keep')));
    expect(result.current).toEqual({ status: 'done', response: response('keep') });
  });

  it('does not report the abort rejection of a superseded request', async () => {
    const first = Promise.withResolvers<RareAppraisalResponse | null>();
    vi.mocked(fetchRareAppraisal)
      .mockReturnValueOnce(first.promise)
      .mockReturnValue(new Promise(() => {}));
    const { rerender } = render(rare('A'), sc);
    rerender({ item: rare('B'), mode: sc });
    await act(async () => first.reject(new DOMException('aborted', 'AbortError')));
    expect(reportApiError).not.toHaveBeenCalled();
  });

  it('does not refetch when re-rendered with an equal item and mode', async () => {
    vi.mocked(fetchRareAppraisal).mockResolvedValue(response('keep'));
    const { result, rerender } = render(rare(), sc);
    await act(async () => {});
    rerender({ item: rare(), mode: { ...sc! } });
    expect(fetchRareAppraisal).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('done');
  });

  it('switching back to an item shows loading (no stale result from the other item)', async () => {
    vi.mocked(fetchRareAppraisal)
      .mockResolvedValueOnce(response('keep'))
      .mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = render(rare('A'), sc);
    await act(async () => {});
    expect(result.current.status).toBe('done');
    rerender({ item: rare('B'), mode: sc });
    expect(result.current).toEqual({ status: 'loading' });
  });

  it('aborts the in-flight request on unmount', () => {
    vi.mocked(fetchRareAppraisal).mockReturnValue(new Promise(() => {}));
    const { unmount } = render(rare(), sc);
    const signal = vi.mocked(fetchRareAppraisal).mock.calls[0][2]!;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
