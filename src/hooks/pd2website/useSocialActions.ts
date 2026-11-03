import { useCallback } from 'react';
import { ISettings } from '../useOptions';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { handleApiResponse } from './usePD2Website';
import { ConversationListResponse, MessageListResponse, Message } from '@/common/types/pd2-website/ChatTypes';
import qs from 'qs';

const API_BASE = 'https://api.projectdiablo2.com';
/** Conversations per request (the server's page cap). */
export const CONVERSATION_PAGE_SIZE = 100;
/** Messages per request: a thread opens on its newest page and loads older pages on scroll. */
export const MESSAGE_PAGE_SIZE = 50;
const GET_MESSAGES_TIMEOUT_MS = 15_000;

export interface PageParams {
  limit?: number;
  skip?: number;
}

interface UseSocialActionsProps {
  settings: ISettings;
  onAuthError?: () => void | Promise<void>;
}

/**
 * List/send calls resolve null, and delete/mark-read resolve false, on a 401 (onAuthError has started the
 * re-auth flow; nothing changed server-side). sendMessage also resolves null when PD2 refuses the message (403, e.g.
 * the recipient blocked the user); markMessagesAsRead resolves false when the messages are gone (404).
 */
export interface SocialActions {
  deleteConversation: (conversationId: string) => Promise<boolean>;
  getConversations: (participantId: string, page?: PageParams) => Promise<ConversationListResponse | null>;
  /** One page of a thread, newest first ($sort created_at -1); `skip` counts messages newer than the page. */
  getMessages: (conversationId: string, page?: PageParams) => Promise<MessageListResponse | null>;
  sendMessage: (conversationId: string, content: string, senderId: string) => Promise<Message | null>;
  markMessagesAsRead: (messageIds: string[], readerId: string) => Promise<boolean>;
  createConversation: (participantIds: string[]) => Promise<any>;
}

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = qs.stringify(query, {
    arrayFormat: 'indices',
    encodeValuesOnly: true,
  });
  return queryString ? `${base}?${queryString}` : base;
}

export function useSocialActions({ settings, onAuthError }: UseSocialActionsProps): SocialActions {
  // Callbacks change with the token only: other settings changes must not refetch chat or resubscribe
  const token = settings?.pd2Token;
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<boolean> => {
      if (!token) {
        throw new Error('No auth token available');
      }

      const response = await tauriFetch(`${API_BASE}/social/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ $archive: true }),
      });

      // Already gone (deleted elsewhere, or an earlier attempt that went through): what the user asked for
      if (response.status === 404) return true;
      return (await handleApiResponse(response, onAuthError)) !== null;
    },
    [token, onAuthError],
  );

  const getConversations = useCallback(
    async (
      participantId: string,
      { limit = CONVERSATION_PAGE_SIZE, skip = 0 }: PageParams = {},
    ): Promise<ConversationListResponse | null> => {
      if (!token) {
        throw new Error('No auth token available');
      }

      const query = {
        participant_ids: participantId,
        $limit: limit,
        $skip: skip,
        $resolve: {
          participants: true,
          unreadCount: true,
          latestMessage: {
            sender: true,
          },
        },
      };

      const url = buildUrlWithQuery(`${API_BASE}/social/conversation`, query);
      const response = await tauriFetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return await handleApiResponse(response, onAuthError);
    },
    [token, onAuthError],
  );

  const getMessages = useCallback(
    async (
      conversationId: string,
      { limit = MESSAGE_PAGE_SIZE, skip = 0 }: PageParams = {},
    ): Promise<MessageListResponse | null> => {
      if (!token) {
        throw new Error('No auth token available');
      }

      const query = {
        conversation_id: conversationId,
        $sort: { created_at: -1 },
        $limit: limit,
        $skip: skip,
        $resolve: {
          sender: true,
        },
      };

      const url = buildUrlWithQuery(`${API_BASE}/social/message`, query);
      // A hung request would leave the thread on its loading state forever
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GET_MESSAGES_TIMEOUT_MS);
      try {
        const response = await tauriFetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        return await handleApiResponse(response, onAuthError);
      } finally {
        clearTimeout(timeout);
      }
    },
    [token, onAuthError],
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string, senderId: string): Promise<Message | null> => {
      if (!token) {
        throw new Error('No auth token available');
      }

      const body = {
        sender_id: senderId,
        conversation_id: conversationId,
        content: content,
        reader_ids: [senderId], // The sender has read their own message
      };

      const response = await tauriFetch(`${API_BASE}/social/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 403) {
        // PD2 refuses the message (e.g. "Blocked": the recipient blocked this user); the bubble shows it as failed
        console.warn('[Chat] Message refused (403):', await response.text().catch(() => ''));
        return null;
      }
      return await handleApiResponse(response, onAuthError);
    },
    [token, onAuthError],
  );

  const markMessagesAsRead = useCallback(
    async (messageIds: string[], readerId: string): Promise<boolean> => {
      if (!token) {
        throw new Error('No auth token available');
      }

      if (messageIds.length === 0) {
        return true; // No messages to mark as read
      }

      const body = {
        $push: {
          reader_ids: readerId,
        },
      };

      const query = {
        _id: {
          $in: messageIds,
        },
      };

      // Build URL with query parameters
      const queryString = qs.stringify(query, {
        arrayFormat: 'indices',
        encodeValuesOnly: true,
      });
      const url = `${API_BASE}/social/message?${queryString}`;

      const response = await tauriFetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // The messages are gone (conversation deleted): nothing to mark
      if (response.status === 404) return false;
      return (await handleApiResponse(response, onAuthError)) !== null;
    },
    [token, onAuthError],
  );

  const createConversation = useCallback(
    async (participantIds: string[]): Promise<any> => {
      if (!token) {
        throw new Error('No auth token available');
      }

      const body = {
        participant_ids: participantIds,
      };

      const response = await tauriFetch(`${API_BASE}/social/conversation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return await handleApiResponse(response, onAuthError);
    },
    [token, onAuthError],
  );

  return {
    deleteConversation,
    getConversations,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    createConversation,
  };
}
