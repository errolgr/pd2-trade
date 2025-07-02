import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { CustomToastPayload, ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { openUrl } from '@tauri-apps/plugin-opener';
import { relaunch } from '@tauri-apps/plugin-process';

const ToastPage: React.FC = () => {
  const closeToastWebview = () => {
    if (isTauri()) getCurrentWebviewWindow().hide().catch(console.error);
  };

  // Listen for Tauri 'toast-event' and show a toast
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (isTauri()) {
      listen('toast-event', async (event) => {
        // Show the window when we receive a toast event
        try {
          await getCurrentWebviewWindow().show();
        } catch (error) {
          console.error('Failed to show toast window:', error);
        }

        // event.payload can be string or object
        if (typeof event.payload === 'string') {
          toast('PD2 Trader', {
            description: event.payload,
            position: 'bottom-right',
            closeButton: true,
            onDismiss: () => closeToastWebview(),
            onAutoClose: () => closeToastWebview(),
          });
        } else if (event.payload && typeof event.payload === 'object') {
          const payload = event.payload as CustomToastPayload | GenericToastPayload;

          // Check if it's a generic toast payload (no action)
          if (!('action' in payload)) {
            const genericPayload = payload as GenericToastPayload;
            toast(genericPayload.title || 'PD2 Trader', {
              position: 'bottom-right',
              description: genericPayload.description,
              duration: genericPayload.duration,
              closeButton: true,
              onDismiss: () => closeToastWebview(),
              onAutoClose: () => closeToastWebview(),
            });
            return;
          }

          // Handle custom toast payload with action
          const customPayload = payload as CustomToastPayload;
          if (customPayload.action) {
            // Create onClick function based on action type
            const handleActionClick = async () => {
              try {
                switch (customPayload.action.type) {
                  case ToastActionType.OPEN_MARKET_LISTING: {
                    const listingId = customPayload.action.data?.listingId;
                    if (listingId) {
                      const marketUrl = `https://www.projectdiablo2.com/market/listing/${listingId}`;
                      await openUrl(marketUrl);
                    }
                    break;
                  }
                  case ToastActionType.UPDATE_AVAILABLE:
                    await relaunch();
                    break;
                  default:
                    console.warn('Unknown toast action type:', customPayload.action.type);
                }
              } catch (error) {
                console.error('Failed to handle toast action:', error);
                // Fallback for market listing
                if (customPayload.action.type === ToastActionType.OPEN_MARKET_LISTING) {
                  const listingId = customPayload.action.data?.listingId;
                  if (listingId) {
                    window.open(`https://www.projectdiablo2.com/market/listing/${listingId}`, '_blank');
                  }
                }
              }
            };

            // Custom toast with action button
            toast(customPayload.title || 'PD2 Trader', {
              position: 'bottom-right',
              description: customPayload.description,
              closeButton: true,
              action: {
                label: customPayload.action.label,
                onClick: handleActionClick,
              },
              onDismiss: () => closeToastWebview(),
              onAutoClose: () => closeToastWebview(),
            });
          } else {
            // Regular object toast
            toast('PD2 Trader', {
              position: 'bottom-right',
              description: customPayload.description,
              closeButton: true,
              onDismiss: () => closeToastWebview(),
              onAutoClose: () => closeToastWebview(),
            });
          }
        }
      }).then((off) => {
        unlisten = off;
      });
    }
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
      <Toaster 
        richColors
        closeButton
      />
  );
};

export default ToastPage;
