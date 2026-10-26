// @vitest-environment happy-dom
import { useRef } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_THREAD } from '../hooks/useChatStore';
import type { TimelineEntry } from '../lib/inbox';
import { MessageList } from './MessageList';

/**
 * A stand-in virtualizer (one instance per mounted list, like the real hook) that renders every row and
 * records where the list asks it to scroll.
 */
const virtual = vi.hoisted(() => ({ scrollToEnd: vi.fn(), scrollToIndex: vi.fn() }));
vi.mock('@tanstack/react-virtual', () => {
  return {
    useVirtualizer: (options: { count: number; getItemKey: (index: number) => string }) => {
      const instance = useRef({
        options,
        scrollToEnd: () => virtual.scrollToEnd(),
        scrollToIndex: (index: number, opts: unknown) => virtual.scrollToIndex(index, opts),
        measureElement: () => {},
        getTotalSize: () => instance.current.options.count * 50,
        getVirtualItems: () =>
          Array.from({ length: instance.current.options.count }, (_, index) => ({
            index,
            key: instance.current.options.getItemKey(index),
            start: index * 50,
          })),
      });
      instance.current.options = options;
      return instance.current;
    },
  };
});

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

const T0 = Date.parse('2026-05-01T12:00:00Z');
const entry = (key: string, minutesAgo: number, own = false, unread = false): TimelineEntry => ({
  key,
  source: 'website',
  own,
  content: key,
  createdAt: new Date(T0 - minutesAgo * 60_000).toISOString(),
  unread,
});

function renderList(entries: TimelineEntry[], unreadKey: string | null) {
  const list = (rows: TimelineEntry[]) => (
    <MessageList
      threadId="c1"
      entries={rows}
      thread={{ ...EMPTY_THREAD, loaded: true }}
      otherName="Alice"
      onOpenTrader={() => {}}
      listings={new Map()}
      unreadKey={unreadKey}
      onRetry={() => {}}
      onLoadOlder={() => {}}
      onReload={() => {}}
    />
  );
  const view = render(list(entries));
  return { rerender: (rows: TimelineEntry[]) => act(() => view.rerender(list(rows))) };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  virtual.scrollToEnd.mockClear();
  virtual.scrollToIndex.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('MessageList scrolling', () => {
  it('opens at the "New" divider, follows an own reply, and stays put when older pages load above', () => {
    const latest = [entry('a', 30), entry('b', 20, false, true), entry('c', 10, false, true)];
    const { rerender } = renderList(latest, 'b');
    expect(virtual.scrollToIndex).toHaveBeenCalledWith(1, { align: 'start' });
    expect(virtual.scrollToEnd).not.toHaveBeenCalled();

    const withReply = [...latest, entry('mine', 0, true)];
    rerender(withReply);
    expect(virtual.scrollToEnd).toHaveBeenCalledTimes(1);

    // An older page prepended: the divider's index shifts, the last (own) row stays
    rerender([entry('old1', 90), entry('old2', 80), ...withReply]);
    rerender([entry('old0', 120), entry('old1', 90), entry('old2', 80), ...withReply]);
    expect(virtual.scrollToEnd).toHaveBeenCalledTimes(1);
    expect(virtual.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('opens at the bottom without unread messages', () => {
    renderList([entry('a', 30), entry('b', 20)], null);
    expect(virtual.scrollToEnd).toHaveBeenCalledTimes(1);
    expect(virtual.scrollToIndex).not.toHaveBeenCalled();
  });
});

describe('MessageList keyboard', () => {
  it('marks the messages as a [data-keep-keyboard] region, so selecting their text keeps Ctrl+C in the overlay', () => {
    renderList([entry('hello', 10)], null);
    expect(screen.getByText('hello').closest('[data-keep-keyboard]')).not.toBeNull();
  });
});
