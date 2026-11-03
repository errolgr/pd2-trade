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

/** A Feathers service call over the signed-in socket, e.g. `request('get', 'game/character', name, {})`. */
export type SocketRequest = <T = unknown>(method: 'get' | 'find', path: string, ...args: unknown[]) => Promise<T>;

/** A socket call that failed: not connected or signed in, no answer in time, or PD2 refused it. */
export class SocketRequestError extends Error {
  constructor(
    message: string,
    /** PD2's error code (e.g. 401, 404); 0 = no answer. */
    public readonly code: number = 0,
  ) {
    super(message);
    this.name = 'SocketRequestError';
  }
}

/** How long a call waits for the session and PD2's answer together. */
export const SOCKET_REQUEST_TIMEOUT_MS = 15_000;

interface Session {
  ready: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
  settled: boolean;
}

function newSession(): Session {
  const session = { settled: false } as Session;
  session.ready = new Promise<void>((resolve, reject) => {
    session.resolve = () => {
      session.settled = true;
      resolve();
    };
    session.reject = (error) => {
      session.settled = true;
      reject(error);
    };
  });
  // A session nobody asked anything of must not surface as an unhandled rejection
  session.ready.catch(() => {});
  return session;
}

function toSocketError(error: unknown): SocketRequestError {
  const { message, code } = (error ?? {}) as { message?: unknown; code?: unknown };
  return new SocketRequestError(typeof message === 'string' ? message : 'PD2 refused the request', Number(code) || 0);
}

/**
 * The PD2 socket: server pushes, plus `request` for data PD2 only sends to the signed-in socket (a character's
 * personal stash). Everything else goes through the REST clients (useSocialActions etc.).
 */
export const useSocket = (props?: UseSocketProps) => {
  // Use props if provided, otherwise fall back to hooks
  const contextSettings = useOptions().settings;

  const settings = props?.settings ?? contextSettings;
  const socketRef = useRef<Socket | null>(null);
  const rawSocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscribersRef = useRef(new Map<string, Set<SocketPushHandler>>());
  // The current connection's sign-in; a fresh one per connection, so a call made while reconnecting waits for it
  const sessionRef = useRef<Session | null>(null);

  useEffect(() => {
    if (!settings?.pd2Token) {
      return;
    }

    // Connect to Socket.IO server
    const socket = io('wss://api.projectdiablo2.com', {
      transports: ['websocket'],
      timeout: 20000, // 20 seconds timeout
      // Retry for as long as the overlay runs: a capped retry count gives up for the session after a short PD2
      // outage (e.g. season launch), silently ending chat and offer pushes. Back off to 30s between attempts.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;
    sessionRef.current = newSession();

    // Message handler for raw socket
    const messageHandler = (event: MessageEvent) => {
      const data = event.data;
      if (typeof data !== 'string') return;

      // Pushes are socket.io EVENT frames: "42" + ["<service> <event>", data]. Acks ("43…") answer our own calls.
      const match = data.match(/^42(\[.*)$/s);
      if (!match) return;

      try {
        const parsedPayload = JSON.parse(match[1]);
        if (!Array.isArray(parsedPayload) || parsedPayload.length !== 2) return;
        const [eventType, eventData] = parsedPayload;

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

      // Pushes are read off the raw WebSocket; the transport is new on every connect
      const rawSocket = socket.io.engine.transport.ws;
      rawSocketRef.current = rawSocket;
      rawSocket.addEventListener('message', messageHandler);

      const session = sessionRef.current?.settled ? (sessionRef.current = newSession()) : sessionRef.current!;
      socket.emit(
        'create',
        'security/session',
        { strategy: 'oauth', accessToken: settings.pd2Token },
        (err: unknown) => {
          if (err) {
            console.warn('[Socket] Sign-in refused:', err);
            session.reject(toSocketError(err));
          } else {
            console.log('[Socket] Authenticated');
            session.resolve();
          }
        },
      );
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
      if (rawSocketRef.current) rawSocketRef.current.removeEventListener('message', messageHandler);
      rawSocketRef.current = null;
      // Calls made from now on wait for the next connection's sign-in
      if (sessionRef.current?.settled) sessionRef.current = newSession();
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
      sessionRef.current?.reject(new SocketRequestError('Socket closed'));
      sessionRef.current = null;
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

  const request = useCallback<SocketRequest>(<T>(method: 'get' | 'find', path: string, ...args: unknown[]) => {
    const socket = socketRef.current;
    const session = sessionRef.current;
    if (!socket || !session) return Promise.reject(new SocketRequestError('Not connected to PD2'));
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new SocketRequestError(`PD2 did not answer ${method} ${path} in time`)),
        SOCKET_REQUEST_TIMEOUT_MS,
      );
      session.ready.then(
        () =>
          socket.emit(method, path, ...args, (err: unknown, data: T) => {
            clearTimeout(timer);
            if (err) reject(toSocketError(err));
            else resolve(data);
          }),
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }, []);

  return {
    isConnected,
    error,
    subscribe,
    request,
    getSocket: () => socketRef.current,
  };
};
