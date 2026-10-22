// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { PANEL_DEFS } from './registry';
import { isPanelVisible, type PanelState } from './OverlayProvider';

const open = { open: true, placing: false } as PanelState;

describe('PANEL_DEFS', () => {
  it.each([
    ['Settings', 'settings'],
    ["What's New", 'changeLog'],
  ] as const)('shows %s outside the game, and closes it when the user leaves it', (_name, id) => {
    expect(isPanelVisible(PANEL_DEFS[id], open, false)).toBe(true);
    expect(PANEL_DEFS[id].closeOnBlur).toBe(true);
  });

  it('opens the market browser large in the screen center, resizable, remembered and kept mounted', () => {
    expect(PANEL_DEFS.market).toMatchObject({
      size: { width: 1400, height: 860 },
      resizable: true,
      placement: 'screenCenter',
      persist: true,
      keepMounted: true,
      hideOnGameBlur: true,
      closeOnBlur: true,
    });
  });
});
