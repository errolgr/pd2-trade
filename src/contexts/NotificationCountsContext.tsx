import React, { createContext, useContext, ReactNode } from 'react';
import { useNotificationCounts, NotificationCounts } from '@/hooks/useNotificationCounts';

interface NotificationCountsContextType extends NotificationCounts {}

const NotificationCountsContext = createContext<NotificationCountsContextType | undefined>(undefined);

interface NotificationCountsProviderProps {
  children: ReactNode;
}

export const NotificationCountsProvider: React.FC<NotificationCountsProviderProps> = ({ children }) => {
  const counts = useNotificationCounts();

  return <NotificationCountsContext.Provider value={counts}>{children}</NotificationCountsContext.Provider>;
};

/**
 * Hook to access notification counts from context
 * @throws Error if used outside NotificationCountsProvider
 */
export const useNotificationCountsContext = (): NotificationCountsContextType => {
  const context = useContext(NotificationCountsContext);
  if (context === undefined) {
    throw new Error('useNotificationCountsContext must be used within a NotificationCountsProvider');
  }
  return context;
};
