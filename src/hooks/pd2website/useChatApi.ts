import { useCallback } from 'react';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { ConversationListResponse, MessageListResponse, Message } from '@/common/types/pd2-website/ChatTypes';
import qs from 'qs';

const API_BASE = 'https://api.projectdiablo2.com';

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = qs.stringify(query, {
    arrayFormat: 'indices',
    encodeValuesOnly: true,
  });
  return queryString ? `${base}?${queryString}` : base;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`);
  }
  return response.json();
}

export function useChatApi(accessToken: string | undefined) {
  const getConversations = useCallback(
    async (participantId: string): Promise<ConversationListResponse> => {
      if (!accessToken) throw new Error('No auth token available');

      const query = {
        participant_ids: participantId,
        $limit: 100,
        $skip: 0,
        $resolve: {
          participants: true,
          unreadCount: true,
          latestMessage: { sender: true },
        },
      };

      const url = buildUrlWithQuery(`${API_BASE}/social/conversation`, query);
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return handleResponse<ConversationListResponse>(response);
    },
    [accessToken],
  );

  const getMessages = useCallback(
    async (conversationId: string): Promise<MessageListResponse> => {
      if (!accessToken) throw new Error('No auth token available');

      const query = {
        conversation_id: conversationId,
        $sort: { created_at: 1 },
        $limit: 500,
        $resolve: { sender: true },
      };

      const url = buildUrlWithQuery(`${API_BASE}/social/message`, query);
      console.log('[useChatApi] getMessages URL:', url);

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.error('[useChatApi] getMessages TIMED OUT after 15s');
        controller.abort();
      }, 15000);

      try {
        const response = await tauriFetch(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        console.log('[useChatApi] getMessages response status:', response.status);
        return handleResponse<MessageListResponse>(response);
      } catch (err) {
        clearTimeout(timeout);
        console.error('[useChatApi] getMessages error:', err);
        throw err;
      }
    },
    [accessToken],
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string, senderId: string): Promise<Message> => {
      if (!accessToken) throw new Error('No auth token available');

      const body = {
        sender_id: senderId,
        conversation_id: conversationId,
        content,
        reader_ids: [senderId],
      };

      const response = await tauriFetch(`${API_BASE}/social/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return handleResponse<Message>(response);
    },
    [accessToken],
  );

  const markMessagesAsRead = useCallback(
    async (messageIds: string[], readerId: string): Promise<void> => {
      if (!accessToken) throw new Error('No auth token available');
      if (messageIds.length === 0) return;

      const body = { $push: { reader_ids: readerId } };
      const query = { _id: { $in: messageIds } };
      const queryString = qs.stringify(query, { arrayFormat: 'indices', encodeValuesOnly: true });
      const url = `${API_BASE}/social/message?${queryString}`;

      const response = await tauriFetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      await handleResponse<any>(response);
    },
    [accessToken],
  );

  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!accessToken) throw new Error('No auth token available');

      const response = await tauriFetch(`${API_BASE}/social/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ $archive: true }),
      });

      await handleResponse<any>(response);
    },
    [accessToken],
  );

  const createConversation = useCallback(
    async (participantIds: string[]): Promise<any> => {
      if (!accessToken) throw new Error('No auth token available');

      const body = { participant_ids: participantIds };

      const response = await tauriFetch(`${API_BASE}/social/conversation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return handleResponse<any>(response);
    },
    [accessToken],
  );

  return {
    getConversations,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    deleteConversation,
    createConversation,
  };
}
