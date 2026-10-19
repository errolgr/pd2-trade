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

/** List/send calls resolve null on a 401 (onAuthError has started the re-auth flow). */
export interface SocialActions {
  deleteConversation: (conversationId: string) => Promise<void>;
  getConversations: (participantId: string, page?: PageParams) => Promise<ConversationListResponse | null>;
  /** One page of a thread, newest first ($sort created_at -1); `skip` counts messages newer than the page. */
  getMessages: (conversationId: string, page?: PageParams) => Promise<MessageListResponse | null>;
  sendMessage: (conversationId: string, content: string, senderId: string) => Promise<Message | null>;
  markMessagesAsRead: (messageIds: string[], readerId: string) => Promise<void>;
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
  const deleteConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!settings?.pd2Token) {
        throw new Error('No auth token available');
      }

      const response = await tauriFetch(`${API_BASE}/social/conversation/${conversationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ $archive: true }),
      });

      await handleApiResponse(response, onAuthError);
    },
    [settings, onAuthError],
  );

  const getConversations = useCallback(
    async (
      participantId: string,
      { limit = CONVERSATION_PAGE_SIZE, skip = 0 }: PageParams = {},
    ): Promise<ConversationListResponse | null> => {
      if (!settings?.pd2Token) {
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
          Authorization: `Bearer ${settings.pd2Token}`,
        },
      });

      return await handleApiResponse(response, onAuthError);
    },
    [settings, onAuthError],
  );

  const getMessages = useCallback(
    async (
      conversationId: string,
      { limit = MESSAGE_PAGE_SIZE, skip = 0 }: PageParams = {},
    ): Promise<MessageListResponse | null> => {
      if (!settings?.pd2Token) {
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
            Authorization: `Bearer ${settings.pd2Token}`,
          },
          signal: controller.signal,
        });
        return await handleApiResponse(response, onAuthError);
      } finally {
        clearTimeout(timeout);
      }
    },
    [settings, onAuthError],
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string, senderId: string): Promise<Message | null> => {
      if (!settings?.pd2Token) {
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
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return await handleApiResponse(response, onAuthError);
    },
    [settings, onAuthError],
  );

  const markMessagesAsRead = useCallback(
    async (messageIds: string[], readerId: string): Promise<void> => {
      if (!settings?.pd2Token) {
        throw new Error('No auth token available');
      }

      if (messageIds.length === 0) {
        return; // No messages to mark as read
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
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      await handleApiResponse(response, onAuthError);
    },
    [settings, onAuthError],
  );

  const createConversation = useCallback(
    async (participantIds: string[]): Promise<any> => {
      if (!settings?.pd2Token) {
        throw new Error('No auth token available');
      }

      const body = {
        participant_ids: participantIds,
      };

      const response = await tauriFetch(`${API_BASE}/social/conversation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.pd2Token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      return await handleApiResponse(response, onAuthError);
    },
    [settings, onAuthError],
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
