import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useViewManager, VIEW_IDS } from '@/hooks/useViewManager';
import { PanelView } from './PanelView';
import { FixedView } from './FixedView';
import { DiabloFrame } from './DiabloFrame';
import { ClickThroughToaster } from './ClickThroughToaster';
import ToastNotificationSystem from './ToastNotificationSystem';
import ItemPage from '@/pages/price-check/ItemPage';
import { QuickListPage } from '@/pages/quick-list/QuickListPage';
import { CurrencyPage } from '@/pages/currency/CurrencyPage';
import ChatPage from '@/pages/chat/ChatPage';
import { MarketSearchPage } from '@/pages/market-search/MarketSearchPage';
import TradeMessagesPage from '@/pages/trade-messages/TradeMessagesPage';
import ChatButtonPage from '@/pages/chat/ChatButtonPage';
import ChangeLogPage from '@/pages/change-log/ChangeLogPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { CommandMenu } from '@/components/command-menu/CommandMenu';
import { useDiablo } from '@/hooks/useDiablo';
import { currentMonitor } from '@tauri-apps/api/window';
import { isTauri } from '@tauri-apps/api/core';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { views, hideView, updateView } = useViewManager();
  const { isDiabloFocused, diabloRectRelative } = useDiablo();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [diabloHeight] = useState<number | null>(null);
  const [toastPosition, setToastPosition] = useState<{ x: number; y: number } | null>(null);
  const lastCommandMenuPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const renderCountRef = useRef(0);

  // Track render count in effect to avoid accessing refs during render
  useEffect(() => {
    renderCountRef.current += 1;
    console.log('[MainLayout] Component render #' + renderCountRef.current);
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions(); // Initial update

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Get command menu visibility from views directly to avoid circular dependency
  // Memoize the views array and hash based on actual content
  const viewsArray = useMemo(() => {
    return Array.from(views.entries());
  }, [views]);

  // Compute viewsHash from views directly
  const viewsHash = useMemo(() => {
    return viewsArray
      .map(([id, config]) => `${id}:${config.visible}:${config.customPosition?.x}:${config.customPosition?.y}`)
      .join('|');
  }, [viewsArray]);

  const commandMenuView = useMemo(() => {
    return views.get(VIEW_IDS.COMMAND_MENU);
  }, [views, viewsHash]);
  const isCommandMenuVisible = commandMenuView?.visible ?? false;

  // Memoize diabloRectRelative to prevent unnecessary object recreation
  const stableDiabloRectRelative = useMemo(() => {
    if (!diabloRectRelative) return null;
    return { ...diabloRectRelative };
  }, [diabloRectRelative]);

  // Extract position values to avoid depending on the view object
  const currentCustomPositionX = commandMenuView?.customPosition?.x;
  const currentCustomPositionY = commandMenuView?.customPosition?.y;

  // Update CommandMenu position when Diablo rect changes
  useEffect(() => {
    if (!isCommandMenuVisible || !stableDiabloRectRelative) {
      lastCommandMenuPositionRef.current = null;
      return;
    }

    const menuSize = { width: 500, height: 400 };
    const centeredPosition = {
      x: stableDiabloRectRelative.x + (stableDiabloRectRelative.width - menuSize.width) / 2,
      y: stableDiabloRectRelative.y + (stableDiabloRectRelative.height - menuSize.height) / 2,
    };

    // Check if position actually changed by comparing with both lastPosition and current view position
    const lastPosition = lastCommandMenuPositionRef.current;

    // Only update if position actually changed significantly
    const positionChanged =
      !lastPosition ||
      Math.abs(lastPosition.x - centeredPosition.x) > 1 ||
      Math.abs(lastPosition.y - centeredPosition.y) > 1 ||
      (currentCustomPositionX !== undefined && Math.abs(currentCustomPositionX - centeredPosition.x) > 1) ||
      (currentCustomPositionY !== undefined && Math.abs(currentCustomPositionY - centeredPosition.y) > 1);

    if (positionChanged) {
      lastCommandMenuPositionRef.current = centeredPosition;
      updateView(VIEW_IDS.COMMAND_MENU, {
        customPosition: centeredPosition,
        position: 'custom',
      });
    }
  }, [
    stableDiabloRectRelative?.x,
    stableDiabloRectRelative?.y,
    stableDiabloRectRelative?.width,
    stableDiabloRectRelative?.height,
    isCommandMenuVisible,
    currentCustomPositionX,
    currentCustomPositionY,
    updateView,
  ]);

  // Helper function to constrain toast position within viewport bounds
  const constrainToastPosition = (x: number, y: number): { x: number; y: number } => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Minimum expected toast size (width and height) to ensure it doesn't go off-screen
    // Toasts can vary in size, but we use a reasonable minimum
    const minToastWidth = 300;
    const minToastHeight = 80;

    // Minimum padding from edges
    const minPadding = 16;

    // Constrain x position: ensure toast doesn't go outside right edge
    // Since toasts are positioned from bottom-right, x represents distance from left
    // right = viewportWidth - x, so we need: right >= minPadding
    // Therefore: x <= viewportWidth - minPadding
    // Also ensure x is at least 0
    const constrainedX = Math.max(0, Math.min(x, viewportWidth - minPadding));

    // Constrain y position: ensure toast doesn't go outside bottom edge
    // Since toasts are positioned from bottom-right, y represents distance from top
    // bottom = viewportHeight - y, so we need: bottom >= minPadding
    // Therefore: y <= viewportHeight - minPadding
    // Also ensure y is at least 0
    const constrainedY = Math.max(0, Math.min(y, viewportHeight - minPadding));

    return { x: constrainedX, y: constrainedY };
  };

  // Update toast position based on Diablo focus
  useEffect(() => {
    if (!isTauri()) return;

    const updateToastPosition = async () => {
      try {
        if (isDiabloFocused && diabloRectRelative) {
          const scaleFactor = await currentMonitor().then((m) => m?.scaleFactor || 1);

          // Calculate position relative to main window viewport
          const diabloFrameRight = diabloRectRelative.x + diabloRectRelative.width / scaleFactor;
          const diabloFrameBottom = diabloRectRelative.y + diabloRectRelative.height / scaleFactor;

          // Position toasts in bottom-right corner of Diablo window with padding
          const padding = 20;
          const x = diabloFrameRight - padding;
          const y = diabloFrameBottom - padding;

          // Constrain position to stay within viewport bounds
          const constrainedPosition = constrainToastPosition(x, y);

          setToastPosition(constrainedPosition);
        } else {
          // Diablo not focused, use default position (bottom-right of main layout)
          setToastPosition(null);
        }
      } catch (error) {
        console.warn('[MainLayout] Failed to update toast position:', error);
        setToastPosition(null);
      }
    };

    updateToastPosition();
  }, [isDiabloFocused, diabloRectRelative, dimensions]);

  const renderViewContent = useCallback((viewId: string) => {
    switch (viewId) {
      case VIEW_IDS.ITEM_SEARCH:
        return <ItemPage />;
      case VIEW_IDS.QUICK_LIST:
        return <QuickListPage />;
      case VIEW_IDS.CURRENCY:
        return <CurrencyPage />;
      case VIEW_IDS.CHAT:
        return <ChatPage />;
      case VIEW_IDS.MARKET_SEARCH:
        return <MarketSearchPage />;
      case VIEW_IDS.TRADE_MESSAGES:
        return <TradeMessagesPage />;
      case VIEW_IDS.CHAT_BUTTON:
        return <ChatButtonPage />;
      case VIEW_IDS.CHANGELOG:
        return <ChangeLogPage />;
      case VIEW_IDS.SETTINGS:
        return <SettingsPage />;
      case VIEW_IDS.COMMAND_MENU:
        return <CommandMenu />;
      default:
        return null;
    }
  }, []);

  return (
    <div
      className="fixed"
      style={{
        left: 0,
        top: 0,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        zIndex: 0,
      }}
    >
      {/* Main content - LandingPage */}
      <div className="w-full h-full">{children}</div>

      {/* DiabloFrame - always positioned over Diablo window */}
      <DiabloFrame />

      {/* Toast notification system */}
      <ToastNotificationSystem />

      {/* Render all visible views */}
      {useMemo(() => {
        // Get default size based on view ID (from original window sizes in LandingPage.tsx)
        const getDefaultSize = (viewId: string): { width: number; height: number } => {
          switch (viewId) {
            case VIEW_IDS.ITEM_SEARCH:
              // Height will be adjusted based on Diablo window height in getDefaultPosition
              if (stableDiabloRectRelative) {
                return { width: 500, height: stableDiabloRectRelative.height };
              }
              return { width: 500, height: diabloHeight ?? 600 };
            case VIEW_IDS.QUICK_LIST:
              return { width: 600, height: 512 }; // From openWindowAtCursor
            case VIEW_IDS.CURRENCY:
              return { width: 665, height: 870 }; // From openCenteredWindow
            case VIEW_IDS.CHAT:
              return { width: 1000, height: 700 }; // Panel over diablo (default)
            case VIEW_IDS.MARKET_SEARCH:
              return { width: 500, height: 600 }; // Panel over diablo (default)
            case VIEW_IDS.TRADE_MESSAGES:
              return { width: 600, height: 350 }; // Panel over diablo (default)
            case VIEW_IDS.COMMAND_MENU:
              return { width: 600, height: 470 }; // Command menu size
            case VIEW_IDS.SETTINGS:
              return { width: 1025, height: 700 }; // From useTray
            case VIEW_IDS.CHANGELOG:
              return { width: 600, height: 600 }; // Default changelog size
            default:
              return { width: 600, height: 400 };
          }
        };

        // Get default position - center all views on Diablo rect, except Item Search which is top-right aligned
        const getDefaultPosition = (viewId: string): { x: number; y: number } | undefined => {
          if (stableDiabloRectRelative) {
            if (viewId === VIEW_IDS.ITEM_SEARCH) {
              // Position Item Search so top-right aligns with Diablo's top-right
              // Height is set in getDefaultSize to match Diablo window height
              const width = 500; // Item Search width
              return {
                x: stableDiabloRectRelative.x + stableDiabloRectRelative.width - width,
                y: stableDiabloRectRelative.y,
              };
            }
            const viewSize = getDefaultSize(viewId);
            return {
              x: stableDiabloRectRelative.x + (stableDiabloRectRelative.width - viewSize.width) / 2,
              y: stableDiabloRectRelative.y + (stableDiabloRectRelative.height - viewSize.height) / 2,
            };
          }
          return undefined;
        };

        const visibleViews = viewsArray.filter(([, view]) => view.visible);

        return visibleViews.map(([, view]) => {
          console.log('[MainLayout] Rendering view:', view.id, view.type, view.visible);
          if (view.type === 'panel') {
            return (
              <PanelView
                key={view.id}
                viewId={view.id}
                defaultSize={getDefaultSize(view.id)}
                defaultPosition={getDefaultPosition(view.id)}
                onClose={() => hideView(view.id)}
              >
                {renderViewContent(view.id)}
              </PanelView>
            );
          }

          if (view.type === 'fixed') {
            return (
              <FixedView
                key={view.id}
                viewId={view.id}
                className="fixed"
                style={{
                  zIndex: view.zIndex,
                  ...(view.customPosition
                    ? {
                        left: `${view.customPosition.x}px`,
                        top: `${view.customPosition.y}px`,
                      }
                    : {}),
                }}
              >
                {renderViewContent(view.id)}
              </FixedView>
            );
          }

          return null;
        });
      }, [viewsArray, viewsHash, diabloHeight, stableDiabloRectRelative, hideView, renderViewContent])}

      {/* Sonner toaster for toast notifications */}
      <ClickThroughToaster richColors
        closeButton
        expand
        visibleToasts={5}
        customPosition={toastPosition} />
    </div>
  );
};
