import { describe, expect, it, vi } from 'vitest';
import { faro } from '@grafana/faro-web-sdk';
import { setTelemetryUser, trackEvent, trackMeasurement } from './telemetry';

vi.mock('@grafana/faro-web-sdk', () => ({
  faro: { api: { pushEvent: vi.fn(), pushMeasurement: vi.fn(), setUser: vi.fn(), resetUser: vi.fn() } },
}));

describe('trackEvent', () => {
  it('stringifies attribute values and drops null/undefined ones', () => {
    trackEvent('list_item_auto_selected', { count: 3, ok: true, source: 'hotkey', a: null, b: undefined });

    expect(faro.api.pushEvent).toHaveBeenCalledWith('list_item_auto_selected', {
      count: '3',
      ok: 'true',
      source: 'hotkey',
    });
  });

  it('sends no attributes object when none remain', () => {
    trackEvent('opened', { a: null });
    trackEvent('opened');

    expect(vi.mocked(faro.api.pushEvent).mock.calls).toEqual([
      ['opened', undefined],
      ['opened', undefined],
    ]);
  });

  it('keeps falsy-but-present values', () => {
    trackEvent('e', { zero: 0, no: false, empty: '' });

    expect(faro.api.pushEvent).toHaveBeenCalledWith('e', { zero: '0', no: 'false', empty: '' });
  });
});

describe('trackMeasurement', () => {
  it('keeps only finite numeric values and stringifies context', () => {
    trackMeasurement(
      'listed_items_fetch',
      { duration_ms: 120, returned_items: 0, bad: NaN, inf: Infinity, missing: null, unset: undefined },
      { outcome: 'success', retry: 1, skip: null },
    );

    expect(faro.api.pushMeasurement).toHaveBeenCalledWith(
      { type: 'listed_items_fetch', values: { duration_ms: 120, returned_items: 0 } },
      { context: { outcome: 'success', retry: '1' } },
    );
  });

  it('sends nothing when no finite value remains', () => {
    trackMeasurement('x', { a: NaN, b: null, c: -Infinity });

    expect(faro.api.pushMeasurement).not.toHaveBeenCalled();
  });

  it('omits the options argument when the context is empty', () => {
    trackMeasurement('x', { duration_ms: 5 }, { a: undefined });

    expect(faro.api.pushMeasurement).toHaveBeenCalledWith({ type: 'x', values: { duration_ms: 5 } }, undefined);
  });
});

describe('setTelemetryUser', () => {
  it('sets the user, and resets it on sign-out', () => {
    setTelemetryUser({ id: '42', username: 'paladin' });
    expect(faro.api.setUser).toHaveBeenCalledWith({ id: '42', username: 'paladin' });
    expect(faro.api.resetUser).not.toHaveBeenCalled();

    setTelemetryUser(null);
    expect(faro.api.resetUser).toHaveBeenCalledTimes(1);
  });
});
