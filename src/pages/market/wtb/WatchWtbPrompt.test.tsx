// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type ISettings, useOptions } from '@/hooks/useOptions';
import { createOptionsStore } from '@/components/dialogs/optionsv2/test-utils';
import { defaultFilters } from '../lib/defaults';
import { useWatchWtbPrompt } from './WatchWtbPrompt';

vi.mock('@/hooks/useOptions', () => ({ useOptions: vi.fn() }));

const shako = () => ({ ...defaultFilters({ hardcore: false, ladder: true }), itemName: 'Harlequin Crest' });

function renderPrompt(settings: Partial<ISettings>, signedIn = true) {
  const store = createOptionsStore(settings);
  vi.mocked(useOptions).mockImplementation(store.useOptions);
  const { result } = renderHook(() => useWatchWtbPrompt({ signedIn, posting: false, mine: [], onPost: vi.fn() }));
  return { result, store };
}

describe('useWatchWtbPrompt', () => {
  it('offers by default (no setting saved yet), and only signed in', () => {
    expect(renderPrompt({}).result.current.offer(shako())).toBe(true);
    expect(renderPrompt({ marketWtbPromptEnabled: true }).result.current.offer(shako())).toBe(true);
    expect(renderPrompt({}, false).result.current.offer(shako())).toBe(false);
  });

  it("Don't ask again saves the setting off, and it stops offering", async () => {
    const { result, store } = renderPrompt({});
    await act(async () => result.current.onNever());
    expect(store.updateSettings).toHaveBeenCalledWith({ marketWtbPromptEnabled: false });
    expect(result.current.offer(shako())).toBe(false);
  });
});
