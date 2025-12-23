import React, { useEffect, useRef } from 'react';
import { TrayProvider, useTray } from '@/hooks/useTray';
import { OptionsProvider, useOptions } from '@/hooks/useOptions';
import { DialogProvider } from '@/hooks/useDialog';
import { Pd2WebsiteProvider } from '@/hooks/pd2website/usePD2Website';
import { useAppShortcuts } from '@/hooks/useShortcuts';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import { usePD2Auth } from '@/hooks/usePD2Auth';
import { useChangelog } from '@/hooks/useChangelog';
import { useSocketNotifications } from '@/hooks/useSocketNotifications';
import { useSocket } from '@/hooks/pd2website/useSocket';
import { ItemsProvider } from '@/hooks/useItems';
import iconPath from '@/assets/img_1.png';

// Custom Hooks
import { useWindowRefs } from './hooks/useWindowRefs';
import { useDiabloFocus } from '@/hooks/useDiabloFocus';
import { useWindowTracking } from './hooks/useWindowTracking';
import { useVisibilityManager } from './hooks/useVisibilityManager';
import { useItemActions } from './hooks/useItemActions';
import { useChatManager } from './hooks/useChatManager';
import { useTradeManager } from './hooks/useTradeManager';
import { useSplashScreen } from './hooks/useSplashScreen';

const LandingPageContent: React.FC = () => {
  const windowRefs = useWindowRefs();
  const { settings } = useOptions();
  const { settingsWindow } = useTray();
  const { isConnected } = useSocket({ settings });
  const { checkDiabloFocus } = useDiabloFocus();

  // Settings ref is needed for some async operations in hooks where state might likely be stale
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Set up socket notifications listener (offers and whispers)
  useSocketNotifications({ isConnected, settings, whisperNotificationsEnabled: true });

  // Feature Hooks
  const { fireSearch, openCurrencyValuation, openQuickListWindow } = useItemActions({
    windowRefs,
    checkDiabloFocus,
    settings,
  });

  const { toggleChatWindow } = useChatManager({
    windowRefs,
    settings,
    settingsRef,
  });

  const { toggleTradeMessagesWindow } = useTradeManager({
    windowRefs,
  });

  // Background Managers
  useWindowTracking({
    windowRefs,
    settings,
    settingsWindow,
  });

  useVisibilityManager({
    windowRefs,
    settings,
    settingsWindow,
  });

  // shortcuts
  useAppShortcuts(
    async () => {
      await fireSearch();
    },
    async () => {
      await openQuickListWindow(null);
    },
    async () => {
      await openCurrencyValuation();
    },
    async () => {
      await toggleChatWindow();
    },
    async () => {
      await toggleTradeMessagesWindow();
    },
  );

  // Global App stuff
  useAppUpdates();
  usePD2Auth();
  useChangelog();
  const { showTitle } = useSplashScreen();

  return (
    <div>
      {showTitle && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <img src={iconPath}
            style={{ width: 400 }}
            alt="PD2 Trader" />
        </div>
      )}
    </div>
  );
};

// Wrap content in providers
const LandingPage: React.FC = () => {
  return (
    <ItemsProvider>
      <Pd2WebsiteProvider>
        <LandingPageContent />
      </Pd2WebsiteProvider>
    </ItemsProvider>
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DialogProvider>
      <OptionsProvider>
        <TrayProvider>{children}</TrayProvider>
      </OptionsProvider>
    </DialogProvider>
  );
};

export default LandingPage;
