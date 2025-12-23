import { useRef, useMemo } from 'react';
import type { BrowserWindow } from '@/lib/window';

export const useWindowRefs = () => {
  const winRef = useRef<BrowserWindow | null>(null); // Item Search
  const quickListWinRef = useRef<BrowserWindow | null>(null);
  const chatWindowRef = useRef<any>(null); // Type is loosely any in LandingPage currently, can be improved but sticking to refactor
  const chatButtonWindowRef = useRef<any>(null);
  const tradeMessagesWindowRef = useRef<any>(null);
  const currencyWindowRef = useRef<any>(null);

  // Return them as a single object to pass around
  return useMemo(
    () => ({
      winRef,
      quickListWinRef,
      chatWindowRef,
      chatButtonWindowRef,
      tradeMessagesWindowRef,
      currencyWindowRef,
    }),
    [],
  );
};

export type WindowRefs = ReturnType<typeof useWindowRefs>;
