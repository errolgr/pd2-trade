import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useOptions } from '../useOptions';
import { ISettings } from '../useOptions';

interface UseSocketProps {
  settings?: ISettings;
}

export type SocketPushHandler<T = unknown> = (data: T) => void;
/**
 * Subscribe to server push events of this socket. `type` is the server event type with every character
 * outside [a-zA-Z0-9-/:_] replaced by '_' (e.g. 'social/message pushed' -> 'social/message_pushed').
 * Returns the unsubscribe function.
 */
export type SubscribeSocket = <T = unknown>(type: string, handler: SocketPushHandler<T>) => () => void;

/** The PD2 socket carries server pushes only; requests go through the REST clients (useSocialActions etc.). */
export const useSocket = (props?: UseSocketProps) => {
  // Use props if provided, otherwise fall back to hooks
  const contextSettings = useOptions().settings;

  const settings = props?.settings ?? contextSettings;
  const socketRef = useRef<Socket | null>(null);
  const rawSocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribersRef = useRef(new Map<string, Set<SocketPushHandler>>());

  useEffect(() => {
    if (!settings?.pd2Token) {
      return;
    }

    // Connect to Socket.IO server
    const socket = io('wss://api.projectdiablo2.com', {
      transports: ['websocket'],
      timeout: 20000, // 20 seconds timeout
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Message handler for raw socket
    const messageHandler = (event: MessageEvent) => {
      const data = event.data;
      if (typeof data !== 'string') return;

      // Engine.io/socket.io frames are a numeric code followed by a JSON payload
      const match = data.match(/^\d+(.+)$/);
      if (!match) return;

      try {
        const parsedPayload = JSON.parse(match[1]);
        if (!Array.isArray(parsedPayload) || parsedPayload.length !== 2) return;

        // Auth response (auth is handled by usePD2Website, so we just log it here)
        const [eventType, eventData] = parsedPayload;
        if (eventData && typeof eventData === 'object' && 'accessToken' in eventData && 'user' in eventData) {
          console.log('[Socket] Authenticated');
          return;
        }

        // Push events (like "social/message pushed")
        if (typeof eventType === 'string' && eventType.includes('pushed')) {
          const pushType = eventType.replace(/[^a-zA-Z0-9\-/:_]/g, '_');
          subscribersRef.current.get(pushType)?.forEach((handler) => {
            try {
              handler(eventData);
            } catch (err) {
              console.error(`[Socket] Push handler for ${pushType} failed:`, err);
            }
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.warn('[Socket] Failed to parse payload:', error);
        // Don't report to Sentry - payload parsing errors are usually due to unexpected data format
        // and don't indicate a server problem
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
              strategy: 'oauth',
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
    });

    socket.on('connect_error', (err) => {
      const error = err instanceof Error ? err : new Error(String(err));
      // Transport-level failures (timeout, "websocket error") are network/upstream conditions and
      // socket.io retries automatically; they are not app bugs, so don't report them to Sentry.
      console.warn('[Socket] Connection error - will retry automatically:', error.message);
      setError(error.message);
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
    };
  }, [settings?.pd2Token]);

  const subscribe = useCallback<SubscribeSocket>(<T>(type: string, handler: SocketPushHandler<T>) => {
    const subscribers = subscribersRef.current;
    let handlers = subscribers.get(type);
    if (!handlers) {
      handlers = new Set();
      subscribers.set(type, handlers);
    }
    handlers.add(handler as SocketPushHandler);
    return () => {
      handlers.delete(handler as SocketPushHandler);
      if (handlers.size === 0 && subscribers.get(type) === handlers) subscribers.delete(type);
    };
  }, []);

  return {
    isConnected,
    error,
    subscribe,
    getSocket: () => socketRef.current,
  };
};
