// @vitest-environment happy-dom
import * as React from 'react';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogProvider, useDialog } from './useDialog';

beforeEach(() => {
  // Radix warns about the missing title/description, which callers supply in their content
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(cleanup);

function Opener() {
  const { openDialog, closeDialog } = useDialog();
  return (
    <>
      <button onClick={() => openDialog(<p>Confirm delist?</p>)}>open</button>
      <button onClick={closeDialog}>close</button>
    </>
  );
}

describe('DialogProvider', () => {
  it('shows the requested content and clears it on close', () => {
    render(
      <DialogProvider>
        <Opener />
      </DialogProvider>,
    );
    expect(screen.queryByText('Confirm delist?')).toBeNull();

    act(() => screen.getByText('open').click());
    expect(screen.queryByText('Confirm delist?')).not.toBeNull();

    act(() => screen.getByText('close').click());
    expect(screen.queryByText('Confirm delist?')).toBeNull();
  });

  it('replaces the content when opened again', () => {
    const { result } = renderHook(() => useDialog(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <DialogProvider>{children}</DialogProvider>,
    });

    act(() => result.current.openDialog(<p>First prompt</p>));
    act(() => result.current.openDialog(<p>Second prompt</p>));

    expect(screen.queryByText('First prompt')).toBeNull();
    expect(screen.queryByText('Second prompt')).not.toBeNull();
  });

  it('closes on Escape and drops the content', () => {
    const { result } = renderHook(() => useDialog(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <DialogProvider>{children}</DialogProvider>,
    });
    act(() => result.current.openDialog(<p>Escape me</p>));

    act(() => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(screen.queryByText('Escape me')).toBeNull();
  });
});

it('useDialog throws outside the provider', () => {
  expect(() => renderHook(() => useDialog())).toThrow('useDialog must be used within a DialogProvider');
});
