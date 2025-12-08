import React, { useEffect, useState } from 'react';
import { listen } from '@/lib/browser-events';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { CustomToastPayload, ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { openUrl } from '@/lib/browser-opener';

const ToastPage: React.FC = () => {
  const closeToastWebview = async () => {
    if (isTauri()) {
      const win = await getCurrentWebviewWindow();
      if (win) win.hide().catch(console.error);
    }
  };

  // Listen for 'toast-event' and show a toast
  useEffect(() => {
    let unlistenPromise: Promise<() => void>;
    
    listen('toast-event', async (event) => {
      // Show the window when we receive a toast event (only in Tauri)
      if (isTauri()) {
        try {
          const win = await getCurrentWebviewWindow();
          if (win) await win.show();
        } catch (error) {
          console.error('Failed to show toast window:', error);
        }
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
            const toastOptions = {
              position: 'bottom-right' as const,
              description: genericPayload.description,
              duration: genericPayload.duration,
              closeButton: true,
              onDismiss: () => closeToastWebview(),
              onAutoClose: () => closeToastWebview(),
            };

            // Use appropriate toast variant
            if (genericPayload.variant === 'error') {
              toast.error(genericPayload.title || 'PD2 Trader', toastOptions);
            } else if (genericPayload.variant === 'success') {
              toast.success(genericPayload.title || 'PD2 Trader', toastOptions);
            } else if (genericPayload.variant === 'warning') {
              toast.warning(genericPayload.title || 'PD2 Trader', toastOptions);
            } else {
              toast(genericPayload.title || 'PD2 Trader', toastOptions);
            }
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
                      closeToastWebview();
                    }
                    break;
                  }
                  case ToastActionType.UPDATE_AVAILABLE:
                    if (isTauri()) {
                      const { relaunch } = await import('@tauri-apps/plugin-process');
                      await relaunch();
                    } else {
                      // In browser, just reload the page
                      window.location.reload();
                    }
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
                    closeToastWebview();
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
      unlistenPromise = Promise.resolve(off);
    });
    
    return () => {
      if (unlistenPromise) {
        unlistenPromise.then((off) => off());
      }
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
