import { useCallback } from 'react';
import { ISettings } from '../useOptions';
import { AuthData } from '@/common/types/pd2-website/AuthResponse';
import { fetch as tauriFetch } from '@/lib/browser-http';
import { handleApiResponse } from './usePD2Website';
import { ConversationListResponse, MessageListResponse, Message } from '@/common/types/pd2-website/ChatTypes';
import qs from 'qs';

interface UseSocialActionsProps {
  settings: ISettings;
  authData: AuthData;
  onAuthError?: () => void | Promise<void>;
}

interface UseSocialActionsReturn {
  deleteConversation: (conversationId: string) => Promise<void>;
  getConversations: (participantId: string) => Promise<ConversationListResponse>;
  getMessages: (conversationId: string) => Promise<MessageListResponse>;
  sendMessage: (conversationId: string, content: string, senderId: string) => Promise<Message>;
  markMessagesAsRead: (messageIds: string[], readerId: string) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<any>;
}

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const queryString = qs.stringify(query, { 
    arrayFormat: 'indices',
    encodeValuesOnly: true
  });
  return queryString ? `${base}?${queryString}` : base;
}

export function useSocialActions({ settings, authData, onAuthError }: UseSocialActionsProps): UseSocialActionsReturn {
  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!settings?.pd2Token) {
      throw new Error('No auth token available');
    }

    const response = await tauriFetch(`https://api.projectdiablo2.com/social/conversation/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ $archive: true })
    });
    
    await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  const getConversations = useCallback(async (participantId: string): Promise<ConversationListResponse> => {
    if (!settings?.pd2Token) {
      throw new Error('No auth token available');
    }

    const query = {
      participant_ids: participantId,
      $limit: 100,
      $skip: 0,
      $resolve: {
        participants: true,
        unreadCount: true,
        latestMessage: {
          sender: true,
        },
      },
    };

    const url = buildUrlWithQuery('https://api.projectdiablo2.com/social/conversation', query);
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      }
    });
    
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  const getMessages = useCallback(async (conversationId: string): Promise<MessageListResponse> => {
    if (!settings?.pd2Token) {
      throw new Error('No auth token available');
    }

    const query = {
      conversation_id: conversationId,
      $sort: { created_at: 1 },
      $limit: 500,
      $resolve: {
        sender: true,
      },
    };

    const url = buildUrlWithQuery('https://api.projectdiablo2.com/social/message', query);
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      }
    });
    
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  const sendMessage = useCallback(async (conversationId: string, content: string, senderId: string): Promise<Message> => {
    if (!settings?.pd2Token) {
      throw new Error('No auth token available');
    }

    const body = {
      sender_id: senderId,
      conversation_id: conversationId,
      content: content,
      reader_ids: [senderId], // The sender has read their own message
    };

    const response = await tauriFetch('https://api.projectdiablo2.com/social/message', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  const markMessagesAsRead = useCallback(async (messageIds: string[], readerId: string): Promise<void> => {
    if (!settings?.pd2Token) {
      throw new Error('No auth token available');
    }

    if (messageIds.length === 0) {
      return; // No messages to mark as read
    }

    const body = {
      $push: {
        reader_ids: readerId
      }
    };

    const query = {
      _id: {
        $in: messageIds
      }
    };

    // Build URL with query parameters
    const queryString = qs.stringify(query, { 
      arrayFormat: 'indices',
      encodeValuesOnly: true
    });
    const url = `https://api.projectdiablo2.com/social/message?${queryString}`;

    const response = await tauriFetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  const createConversation = useCallback(async (participantIds: string[]): Promise<any> => {
    if (!settings?.pd2Token) {
      throw new Error('No auth token available');
    }

    const body = {
      participant_ids: participantIds,
    };

    const response = await tauriFetch('https://api.projectdiablo2.com/social/conversation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    return await handleApiResponse(response, onAuthError);
  }, [settings, onAuthError]);

  return {
    deleteConversation,
    getConversations,
    getMessages,
    sendMessage,
    markMessagesAsRead,
    createConversation,
  };
}

