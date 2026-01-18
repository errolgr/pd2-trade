import React, { useEffect, useState } from 'react';
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
  const { views, hideView, updateView, isVisible } = useViewManager();
  const { diabloRect, isDiabloFocused, diabloRectRelative } = useDiablo();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [diabloHeight, setDiabloHeight] = useState<number | null>(null);
  const [toastPosition, setToastPosition] = useState<{ x: number; y: number } | null>(null);
  const lastCommandMenuPositionRef = React.useRef<{ x: number; y: number } | null>(null);

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

  // Update CommandMenu position when Diablo rect changes
  useEffect(() => {
    const isCommandMenuVisible = isVisible(VIEW_IDS.COMMAND_MENU);
    if (!isCommandMenuVisible || !diabloRectRelative) {
      lastCommandMenuPositionRef.current = null;
      return;
    }

    const menuSize = { width: 500, height: 400 };
    const centeredPosition = {
      x: diabloRectRelative.x + (diabloRectRelative.width - menuSize.width) / 2,
      y: diabloRectRelative.y + (diabloRectRelative.height - menuSize.height) / 2,
    };

    // Only update if position actually changed
    const lastPosition = lastCommandMenuPositionRef.current;
    if (
      !lastPosition ||
      Math.abs(lastPosition.x - centeredPosition.x) > 1 ||
      Math.abs(lastPosition.y - centeredPosition.y) > 1
    ) {
      lastCommandMenuPositionRef.current = centeredPosition;
      updateView(VIEW_IDS.COMMAND_MENU, {
        customPosition: centeredPosition,
        position: 'custom',
      });
    }
  }, [diabloRectRelative, isVisible, updateView]);

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
          setToastPosition({
            x: diabloFrameRight - padding,
            y: diabloFrameBottom - padding,
          });
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
  }, [isDiabloFocused, diabloRectRelative]);

  const renderViewContent = (viewId: string) => {
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
  };

  return (
    <div
      className="fixed"
      style={{
        left: 0,
        top: 0,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        border: '2px solid yellow',
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
      {Array.from(views.values()).map((view) => {
        if (!view.visible) return null;
        console.log('[MainLayout] Rendering view:', view.id, view.type, view.visible);
        // Get default size based on view ID (from original window sizes in LandingPage.tsx)
        const getDefaultSize = (viewId: string): { width: number; height: number } => {
          switch (viewId) {
            case VIEW_IDS.ITEM_SEARCH:
              // Use Diablo window height if available, otherwise fallback to 600
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
              return { width: 500, height: 600 }; // Panel over diablo (default)
            case VIEW_IDS.COMMAND_MENU:
              return { width: 420, height: 470 }; // Command menu size
            case VIEW_IDS.SETTINGS:
              return { width: 1025, height: 700 }; // From useTray
            case VIEW_IDS.CHANGELOG:
              return { width: 600, height: 600 }; // Default changelog size
            default:
              return { width: 600, height: 400 };
          }
        };

        // Get default position - center CommandMenu on Diablo rect
        const getDefaultPosition = (viewId: string): { x: number; y: number } | undefined => {
          if (viewId === VIEW_IDS.COMMAND_MENU && diabloRectRelative) {
            const menuSize = getDefaultSize(VIEW_IDS.COMMAND_MENU);
            return {
              x: diabloRectRelative.x + (diabloRectRelative.width - menuSize.width) / 2,
              y: diabloRectRelative.y + (diabloRectRelative.height - menuSize.height) / 2,
            };
          }
          return undefined;
        };

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
      })}

      {/* Sonner toaster for toast notifications */}
      <ClickThroughToaster richColors
        closeButton
        expand
        visibleToasts={5}
        customPosition={toastPosition} />
    </div>
  );
};
