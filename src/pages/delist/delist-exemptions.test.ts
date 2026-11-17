import { describe, expect, it } from 'vitest';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import {
  addDelistException,
  baseCodeOf,
  delistChoiceUpdate,
  EXEMPT_LISTINGS_MAX,
  exemptionsOf,
  isDelistExempt,
  rememberException,
  removeDelistException,
  setListingExempt,
  withoutExempt,
  type DelistExemptions,
} from './delist-exemptions';

const listing = (_id: string, base_code: string, name = base_code) =>
  ({ _id, item: { base_code, base: { id: base_code, name } } }) as unknown as MarketListingEntry;

const ber = { name: 'Ber Rune', codes: ['r30', 'r30s'] };
const none: DelistExemptions = { listingIds: [], exceptions: [ber], mode: 'none' };

describe('baseCodeOf', () => {
  it('takes base_code, else base.id', () => {
    expect(baseCodeOf({ base_code: 'toa', base: { id: 'x' } })).toBe('toa');
    expect(baseCodeOf({ base: { id: 'lbox' } })).toBe('lbox');
    expect(baseCodeOf({ base: null })).toBeNull();
  });
});

describe('exemptionsOf', () => {
  it('exempts no base by default', () => {
    expect(exemptionsOf({})).toEqual({ listingIds: [], exceptions: [], mode: 'none' });
    expect(exemptionsOf({ delistExceptionMode: 'stackable' }).mode).toBe('stackable');
  });
});

describe('isDelistExempt', () => {
  it('exempts a listing by id in every mode', () => {
    for (const mode of ['none', 'stackable', 'selected'] as const) {
      expect(isDelistExempt(listing('L1', 'uap'), { ...none, mode, listingIds: ['L1'] }), mode).toBe(true);
      expect(isDelistExempt(listing('L2', 'uap'), { ...none, mode, listingIds: ['L1'] }), mode).toBe(false);
    }
  });

  it('none: no base; stackable: stackable currency and picked items; selected: only picked items', () => {
    const exempt = (code: string, mode: DelistExemptions['mode']) => isDelistExempt(listing('L1', code), { ...none, mode });
    for (const code of ['toa', 'lbox', 'lpp', 'pk1', 'tes']) {
      expect(exempt(code, 'none'), code).toBe(false);
      expect(exempt(code, 'stackable'), code).toBe(true);
      expect(exempt(code, 'selected'), code).toBe(false);
    }
    expect(exempt('r30s', 'none')).toBe(false);
    expect(exempt('r30s', 'stackable')).toBe(true);
    expect(exempt('r30s', 'selected')).toBe(true);
    expect(exempt('uap', 'stackable')).toBe(false);
    expect(exempt('uap', 'selected')).toBe(false);
  });
});

describe('withoutExempt', () => {
  it('drops exempt removals, filters look-alike groups and drops emptied ones', () => {
    const shako = listing('S1', 'uap');
    const tokens = [listing('T1', 'toa'), listing('T2', 'toa')];
    const rings = [listing('R1', 'rin'), listing('R2', 'rin'), listing('R3', 'rin')];
    const result = withoutExempt(
      {
        removed: [shako, listing('T3', 'toa')],
        ambiguous: [
          { listings: tokens, count: 1 },
          { listings: rings, count: 2 },
        ],
      },
      { listingIds: ['R1', 'R2'], exceptions: [], mode: 'stackable' },
    );
    expect(result).toEqual({ removed: [shako], ambiguous: [{ listings: [rings[2]], count: 1 }] });
  });
});

describe('exception list', () => {
  it('adds once by name (merging codes) and removes by code', () => {
    let list = addDelistException([], { name: 'Token of Absolution', codes: ['toa'] });
    list = addDelistException(list, { name: 'Token of Absolution', codes: ['toa'] });
    list = addDelistException(list, { name: 'Map', codes: ['t51'] });
    list = addDelistException(list, { name: 'Map', codes: ['t52'] });
    expect(list).toEqual([
      { name: 'Token of Absolution', codes: ['toa'] },
      { name: 'Map', codes: ['t51', 't52'] },
    ]);
    expect(removeDelistException(list, ['t52'])).toEqual([{ name: 'Token of Absolution', codes: ['toa'] }]);
  });
});

describe('setListingExempt', () => {
  it('adds newest last, removes, and keeps at most EXEMPT_LISTINGS_MAX', () => {
    expect(setListingExempt(['a', 'b'], 'a', true)).toEqual(['b', 'a']);
    expect(setListingExempt(['a', 'b'], 'a', false)).toEqual(['b']);
    const full = Array.from({ length: EXEMPT_LISTINGS_MAX }, (_, i) => `id${i}`);
    const next = setListingExempt(full, 'new', true);
    expect(next).toHaveLength(EXEMPT_LISTINGS_MAX);
    expect(next[0]).toBe('id1');
    expect(next[next.length - 1]).toBe('new');
  });
});

describe('rememberException', () => {
  const token = { name: 'Token of Absolution', codes: ['toa'] };

  it('adds the item, turning the picked items on when the mode is none', () => {
    expect(rememberException({}, token)).toEqual({ delistExceptions: [token], delistExceptionMode: 'selected' });
    expect(rememberException({ delistExceptionMode: 'stackable', delistExceptions: [ber] }, token)).toEqual({
      delistExceptions: [ber, token],
    });
  });
});

describe('delistChoiceUpdate', () => {
  const token = { base_code: 'toa', base: { name: 'Token of Absolution' } };
  const tokenException = { name: 'Token of Absolution', codes: ['toa'] };

  it('exempts the listing and remembers its base (turning the picked items on)', () => {
    expect(delistChoiceUpdate({}, 'L1', token, { skip: true, remember: true })).toEqual({
      delistExemptListings: ['L1'],
      delistExceptions: [tokenException],
      delistExceptionMode: 'selected',
    });
  });

  it('undoes both when unchecked, and changes nothing that is already so', () => {
    const settings = {
      delistExemptListings: ['L1'],
      delistExceptions: [tokenException],
      delistExceptionMode: 'selected' as const,
    };
    expect(delistChoiceUpdate(settings, 'L1', token, { skip: false, remember: false })).toEqual({
      delistExemptListings: [],
      delistExceptions: [],
    });
    expect(delistChoiceUpdate(settings, 'L1', token, { skip: true, remember: true })).toBeNull();
    expect(delistChoiceUpdate(settings, 'L1', token, {})).toBeNull();
  });

  it('under none, remembering a listed base turns the list on, and not remembering leaves the list alone', () => {
    const settings = { delistExceptions: [tokenException], delistExceptionMode: 'none' as const };
    expect(delistChoiceUpdate(settings, 'L1', token, { remember: true })).toEqual({
      delistExceptions: [tokenException],
      delistExceptionMode: 'selected',
    });
    expect(delistChoiceUpdate(settings, 'L1', token, { remember: false })).toBeNull();
  });
});
