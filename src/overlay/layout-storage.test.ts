// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  LAYOUT_STORAGE_KEY,
  clampRectInto,
  clampRectVisible,
  clearPanelRect,
  loadPanelRect,
  savePanelRect,
} from './layout-storage';

const bounds = { x: 0, y: 0, width: 1920, height: 1080 };

describe('clampRectInto', () => {
  it('keeps a rect that already fits', () => {
    expect(clampRectInto({ x: 10, y: 20, width: 300, height: 200 }, bounds)).toEqual({
      x: 10,
      y: 20,
      width: 300,
      height: 200,
    });
  });

  it('pulls a rect back inside from every side', () => {
    expect(clampRectInto({ x: -50, y: -10, width: 300, height: 200 }, bounds)).toMatchObject({ x: 0, y: 0 });
    expect(clampRectInto({ x: 1800, y: 1000, width: 300, height: 200 }, bounds)).toMatchObject({ x: 1620, y: 880 });
  });

  it('shrinks a rect larger than the bounds (restored on a smaller monitor)', () => {
    expect(clampRectInto({ x: 100, y: 100, width: 2500, height: 1400 }, bounds)).toEqual(bounds);
  });

  it('respects offset bounds', () => {
    const game = { x: 100, y: 50, width: 800, height: 600 };
    expect(clampRectInto({ x: 0, y: 0, width: 200, height: 100 }, game)).toMatchObject({ x: 100, y: 50 });
  });
});

describe('clampRectVisible', () => {
  it('lets a dragged panel hang off-screen but keeps 40px inside', () => {
    expect(clampRectVisible({ x: -500, y: 0, width: 300, height: 200 }, bounds)).toMatchObject({ x: -260 });
    expect(clampRectVisible({ x: 5000, y: 0, width: 300, height: 200 }, bounds)).toMatchObject({ x: 1880 });
    expect(clampRectVisible({ x: 0, y: 5000, width: 300, height: 200 }, bounds)).toMatchObject({ y: 1040 });
  });

  it('never lets the top edge (and its drag handle) leave the overlay', () => {
    expect(clampRectVisible({ x: 0, y: -100, width: 300, height: 200 }, bounds)).toMatchObject({ y: 0 });
  });

  it('keeps the whole panel inside when it is smaller than the visible margin', () => {
    expect(clampRectVisible({ x: -100, y: 2000, width: 20, height: 20 }, bounds)).toMatchObject({ x: 0, y: 1060 });
  });

  it('does not change the size', () => {
    expect(clampRectVisible({ x: -500, y: -500, width: 300, height: 200 }, bounds)).toMatchObject({
      width: 300,
      height: 200,
    });
  });
});

describe('layout persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips rounded rects per panel', () => {
    savePanelRect('chat', { x: 10.4, y: 20.6, width: 1000, height: 700 });
    savePanelRect('settings', { x: 1, y: 2, width: 3, height: 4 });
    expect(loadPanelRect('chat')).toEqual({ x: 10, y: 21, width: 1000, height: 700 });
    expect(loadPanelRect('settings')).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    expect(loadPanelRect('currency')).toBeNull();
  });

  it('clears a single panel', () => {
    savePanelRect('chat', { x: 1, y: 2, width: 3, height: 4 });
    savePanelRect('settings', { x: 1, y: 2, width: 3, height: 4 });
    clearPanelRect('chat');
    expect(loadPanelRect('chat')).toBeNull();
    expect(loadPanelRect('settings')).not.toBeNull();
  });

  it('ignores corrupt storage and malformed entries', () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, '{not json');
    expect(loadPanelRect('chat')).toBeNull();
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ chat: { x: 1, y: 'a' }, settings: { x: 1, y: 2, width: 3, height: 4 } }),
    );
    expect(loadPanelRect('chat')).toBeNull();
    expect(loadPanelRect('settings')).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    // saving over a corrupt entry drops it
    savePanelRect('currency', { x: 0, y: 0, width: 1, height: 1 });
    expect(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)!)).not.toHaveProperty('chat');
  });
});
