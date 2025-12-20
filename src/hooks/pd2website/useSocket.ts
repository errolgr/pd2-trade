import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { ConversationListResponse, MessageListResponse } from '@/common/types/pd2-website/ChatTypes';
import { useOptions } from '../useOptions';
import { emit } from '@/lib/browser-events';
import { ISettings } from '../useOptions';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  service: string;
  method: string;
}

interface UseSocketProps {
  settings?: ISettings;
}

export const useSocket = (props?: UseSocketProps) => {
  // Use props if provided, otherwise fall back to hooks
  const contextSettings = useOptions().settings;

  const settings = props?.settings ?? contextSettings;
  const socketRef = useRef<Socket | null>(null);
  const rawSocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingRequestsRef = useRef<PendingRequest[]>([]);

  useEffect(() => {
    if (!settings?.pd2Token) {
      return;
    }

    // Connect to Socket.IO server
    const socket = io('wss://api.projectdiablo2.com', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Message handler for raw socket
    const messageHandler = (event: MessageEvent) => {
      const data = event.data;

      if (typeof data === 'string') {
        // Extract code and payload using regex
        const match = data.match(/^(\d+)(.+)$/);

        if (match) {
          const code = match[1];
          const payload = match[2];

          try {
            const parsedPayload = JSON.parse(payload);

            // Handle auth response
            if (
              Array.isArray(parsedPayload) &&
              parsedPayload.length === 2 &&
              parsedPayload[1] &&
              typeof parsedPayload[1] === 'object' &&
              'accessToken' in parsedPayload[1] &&
              'user' in parsedPayload[1]
            ) {
              console.log('[Socket] Authenticated');
              // Auth is handled by usePD2Website, so we just log it here
              return; // Don't process auth response as a regular request response
            }

            // Handle push events (like "social/message pushed")
            if (Array.isArray(parsedPayload) && parsedPayload.length === 2) {
              const eventType = parsedPayload[0];
              const eventData = parsedPayload[1];

              // Check if this is a push event
              if (typeof eventType === 'string' && eventType.includes('pushed')) {
                // Emit a custom event for push notifications
                // Replace spaces and special chars with underscores for Tauri compatibility
                const sanitizedEventType = eventType.replace(/[^a-zA-Z0-9\-/:_]/g, '_');
                emit(`socket:${sanitizedEventType}`, eventData).catch((err) => {
                  console.error('[Socket] Failed to emit push event:', err);
                });
                return; // Don't process push events as request responses
              }

              // Handle other responses - match to pending requests
              // Match responses to requests in order (FIFO queue)
              // This works because responses typically come back in the same order as requests
              if (pendingRequestsRef.current.length > 0) {
                const pendingRequest = pendingRequestsRef.current.shift()!;
                clearTimeout(pendingRequest.timeout);

                // Check if response has error
                if (parsedPayload[0] !== null) {
                  pendingRequest.reject(new Error(parsedPayload[0].toString()));
                } else {
                  pendingRequest.resolve(parsedPayload[1]);
                }
              } else {
                console.warn('[Socket] Received response but no pending requests');
              }
            }
          } catch (err) {
            console.error('[Socket] Failed to parse payload:', err);
          }
        }
      }
    };

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);

      // Get raw WebSocket and authenticate
      const rawSocket = socket.io.engine.transport.ws;
      rawSocketRef.current = rawSocket;

      // Authenticate using raw socket
      rawSocket.send(
        '420' +
          JSON.stringify([
            'create',
            'security/session',
            {
              strategy: 'jwt',
              accessToken: settings.pd2Token,
            },
          ]),
      );

      rawSocket.addEventListener('message', messageHandler);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
      rawSocketRef.current = null;

      // Reject all pending requests
      while (pendingRequestsRef.current.length > 0) {
        const pendingRequest = pendingRequestsRef.current.shift()!;
        clearTimeout(pendingRequest.timeout);
        pendingRequest.reject(new Error('Socket disconnected'));
      }
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
      setError(err.message);
      setIsConnected(false);
    });

    return () => {
      // Remove message handler
      if (rawSocketRef.current) {
        rawSocketRef.current.removeEventListener('message', messageHandler);
      }

      socket.disconnect();
      socketRef.current = null;
      rawSocketRef.current = null;

      // Reject all pending requests
      while (pendingRequestsRef.current.length > 0) {
        const pendingRequest = pendingRequestsRef.current.shift()!;
        clearTimeout(pendingRequest.timeout);
        pendingRequest.reject(new Error('Socket cleanup'));
      }
    };
  }, [settings?.pd2Token]);

  const sendSocketMessage = useCallback(
    <T>(method: string, service: string, query: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!rawSocketRef.current || !isConnected) {
          reject(new Error('Socket not connected'));
          return;
        }

        const message = [method, service, query];

        const timeout = setTimeout(() => {
          // Remove this request from the queue
          const index = pendingRequestsRef.current.findIndex((req) => req.timeout === timeout);
          if (index !== -1) {
            pendingRequestsRef.current.splice(index, 1);
          }
          reject(new Error('Socket request timeout'));
        }, 10000);

        // Store the pending request in queue (FIFO)
        pendingRequestsRef.current.push({
          resolve: (data: any) => {
            // Response format is [null, data] or [error, null]
            if (data === null) {
              reject(new Error('Empty response'));
            } else {
              resolve(data as T);
            }
          },
          reject,
          timeout,
          service,
          method,
        });

        // Send message using raw socket with code '420'
        try {
          rawSocketRef.current.send('420' + JSON.stringify(message));
        } catch (err) {
          // Remove this request from the queue
          const index = pendingRequestsRef.current.findIndex((req) => req.timeout === timeout);
          if (index !== -1) {
            pendingRequestsRef.current.splice(index, 1);
          }
          clearTimeout(timeout);
          reject(new Error(`Failed to send message: ${err}`));
        }
      });
    },
    [isConnected],
  );

  const getConversations = useCallback(
    async (participantId: string): Promise<ConversationListResponse> => {
      if (!isConnected) {
        throw new Error('Socket not connected');
      }

      // sendSocketMessage already unwraps the [null, data] format and returns just the data
      const response = await sendSocketMessage<ConversationListResponse>('find', 'social/conversation', {
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
      });

      return response;
    },
    [sendSocketMessage, isConnected],
  );

  const getMessages = useCallback(
    async (conversationId: string): Promise<MessageListResponse> => {
      if (!isConnected) {
        throw new Error('Socket not connected');
      }

      // sendSocketMessage already unwraps the [null, data] format and returns just the data
      const response = await sendSocketMessage<MessageListResponse>('find', 'social/message', {
        conversation_id: conversationId,
        $sort: { created_at: 1 },
        $limit: 500,
        $resolve: {
          sender: true,
        },
      });

      return response;
    },
    [sendSocketMessage, isConnected],
  );

  return {
    isConnected,
    error,
    getConversations,
    getMessages,
    getSocket: () => socketRef.current,
  };
};
