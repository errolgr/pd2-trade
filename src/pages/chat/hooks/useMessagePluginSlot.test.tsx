// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@pd2-trader/plugin-sdk';

const host = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = {
    snapshot: { plugins: [] as unknown[] },
    callSlot: vi.fn(),
  };
  return {
    state,
    pluginHost: {
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getSnapshot: () => state.snapshot,
      callSlot: (...args: unknown[]) => state.callSlot(...args),
    },
    publish: () => listeners.forEach((l) => l()),
  };
});
vi.mock('@/plugins/host/manager', () => ({ pluginHost: host.pluginHost }));

import { useMessagePluginSlot } from './useMessagePluginSlot';

const message: ChatMessage = { id: 'm1', channel: 'whisper', direction: 'in', sender: 'Bob', text: 'hi', at: '' };
const running = (id: string) => ({
  installed: { id, version: '1.0.0' },
  status: 'running',
  manifest: { slots: ['chat.decorate'] },
});

describe('useMessagePluginSlot', () => {
  beforeEach(() => {
    host.state.snapshot = { plugins: [] };
    host.state.callSlot.mockReset();
  });

  it('builds and calls nothing without a running plugin implementing the slot', () => {
    const input = vi.fn(() => message);
    const { result, unmount } = renderHook(() => useMessagePluginSlot('chat.decorate', input, 'k-none'));
    expect(result.current).toEqual([]);
    expect(input).not.toHaveBeenCalled();
    expect(host.state.callSlot).not.toHaveBeenCalled();
    unmount();
  });

  it('asks each message once: re-renders and remounts reuse the settled result', async () => {
    host.state.snapshot = { plugins: [running('tagger')] };
    host.state.callSlot.mockImplementation(() => [
      { pluginId: 'tagger', pluginName: 'Tagger', result: Promise.resolve({ tags: [{ type: 'badge', text: 'VIP' }] }) },
    ]);
    const first = renderHook(() => useMessagePluginSlot('chat.decorate', () => message, 'k1'));
    await waitFor(() => expect(first.result.current[0]).toMatchObject({ state: 'ok', value: { tags: [{ text: 'VIP' }] } }));
    first.rerender();
    first.unmount();

    const again = renderHook(() => useMessagePluginSlot('chat.decorate', () => message, 'k1'));
    expect(again.result.current[0]).toMatchObject({ state: 'ok' });
    expect(host.state.callSlot).toHaveBeenCalledTimes(1);
    expect(host.state.callSlot).toHaveBeenCalledWith('chat.decorate', message);

    // A changed plugin set asks again
    act(() => {
      host.state.snapshot = { plugins: [running('tagger'), running('other')] };
      host.publish();
    });
    await waitFor(() => expect(host.state.callSlot).toHaveBeenCalledTimes(2));
  });
});
