// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import qs from 'qs';
import { fetch as tauriFetch } from '@/lib/browser-http';
import type { ISettings } from '@/hooks/useOptions';
import { useSocialActions } from './useSocialActions';

vi.mock('@/lib/browser-http', () => ({ fetch: vi.fn() }));
vi.mock('@/lib/error-reporting', () => ({ reportApiError: vi.fn() }));

const fetchMock = vi.mocked(tauriFetch);

function fakeResponse(status: number, body: unknown, statusText = '') {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    url: 'https://api.projectdiablo2.com/social/message',
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: String(url), init: init as RequestInit & { headers: Record<string, string> } };
}

function social(token: string | undefined, onAuthError = vi.fn()) {
  const settings = { pd2Token: token } as ISettings;
  const { result } = renderHook(() => useSocialActions({ settings, authData: null, onAuthError }));
  return { actions: result.current, onAuthError };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  fetchMock.mockResolvedValue(fakeResponse(200, { data: [] }));
});

afterEach(cleanup);

describe('useSocialActions', () => {
  it('rejects every call without a network request when no pd2Token is set', async () => {
    const { actions } = social(undefined);
    await expect(actions.getConversations('u1')).rejects.toThrow('No auth token available');
    await expect(actions.getMessages('c1')).rejects.toThrow('No auth token available');
    await expect(actions.sendMessage('c1', 'hi', 'u1')).rejects.toThrow('No auth token available');
    await expect(actions.markMessagesAsRead(['m'], 'u1')).rejects.toThrow('No auth token available');
    await expect(actions.deleteConversation('c1')).rejects.toThrow('No auth token available');
    await expect(actions.createConversation(['u1'])).rejects.toThrow('No auth token available');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getConversations builds the nested $resolve query and returns the body', async () => {
    const body = { total: 1, data: [{ _id: 'c1' }] };
    fetchMock.mockResolvedValueOnce(fakeResponse(200, body));
    const { actions } = social('tok');

    await expect(actions.getConversations('u1')).resolves.toEqual(body);

    const { url, init } = lastCall();
    expect(url.split('?')[0]).toBe('https://api.projectdiablo2.com/social/conversation');
    expect(url).toContain('$resolve[latestMessage][sender]=true');
    expect(qs.parse(url.split('?')[1])).toEqual({
      participant_ids: 'u1',
      $limit: '100',
      $skip: '0',
      $resolve: { participants: 'true', unreadCount: 'true', latestMessage: { sender: 'true' } },
    });
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('getMessages requests 500 messages sorted oldest-first with senders', async () => {
    const { actions } = social('tok');
    await actions.getMessages('c1');
    const { url } = lastCall();
    expect(url.split('?')[0]).toBe('https://api.projectdiablo2.com/social/message');
    expect(qs.parse(url.split('?')[1])).toEqual({
      conversation_id: 'c1',
      $sort: { created_at: '1' },
      $limit: '500',
      $resolve: { sender: 'true' },
    });
  });

  it('sendMessage posts with the sender already in reader_ids', async () => {
    const { actions } = social('tok');
    await actions.sendMessage('c1', 'wts shako', 'u1');
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/message');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      sender_id: 'u1',
      conversation_id: 'c1',
      content: 'wts shako',
      reader_ids: ['u1'],
    });
  });

  it('markMessagesAsRead patches only the listed ids via _id[$in]', async () => {
    const { actions } = social('tok');
    await actions.markMessagesAsRead(['m1', 'm2', 'm3'], 'u9');
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/message?_id[$in][0]=m1&_id[$in][1]=m2&_id[$in][2]=m3');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ $push: { reader_ids: 'u9' } });
  });

  it('markMessagesAsRead with an empty list never issues an unfiltered PATCH', async () => {
    const { actions } = social('tok');
    await actions.markMessagesAsRead([], 'u9');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('deleteConversation archives through DELETE', async () => {
    const { actions } = social('tok');
    await actions.deleteConversation('c5');
    const { url, init } = lastCall();
    expect(url).toBe('https://api.projectdiablo2.com/social/conversation/c5');
    expect(init.method).toBe('DELETE');
    expect(JSON.parse(init.body as string)).toEqual({ $archive: true });
  });

  it('createConversation posts participants and returns the created conversation', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(201, { _id: 'new' }));
    const { actions } = social('tok');
    await expect(actions.createConversation(['u1', 'u2'])).resolves.toEqual({ _id: 'new' });
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ participant_ids: ['u1', 'u2'] });
  });

  it('on 401 triggers the auth-error handler and resolves null instead of throwing', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(401, { message: 'jwt expired' }, 'Unauthorized'));
    const { actions, onAuthError } = social('tok');
    await expect(actions.getConversations('u1')).resolves.toBeNull();
    expect(onAuthError).toHaveBeenCalledTimes(1);
  });

  it('throws API errors for other failures without calling the auth handler', async () => {
    fetchMock.mockResolvedValueOnce(fakeResponse(500, 'boom', 'Internal Server Error'));
    const { actions, onAuthError } = social('tok');
    await expect(actions.sendMessage('c1', 'x', 'u1')).rejects.toThrow('API Error: 500 Internal Server Error\nboom');
    expect(onAuthError).not.toHaveBeenCalled();
  });
});
