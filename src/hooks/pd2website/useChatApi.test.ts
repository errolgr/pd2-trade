// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import qs from 'qs';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { useChatApi } from './useChatApi';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));

const fetchMock = vi.mocked(tauriFetch);

function fakeResponse(status: number, body: unknown, statusText = '') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    url: 'https://api.projectdiablo2.com/social',
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init as RequestInit & { headers: Record<string, string> } };
}

function api(token: string | undefined) {
  return renderHook(({ t }) => useChatApi(t), { initialProps: { t: token } });
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  fetchMock.mockResolvedValue(fakeResponse(200, { data: [] }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useChatApi', () => {
  it('rejects every call without a network request when there is no access token', async () => {
    const { result } = api(undefined);
    const r = result.current;
    await expect(r.getConversations('u1')).rejects.toThrow('No auth token available');
    await expect(r.getMessages('c1')).rejects.toThrow('No auth token available');
    await expect(r.sendMessage('c1', 'hi', 'u1')).rejects.toThrow('No auth token available');
    await expect(r.markMessagesAsRead(['m1'], 'u1')).rejects.toThrow('No auth token available');
    await expect(r.deleteConversation('c1')).rejects.toThrow('No auth token available');
    await expect(r.createConversation(['u1'])).rejects.toThrow('No auth token available');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getConversations sends feathers-style nested $resolve query with bracketed literal keys', async () => {
    const payload = { total: 1, data: [{ _id: 'c1' }] };
    fetchMock.mockResolvedValueOnce(fakeResponse(200, payload));
    const { result } = api('tok-1');

    await expect(result.current.getConversations('user 1')).resolves.toEqual(payload);

    const { url, init } = lastCall();
    expect(url.startsWith('https://api.projectdiablo2.com/social/conversation?')).toBe(true);
    expect(url).toContain('$resolve[latestMessage][sender]=true');
    expect(url).toContain('participant_ids=user%201');
    expect(qs.parse(url.split('?')[1])).toEqual({
      participant_ids: 'user 1',
      $limit: '100',
      $skip: '0',
      $resolve: { participants: 'true', unreadCount: 'true', latestMessage: { sender: 'true' } },
    });
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
  });

  it('uses the latest token after it changes', async () => {
    const { result, rerender } = api('old');
    rerender({ t: 'new' });
    await result.current.getConversations('u1');
    expect(lastCall().init.headers.Authorization).toBe('Bearer new');
  });

  it('getMessages sorts ascending by created_at and resolves senders', async () => {
    const { result } = api('tok-1');
    await result.current.getMessages('c9');
    const { url, init } = lastCall();
    expect(url.startsWith('https://api.projectdiablo2.com/social/message?')).toBe(true);
    expect(qs.parse(url.split('?')[1])).toEqual({
      conversation_id: 'c9',
      $sort: { created_at: '1' },
      $limit: '500',
      $resolve: { sender: 'true' },
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('getMessages aborts the request after 15s', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_url, init) => {
      const { promise, reject } = Promise.withResolvers<Response>();
      init!.signal!.addEventListener('abort', () => reject(new Error('aborted')));
      return promise;
    });
    const { result } = api('tok-1');
    const pending = result.current.getMessages('c1');
    const assertion = expect(pending).rejects.toThrow('aborted');

    await vi.advanceTimersByTimeAsync(14_999);
    expect(lastCall().init.signal!.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it('getMessages clears its abort timer once the response arrives', async () => {
    vi.useFakeTimers();
    const { result } = api('tok-1');
    await result.current.getMessages('c1');
    expect(vi.getTimerCount()).toBe(0);
    expect(lastCall().init.signal!.aborted).toBe(false);
  });

  it('sendMessage posts JSON with the sender pre-marked as reader', async () => {
    const msg = { _id: 'm1', content: 'hi' };
    fetchMock.mockResolvedValueOnce(fakeResponse(201, msg));
    const { result } = api('tok-1');

    await expect(result.current.sendMessage('c1', 'hi', 'u1')).resolves.toEqual(msg);

    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/message');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      sender_id: 'u1',
      conversation_id: 'c1',
      content: 'hi',
      reader_ids: ['u1'],
    });
  });

  it('markMessagesAsRead patches by _id[$in][i] and pushes the reader', async () => {
    const { result } = api('tok-1');
    await result.current.markMessagesAsRead(['a', 'b'], 'u1');
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/message?_id[$in][0]=a&_id[$in][1]=b');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ $push: { reader_ids: 'u1' } });
  });

  it('markMessagesAsRead with no ids is a no-op (never patches every message)', async () => {
    const { result } = api('tok-1');
    await result.current.markMessagesAsRead([], 'u1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deleteConversation archives via DELETE on the conversation id', async () => {
    const { result } = api('tok-1');
    await result.current.deleteConversation('c7');
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/conversation/c7');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ $archive: true });
  });

  it('createConversation posts the participant ids', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(201, { _id: 'c2' }));
    const { result } = api('tok-1');
    await expect(result.current.createConversation(['u1', 'u2'])).resolves.toEqual({ _id: 'c2' });
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/conversation');
    expect(JSON.parse(init.body as string)).toEqual({ participant_ids: ['u1', 'u2'] });
  });

  it('surfaces status, statusText and body of non-OK responses', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(403, 'forbidden!', 'Forbidden'));
    const { result } = api('tok-1');
    await expect(result.current.sendMessage('c1', 'x', 'u1')).rejects.toThrow('API Error: 403 Forbidden\nforbidden!');
  });

  it('omits the body separator when the error body is empty', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(500, '', 'Server Error'));
    const { result } = api('tok-1');
    await expect(result.current.deleteConversation('c1')).rejects.toThrow(/^API Error: 500 Server Error$/);
  });

  it('propagates network errors from getMessages', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const { result } = api('tok-1');
    await expect(result.current.getMessages('c1')).rejects.toThrow('offline');
  });
});
