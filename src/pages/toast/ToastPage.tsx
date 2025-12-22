import React, { useEffect, useState } from 'react';
import { listen, emit } from '@/lib/browser-events';
import { isTauri } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { CustomToastPayload, ToastActionType, GenericToastPayload } from '@/common/types/Events';
import { openUrl } from '@/lib/browser-opener';
import { check } from '@tauri-apps/plugin-updater';
import { resetUpdateNotification } from '@/hooks/useAppUpdates';

const ToastPage: React.FC = () => {
  const closeToastWebview = async () => {
    if (isTauri()) {
      const win = await getCurrentWebviewWindow();
      if (win) win.hide().catch(console.error);
    }
  };

  // Track active toasts to manage window visibility
  const activeToastsRef = React.useRef(0);

  const handleToastOpen = () => {
    activeToastsRef.current += 1;
  };

  const handleToastClose = () => {
    activeToastsRef.current = Math.max(0, activeToastsRef.current - 1);
    if (activeToastsRef.current === 0) {
      // Small delay to allow fade out animation
      setTimeout(() => {
        if (activeToastsRef.current === 0) {
          closeToastWebview();
        }
      }, 500);
    }
  };

  // Listen for 'toast-confirm-disable-overlay' and show confirmation toast
  useEffect(() => {
    let unlistenConfirmPromise: Promise<() => void>;

    listen('toast-confirm-disable-overlay', async (event: any) => {
      // Show the window when we receive a toast event (only in Tauri)
      if (isTauri()) {
        try {
          const win = await getCurrentWebviewWindow();
          if (win) await win.show();
        } catch (error) {
          console.error('Failed to show toast window:', error);
        }
      }

      handleToastOpen();
      toast('Disable Chat Button Overlay?', {
        description: 'You can re-enable it later in Settings → Interface.',
        position: 'bottom-right',
        duration: 5000,
        action: {
          label: 'Disable',
          onClick: async () => {
            emit('confirm-disable-overlay');
          },
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {
            // No-op, just close
          },
        },
        onDismiss: () => handleToastClose(),
        onAutoClose: () => handleToastClose(),
      });
    }).then((off) => {
      unlistenConfirmPromise = Promise.resolve(off);
    });

    return () => {
      if (unlistenConfirmPromise) {
        unlistenConfirmPromise.then((off) => off());
      }
    };
  }, []);

  // Listen for 'toast-confirm-delete-listing' and show confirmation toast
  useEffect(() => {
    let unlistenDeletePromise: Promise<() => void>;

    listen('toast-confirm-delete-listing', async (event: any) => {
      const { listingId, itemName } = event.payload || {};

      // Show the window when we receive a toast event (only in Tauri)
      if (isTauri()) {
        try {
          const win = await getCurrentWebviewWindow();
          if (win) await win.show();
        } catch (error) {
          console.error('Failed to show toast window:', error);
        }
      }

      handleToastOpen();
      toast.warning('Delete Listing?', {
        description: itemName
          ? `Are you sure you want to delete the listing for ${itemName}?`
          : 'Are you sure you want to delete this listing?',
        position: 'bottom-right',
        duration: 10000,
        action: {
          label: 'Delete',
          onClick: async () => {
            emit('confirm-delete-listing', { listingId });
          },
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {
            // No-op, just close
          },
        },
        onDismiss: () => handleToastClose(),
        onAutoClose: () => handleToastClose(),
      });
    }).then((off) => {
      unlistenDeletePromise = Promise.resolve(off);
    });

    return () => {
      if (unlistenDeletePromise) {
        unlistenDeletePromise.then((off) => off());
      }
    };
  }, []);

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
                    try {
                      // Check for update and download/install it before relaunching
                      const update = await check();
                      if (update?.available) {
                        // Show a loading toast
                        const loadingToast = toast.loading('Downloading update...', {
                          position: 'bottom-right',
                        });

                        let downloaded = 0;
                        let contentLength = 0;

                        // Download and install the update
                        await update.downloadAndInstall((event) => {
                          switch (event.event) {
                            case 'Started':
                              contentLength = event.data.contentLength;
                              break;
                            case 'Progress':
                              downloaded += event.data.chunkLength;
                              const progress = contentLength
                                ? Math.min(100, Math.floor((downloaded / contentLength) * 100))
                                : 0;
                              toast.loading(`Downloading update... ${progress}%`, {
                                id: loadingToast,
                                position: 'bottom-right',
                              });
                              break;
                            case 'Finished':
                              toast.success('Update downloaded! Restarting...', {
                                id: loadingToast,
                                position: 'bottom-right',
                              });
                              break;
                          }
                        });

                        // Relaunch after successful download/install
                        await relaunch();
                      } else {
                        // No update available, just relaunch
                        await relaunch();
                      }
                    } catch (error) {
                      console.error('Failed to download/install update:', error);
                      toast.error('Failed to download update. Please try again later.', {
                        position: 'bottom-right',
                      });
                      // Reset notification state so user can try again
                      resetUpdateNotification();
                    }
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

  return <Toaster richColors
    closeButton />;
};

export default ToastPage;
