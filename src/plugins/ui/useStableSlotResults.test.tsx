// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SlotResult } from './hooks';
import { useStableSlotResults } from './useStableSlotResults';

type R = SlotResult<'ticker.widget'>;
const ok = (text: string): R => ({ pluginId: 'p', pluginName: 'P', state: 'ok', value: [{ type: 'text', text }] });
const loading: R = { pluginId: 'p', pluginName: 'P', state: 'loading' };

describe('useStableSlotResults', () => {
  it('shows the previous value while a plugin is asked again; errors and new values replace it', () => {
    const { result, rerender, unmount } = renderHook(({ results }: { results: R[] }) => useStableSlotResults(results), {
      initialProps: { results: [loading] },
    });
    expect(result.current).toEqual([loading]);

    rerender({ results: [ok('1')] });
    expect(result.current).toEqual([ok('1')]);

    rerender({ results: [loading] });
    expect(result.current).toEqual([ok('1')]);

    rerender({ results: [ok('2')] });
    expect(result.current).toEqual([ok('2')]);

    const error: R = { pluginId: 'p', pluginName: 'P', state: 'error', error: 'boom' };
    rerender({ results: [error] });
    expect(result.current).toEqual([error]);

    rerender({ results: [loading] });
    expect(result.current).toEqual([loading]);
    unmount();
  });
});
