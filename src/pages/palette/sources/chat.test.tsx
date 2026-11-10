// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { chatThreadEntries, publishChatThreads, resetChatThreads } from '@/pages/chat/chat-threads';
import type { InboxThread } from '@/pages/chat/lib/inbox';
import type { PaletteRunContext, PaletteSourceInput } from '../lib/types';
import { chatRef, rankThreads, resolveThreadRefs, useChatSource } from './chat';

vi.mock('@/hooks/pd2website/usePD2Website', () => ({ usePd2Website: vi.fn() }));

function thread(id: string, name: string, over: Partial<InboxThread> = {}): InboxThread {
  return {
    id,
    name,
    people: [],
    offers: [],
    accounts: [],
    unread: 0,
    selling: false,
    buying: false,
    pinned: false,
    muted: false,
    archived: false,
    ...over,
  };
}

const THREADS = [
  thread('c1', 'Kebob'),
  thread('c2', 'Bob', { unread: 2, latest: { text: 'still selling?', at: 0, own: false, source: 'website' } }),
  thread('whisper:lumberjack', 'lumberjack', {
    people: [{ key: 'lumberjack', playerName: 'lumberjack', characterName: 'BobTheHammerdin', messages: [], trades: [], readAt: 0 }],
  }),
  thread('c3', 'Sir Bobbington', { participant: { _id: 'u3', username: 'sirb', created_at: '' } }),
];
const entries = chatThreadEntries(THREADS);

const input = (over: Partial<PaletteSourceInput> = {}): PaletteSourceInput => ({
  query: '',
  scope: null,
  limit: 5,
  refs: [],
  ...over,
});
const context = () => ({ openPanel: vi.fn(), close: vi.fn(), scope: vi.fn() }) satisfies PaletteRunContext;

beforeEach(() => {
  resetChatThreads();
  vi.mocked(usePd2Website).mockReturnValue({ authData: { accessToken: 'token' } } as never);
});
afterEach(cleanup);

describe('rankThreads', () => {
  it('ranks a name prefix over a word start over a substring, the inbox order within a tier', () => {
    const ranked = rankThreads(entries, 'bob', 10);
    // Bob (equal), BobTheHammerdin (lumberjack's character, prefix), Sir Bobbington (word start), Kebob (contains)
    expect(ranked.map((r) => r.thread.id)).toEqual(['c2', 'whisper:lumberjack', 'c3', 'c1']);
    expect(ranked[1].matched).toBe('BobTheHammerdin');
    expect(ranked[0].matched).toBeUndefined();
  });

  it('matches the website username and caps at the limit', () => {
    expect(rankThreads(entries, 'sirb', 10).map((r) => r.thread.id)).toEqual(['c3']);
    expect(rankThreads(entries, 'b', 2)).toHaveLength(2);
    expect(rankThreads(entries, 'zzz', 10)).toEqual([]);
  });
});

describe('resolveThreadRefs', () => {
  it('finds threads by any id they are known by and drops refs to vanished ones', () => {
    const refs = [
      { ...chatRef(entries[1]) },
      { id: 'chat:gone', group: 'chat' as const, title: 'Gone', data: { threadId: 'gone' } },
      // A whisper thread that has since merged into a website conversation keeps its old id as an alias
      { id: 'chat:whisper:lumberjack', group: 'chat' as const, title: 'lumberjack', data: { threadId: 'whisper:lumberjack' } },
    ];
    const merged = chatThreadEntries([
      THREADS[1],
      thread('c9', 'Lumber', { people: THREADS[2].people, participant: { _id: 'u9', username: 'Lumber', created_at: '' } }),
    ]);
    expect(resolveThreadRefs(merged, refs).map((t) => t.id)).toEqual(['c2', 'c9']);
  });
});

describe('useChatSource', () => {
  it('is signed out without a PD2 token, with no items', () => {
    vi.mocked(usePd2Website).mockReturnValue({ authData: null } as never);
    act(() => publishChatThreads(THREADS));
    const { result } = renderHook(() => useChatSource(input({ query: 'bob' })));
    expect(result.current).toEqual({ items: [], loading: false, signedOut: true });
  });

  it('lists the published threads a query matches; Enter opens the thread focused', () => {
    act(() => publishChatThreads(THREADS));
    const { result } = renderHook(() => useChatSource(input({ query: 'keb' })));
    const [item] = result.current.items;
    expect(item.ref).toEqual({ id: 'chat:c1', group: 'chat', title: 'Kebob', data: { threadId: 'c1' } });
    const ctx = context();
    void item.primary.run(ctx);
    expect(ctx.openPanel).toHaveBeenCalledWith('chat', { threadId: 'c1' }, { focus: true });
    void item.actions!.find((a) => a.id === 'reply')!.run(ctx);
    expect(ctx.openPanel).toHaveBeenLastCalledWith('chat', { threadId: 'c1', reply: true }, { focus: true });
    void item.actions!.find((a) => a.id === 'trader')!.run(ctx);
    expect(ctx.openPanel).toHaveBeenLastCalledWith('chat', { threadId: 'c1', trader: true }, { focus: true });
  });

  it('resolves recents on the empty query, dropping those whose thread is gone', () => {
    act(() => publishChatThreads(THREADS));
    const refs = [chatRef(entries[3]), { id: 'chat:gone', group: 'chat' as const, title: 'x', data: { threadId: 'gone' } }];
    const { result } = renderHook(() => useChatSource(input({ refs })));
    expect(result.current.items.map((i) => i.ref.id)).toEqual(['chat:c3']);
  });
});
