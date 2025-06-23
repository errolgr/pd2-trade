import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export function usePd2Socket(settings, updateSettings, setAuthData, pendingMarketListingsRequest, pendingStashRequest) {
  const [socket, setSocket] = useState(null);
  const rawSocketRef = useRef(null);

  useEffect(() => {
    if (settings.pd2Token) {
      const s = io('wss://api.projectdiablo2.com', {
        transports: ['websocket'],
      });
      setSocket(s);
      s.on('connect', () => {
        // Authenticate using raw socket
        const rawSocket = s.io.engine.transport.ws;
        rawSocketRef.current = rawSocket;
        rawSocket.send('420' + JSON.stringify(["create","security/session",{"strategy":"jwt","accessToken": settings.pd2Token}]));
      });
      // Message handler for raw socket
      const messageHandler = (event) => {
        const data = event.data;
        if (typeof data === 'string') {
          // Extract code and payload using regex
          const match = data.match(/^(\d+)(.+)$/);
          if (match) {
            const payload = match[2];
            try {
              const parsedPayload = JSON.parse(payload);
              // Handle market listings response
              console.log('[usePd2Sockets] parsing payload' + parsedPayload)
              if (
                pendingMarketListingsRequest &&
                pendingMarketListingsRequest.current &&
                Array.isArray(parsedPayload) &&
                parsedPayload.length === 2 &&
                parsedPayload[1] && typeof parsedPayload[1] === 'object' &&
                'data' in parsedPayload[1]
              ) {
                pendingMarketListingsRequest.current(parsedPayload);
                pendingMarketListingsRequest.current = null;
              }
              // Handle stash response
              if (
                pendingStashRequest &&
                pendingStashRequest.current &&
                Array.isArray(parsedPayload) &&
                parsedPayload.length === 2 &&
                parsedPayload[1] && typeof parsedPayload[1] === 'object' &&
                'items' in parsedPayload[1]
              ) {
                pendingStashRequest.current(parsedPayload);
                pendingStashRequest.current = null;
              }
              // Handle auth response - check if payload has AuthData structure
              if (parsedPayload && Array.isArray(parsedPayload) && parsedPayload.length === 2 && 
                  parsedPayload[1] && typeof parsedPayload[1] === 'object' &&
                  'accessToken' in parsedPayload[1] && 'user' in parsedPayload[1]) {
                setAuthData(parsedPayload[1]);
                // Default to first account if needed
                const accounts = parsedPayload[1]?.user?.game?.accounts;
                if (accounts && accounts.length > 0) {
                  const currentAccount = settings.account;
                  if (!currentAccount) {
                    updateSettings({ account: accounts[0] });
                  }
                }
              }
            } catch {}
          }
        }
      };
      s.io.engine.transport.ws.addEventListener('message', messageHandler);
      return () => {
        s.disconnect();
        setSocket(null);
        if (rawSocketRef.current) {
          rawSocketRef.current.removeEventListener('message', messageHandler);
        }
      };
    } else {
      setSocket(null);
    }
  }, [settings.pd2Token, pendingMarketListingsRequest]);

  return { socket, rawSocketRef };
} 