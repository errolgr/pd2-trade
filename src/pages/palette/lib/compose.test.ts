import { describe, expect, it } from 'vitest';
import {
  PALETTE_RECENTS_MAX,
  PALETTE_RECENTS_SHOWN,
  boostRecents,
  pushRecent,
  refsForGroup,
  shownRecents,
  tabScope,
  togglePin,
} from './compose';
import { matchTier } from './match';
import type { PaletteGroupId, PaletteItem, PaletteRef } from './types';

const ref = (id: string): PaletteRef => ({ id, group: id.split(':')[0] as PaletteGroupId, title: id });
const item = (id: string): PaletteItem => ({ ref: ref(id), primary: { id: 'run', label: id, run: () => {} } });
const ids = (list: { ref?: PaletteRef; id?: string }[]) => list.map((x) => x.ref?.id ?? x.id);

const LABELS: Record<PaletteGroupId, string> = {
  actions: 'Actions',
  items: 'Items',
  builds: 'Builds',
  chat: 'Chat',
  listings: 'Listings',
  settings: 'Settings',
};

describe('recents', () => {
  it('moves a re-picked result to the front once and caps the list', () => {
    const many = Array.from({ length: PALETTE_RECENTS_MAX }, (_, i) => ref(`items:${i}`));
    const next = pushRecent(many, ref('items:5'));
    expect(next[0].id).toBe('items:5');
    expect(next.filter((r) => r.id === 'items:5')).toHaveLength(1);
    expect(next).toHaveLength(PALETTE_RECENTS_MAX);

    const grown = pushRecent(many, ref('builds:new'));
    expect(grown).toHaveLength(PALETTE_RECENTS_MAX);
    expect(grown.at(-1)?.id).toBe(`items:${PALETTE_RECENTS_MAX - 2}`);
  });

  it('shows recents without the pinned ones, newest first, capped', () => {
    const pins = [ref('actions:market')];
    const recents = [ref('actions:market'), ...Array.from({ length: 10 }, (_, i) => ref(`items:${i}`))];
    const shown = shownRecents(pins, recents);
    expect(shown[0].id).toBe('items:0');
    expect(shown).toHaveLength(PALETTE_RECENTS_SHOWN);
  });

  it('hands each group only its own pins and shown recents', () => {
    const pins = [ref('actions:market'), ref('builds:character:a')];
    const recents = [ref('items:shako'), ref('builds:character:b'), ref('builds:character:a')];
    expect(ids(refsForGroup(pins, recents, 'builds'))).toEqual(['builds:character:a', 'builds:character:b']);
    expect(ids(refsForGroup(pins, recents, 'chat'))).toEqual([]);
  });
});

describe('pins', () => {
  it('toggles a pin on and off', () => {
    const pinned = togglePin([ref('actions:market')], ref('items:shako'));
    expect(ids(pinned)).toEqual(['actions:market', 'items:shako']);
    expect(ids(togglePin(pinned, ref('items:shako')))).toEqual(['actions:market']);
  });
});

describe('boostRecents', () => {
  it('puts recently picked results first by recency and keeps the source order for the rest', () => {
    const items = ['items:a', 'items:b', 'items:c', 'items:d'].map(item);
    const recents = [ref('items:d'), ref('chat:x'), ref('items:b')];
    expect(ids(boostRecents(items, recents, 10))).toEqual(['items:d', 'items:b', 'items:a', 'items:c']);
  });

  it('caps after boosting, so a recent result past the limit still shows', () => {
    const items = ['items:a', 'items:b', 'items:c'].map(item);
    expect(ids(boostRecents(items, [ref('items:c')], 2))).toEqual(['items:c', 'items:a']);
  });
});

describe('tabScope', () => {
  it('scopes to the group a query starts naming, clearing the query', () => {
    expect(tabScope('set', LABELS, 'items')).toEqual({ scope: { group: 'settings' }, keepQuery: false });
  });

  it('matches the translated group name too', () => {
    expect(tabScope('obj', { ...LABELS, items: 'Objets' }, null)).toEqual({
      scope: { group: 'items' },
      keepQuery: false,
    });
  });

  it("otherwise scopes to the highlighted row's group and keeps the query", () => {
    expect(tabScope('sha', LABELS, 'items')).toEqual({ scope: { group: 'items' }, keepQuery: true });
    expect(tabScope('sha', LABELS, null)).toBeNull();
  });
});

describe('matchTier', () => {
  it('ranks equal > prefix > word start > substring', () => {
    expect(matchTier('Market', 'market')).toBe(4);
    expect(matchTier('Market', 'mar')).toBe(3);
    expect(matchTier('Take net worth snapshot', 'wor')).toBe(2);
    expect(matchTier('Harlequin Crest', 'quin')).toBe(1);
    expect(matchTier('Harlequin Crest', 'zzz')).toBe(0);
  });

  it('finds a word start after an earlier mid-word occurrence', () => {
    expect(matchTier('Shadow Shako', 'sha')).toBe(3);
    expect(matchTier('Rashad Shako', 'sha')).toBe(2);
  });
});
