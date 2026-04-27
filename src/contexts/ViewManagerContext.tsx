import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { useDiablo } from '@/hooks/useDiablo';
import { VIEW_IDS } from '@/hooks/useViewManager';

export type ViewType = 'panel' | 'fixed';

export type ViewPosition = 'centered' | 'over-diablo' | 'at-cursor' | 'custom';

export interface ViewConfig {
  id: string;
  type: ViewType;
  position?: ViewPosition;
  customPosition?: { x: number; y: number };
  customSize?: { width: number; height: number };
  zIndex?: number;
  visible: boolean;
  data?: any; // Additional data for the view
}

interface ViewManagerContextType {
  views: Map<string, ViewConfig>;
  showView: (id: string, config?: Partial<ViewConfig>) => void;
  hideView: (id: string) => void;
  toggleView: (id: string, config?: Partial<ViewConfig>) => void;
  isVisible: (id: string) => boolean;
  getView: (id: string) => ViewConfig | undefined;
  updateView: (id: string, updates: Partial<ViewConfig>) => void;
  getNextZIndex: () => number;
}

const ViewManagerContext = createContext<ViewManagerContextType | undefined>(undefined);

const globalZIndex = 1000;

export const ViewManagerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [views, setViews] = useState<Map<string, ViewConfig>>(new Map());
  const zIndexCounterRef = useRef(1000);
  const { settings, updateSettings, isLoading: settingsLoading } = useOptions();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const viewsOpenBeforeBlurRef = useRef<Set<string>>(new Set());
  const previousDiabloFocusRef = useRef<boolean | null>(null);
  const { isDiabloFocused } = useDiablo();

  const getNextZIndex = useCallback(() => {
    zIndexCounterRef.current += 1;
    return zIndexCounterRef.current;
  }, []);

  const showView = useCallback(
    (id: string, config?: Partial<ViewConfig>) => {
      setViews((prev) => {
        const newViews = new Map(prev);
        const existing = newViews.get(id);

        const newConfig: ViewConfig = {
          id,
          type: config?.type ?? existing?.type ?? 'panel',
          position: config?.position ?? existing?.position ?? 'centered',
          customPosition: config?.customPosition ?? existing?.customPosition,
          customSize: config?.customSize ?? existing?.customSize,
          zIndex: config?.zIndex ?? existing?.zIndex ?? getNextZIndex(),
          visible: true,
          data: config?.data ?? existing?.data,
        };

        const wasVisible = existing?.visible ?? false;
        console.log('[ViewManager] showView called', {
          id,
          wasVisible,
          nowVisible: true,
          timestamp: Date.now(),
        });
        newViews.set(id, newConfig);
        return newViews;
      });
    },
    [getNextZIndex],
  );

  const hideView = useCallback((id: string) => {
    console.log('[ViewManager] hideView called', {
      id,
      timestamp: Date.now(),
    });
    setViews((prev) => {
      const newViews = new Map(prev);
      const existing = newViews.get(id);
      const wasVisible = existing?.visible ?? false;
      if (existing) {
        newViews.set(id, { ...existing, visible: false });
      }
      console.log('[ViewManager] hideView - state updated', {
        id,
        wasVisible,
        nowVisible: false,
        timestamp: Date.now(),
      });
      return newViews;
    });
  }, []);

  const toggleView = useCallback(
    (id: string, config?: Partial<ViewConfig>) => {
      setViews((prev) => {
        const newViews = new Map(prev);
        const existing = newViews.get(id);
        const isCurrentlyVisible = existing?.visible ?? false;

        if (isCurrentlyVisible) {
          if (existing) {
            newViews.set(id, { ...existing, visible: false });
          }
        } else {
          const newConfig: ViewConfig = {
            id,
            type: config?.type ?? existing?.type ?? 'panel',
            position: config?.position ?? existing?.position ?? 'centered',
            customPosition: config?.customPosition ?? existing?.customPosition,
            customSize: config?.customSize ?? existing?.customSize,
            zIndex: config?.zIndex ?? existing?.zIndex ?? getNextZIndex(),
            visible: true,
            data: config?.data ?? existing?.data,
          };
          newViews.set(id, newConfig);
        }

        return newViews;
      });
    },
    [getNextZIndex],
  );

  const isVisible = useCallback(
    (id: string) => {
      const visible = views.get(id)?.visible ?? false;
      if (id === VIEW_IDS.COMMAND_MENU) {
        console.log('[ViewManager] isVisible called', {
          id,
          visible,
          timestamp: Date.now(),
        });
      }
      return visible;
    },
    [views],
  );

  const getView = useCallback(
    (id: string) => {
      return views.get(id);
    },
    [views],
  );

  const updateView = useCallback((id: string, updates: Partial<ViewConfig>) => {
    setViews((prev) => {
      const existing = prev.get(id);
      if (!existing) {
        return prev; // No change if view doesn't exist
      }

      // Check if any values actually changed
      let hasChanges = false;
      for (const [key, value] of Object.entries(updates)) {
        const existingValue = existing[key as keyof ViewConfig];

        if (key === 'customPosition' && value && existingValue) {
          // Deep compare customPosition objects
          const existingPos = existingValue as { x: number; y: number } | undefined;
          const newPos = value as { x: number; y: number };
          if (!existingPos || Math.abs(existingPos.x - newPos.x) > 0.1 || Math.abs(existingPos.y - newPos.y) > 0.1) {
            hasChanges = true;
            break;
          }
        } else if (key === 'customSize' && value && existingValue) {
          // Deep compare customSize objects
          const existingSize = existingValue as { width: number; height: number } | undefined;
          const newSize = value as { width: number; height: number };
          if (!existingSize || existingSize.width !== newSize.width || existingSize.height !== newSize.height) {
            hasChanges = true;
            break;
          }
        } else if (existingValue !== value) {
          hasChanges = true;
          break;
        }
      }

      // Only create new Map if something actually changed
      if (!hasChanges) {
        return prev;
      }

      const newViews = new Map(prev);
      newViews.set(id, { ...existing, ...updates });
      return newViews;
    });
  }, []);

  // Load persisted view states on mount (after settings are loaded)
  useEffect(() => {
    if (settingsLoading || isInitializedRef.current) {
      return;
    }

    if (!settings.viewStates) {
      isInitializedRef.current = true;
      return;
    }

    isInitializedRef.current = true;
    const viewStates = settings.viewStates;

    // Restore persisted view states
    setViews((prev) => {
      const newViews = new Map(prev);
      for (const [viewId, persistedState] of Object.entries(viewStates)) {
        const existing = newViews.get(viewId);
        if (existing) {
          // Merge persisted state into existing view config
          newViews.set(viewId, {
            ...existing,
            customPosition: persistedState.customPosition ?? existing.customPosition,
            customSize: persistedState.customSize ?? existing.customSize,
          });
        } else {
          // Create new view config with persisted state (but not visible)
          newViews.set(viewId, {
            id: viewId,
            type: 'panel',
            position: persistedState.customPosition ? 'custom' : 'centered',
            customPosition: persistedState.customPosition,
            customSize: persistedState.customSize,
            visible: false,
          });
        }
      }
      return newViews;
    });
  }, [settings.viewStates, settingsLoading]);

  // Persist view states to settings (debounced)
  const previousViewStatesRef = useRef<string>('');

  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't save during initial load
    if (!isInitializedRef.current) {
      return;
    }

    // Debounce save by 500ms
    saveTimeoutRef.current = setTimeout(() => {
      const viewStates: Record<
        string,
        { customPosition?: { x: number; y: number }; customSize?: { width: number; height: number } }
      > = {};

      // Extract only customPosition and customSize from views
      for (const [viewId, view] of views) {
        // Only persist if view has custom position or size
        if (view.customPosition || view.customSize) {
          viewStates[viewId] = {};
          if (view.customPosition) {
            viewStates[viewId].customPosition = view.customPosition;
          }
          if (view.customSize) {
            viewStates[viewId].customSize = view.customSize;
          }
        }
      }

      // Only update if viewStates actually changed
      const viewStatesString = JSON.stringify(viewStates);
      if (viewStatesString === previousViewStatesRef.current) {
        return; // No change, skip update
      }

      previousViewStatesRef.current = viewStatesString;

      // Save to settings
      updateSettings({ viewStates });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [views, updateSettings]);

  useEffect(() => {
    const previousFocus = previousDiabloFocusRef.current;
    const autoCloseEnabled = false;

    // Diablo just lost focus
    if (previousFocus === true && isDiabloFocused === false && autoCloseEnabled) {
      // Store which views were open
      viewsOpenBeforeBlurRef.current.clear();
      setViews((prev) => {
        const newViews = new Map(prev);
        for (const [viewId, view] of prev) {
          if (view.visible) {
            viewsOpenBeforeBlurRef.current.add(viewId);
            // Close all views except fixed views (like chat button)
            if (view.type !== 'fixed') {
              newViews.set(viewId, { ...view, visible: false });
            }
          }
        }
        return newViews;
      });
    }

    // Diablo just gained focus
    if (previousFocus === false && isDiabloFocused === true) {
      // Reopen views that were open before blur
      setViews((prev) => {
        const newViews = new Map(prev);
        for (const viewId of viewsOpenBeforeBlurRef.current) {
          const existing = prev.get(viewId);
          if (existing) {
            newViews.set(viewId, { ...existing, visible: true });
          }
        }
        viewsOpenBeforeBlurRef.current.clear();
        return newViews;
      });
    }

    previousDiabloFocusRef.current = isDiabloFocused;
  }, [isDiabloFocused]);

  // Handle window blur/focus for ItemOverlayWidget, CommandMenu, and MarketSearch
  useEffect(() => {
    const handleWindowBlur = () => {
      // Close ItemOverlayWidget, CommandMenu, and MarketSearch when window loses focus
      setViews((prev) => {
        const newViews = new Map(prev);
        const itemView = prev.get(VIEW_IDS.ITEM_SEARCH);
        if (itemView?.visible) {
          newViews.set(VIEW_IDS.ITEM_SEARCH, { ...itemView, visible: false });
        }
        const commandMenuView = prev.get(VIEW_IDS.COMMAND_MENU);
        if (commandMenuView?.visible) {
          newViews.set(VIEW_IDS.COMMAND_MENU, { ...commandMenuView, visible: false });
        }
        const marketSearchView = prev.get(VIEW_IDS.MARKET_SEARCH);
        if (marketSearchView?.visible) {
          newViews.set(VIEW_IDS.MARKET_SEARCH, { ...marketSearchView, visible: false });
        }
        const delistPopupView = prev.get(VIEW_IDS.DELIST_POPUP);
        if (delistPopupView?.visible) {
          newViews.set(VIEW_IDS.DELIST_POPUP, { ...delistPopupView, visible: false });
        }
        return newViews;
      });
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return (
    <ViewManagerContext.Provider
      value={{
        views,
        showView,
        hideView,
        toggleView,
        isVisible,
        getView,
        updateView,
        getNextZIndex,
      }}
    >
      {children}
    </ViewManagerContext.Provider>
  );
};

export const useViewManager = () => {
  const context = useContext(ViewManagerContext);
  if (context === undefined) {
    throw new Error('useViewManager must be used within a ViewManagerProvider');
  }
  return context;
};
