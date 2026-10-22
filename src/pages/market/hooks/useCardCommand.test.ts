// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCardCommand } from './useCardCommand';

describe('useCardCommand', () => {
  it('runs a hotkey once: a card remounting with the same command cannot replay it', () => {
    const { result } = renderHook(() => useCardCommand());
    act(() => result.current.issue('l1', 'favorite'));
    const command = result.current.command!;
    expect(command).toMatchObject({ id: 'l1', action: 'favorite' });

    let first = false;
    act(() => {
      first = result.current.take(command.nonce);
    });
    expect(first).toBe(true);
    // Taken commands are consumed, so a remounted card doesn't even see it again…
    expect(result.current.command).toBeNull();
    // …and one still holding the old command object (stale props, StrictMode re-run) is refused
    expect(result.current.take(command.nonce)).toBe(false);
  });

  it('a new press after a taken one runs again', () => {
    const { result } = renderHook(() => useCardCommand());
    act(() => result.current.issue('l1', 'favorite'));
    const first = result.current.command!.nonce;
    act(() => void result.current.take(first));
    act(() => result.current.issue('l1', 'favorite'));
    const second = result.current.command!.nonce;
    expect(second).toBeGreaterThan(first);
    let ran = false;
    act(() => {
      ran = result.current.take(second);
    });
    expect(ran).toBe(true);
  });
});
