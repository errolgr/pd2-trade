import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import SettingsLayout from '@/components/dialogs/optionsv2/options-layout';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ClientEvent, ISettings } from '@dmg-meter/types';

interface OptionsContextProps {
  isOpen: boolean;
  isLoading: boolean;
  setIsOpen: (open: boolean) => void;
  settings: ISettings;
  updateSettings: (newSettings: Partial<ISettings>) => void;
}

// Create the context for options
const OptionsContext = React.createContext<OptionsContextProps | undefined>(undefined);

// Provider component that wraps your app (or a part of it)
export const OptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { socket } = useWebSocket();
  const [isLoading, setIsLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<ISettings>({
    id: null,
    theme: 'light',
    font: null,
  });

  useEffect(() => {
    if (!socket) return;

    socket.on(ClientEvent.SettingsUpdated, (settings: ISettings) => {
      setSettings(settings);
    });

    return () => {
      socket.off(ClientEvent.SettingsUpdated);
      socket.off('connect');
    };
  }, [socket]);

  const updateSettings = useCallback(
    async (newSettings: Partial<ISettings>) => {
      try {
        const response = await fetch(`http://localhost:3001/api/settings/${settings.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSettings),
        });
        if (!response.ok) {
          throw new Error('Failed to update settings');
        }
        const result = await response.json();
        setSettings((prevSettings) => ({ ...prevSettings, ...result }));
        toast.success('Settings have been updated...');
      } catch (error) {
        console.error('Error updating settings:', error);
      }
    },
    [settings],
  );

  async function fetchSettings() {
    try {
      const res = await fetch(`http://localhost:3001/api/settings`);
      if (!res.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <OptionsContext.Provider value={{ isOpen, setIsOpen, settings, updateSettings, isLoading }}>
      {children}
    </OptionsContext.Provider>
  );
};

// Custom hook to access the options context
export const useOptions = () => {
  const context = React.useContext(OptionsContext);
  if (context === undefined) {
    throw new Error('useOptions must be used within an OptionsProvider');
  }
  return context;
};

export const OptionsDialog: React.FC = () => {
  const { isOpen, setIsOpen } = useOptions();
  return (
    <Dialog open={isOpen}
      onOpenChange={setIsOpen}>
      <SettingsLayout />
    </Dialog>
  );
};
