import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import SettingsLayout from '@/components/dialogs/optionsv2/options-layout';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { appConfigDir } from '@tauri-apps/api/path';
import { readTextFile, writeTextFile, BaseDirectory, mkdir, exists} from '@tauri-apps/plugin-fs';

interface ISettings {
  ladder: 'ladder' | 'non-ladder';
  mode: 'hardcore' | 'softcore';
}

interface OptionsContextProps {
  isOpen: boolean;
  isLoading: boolean;
  setIsOpen: (open: boolean) => void;
  settings: ISettings;
  updateSettings: (newSettings: Partial<ISettings>) => void;
}

const DEFAULT_SETTINGS: ISettings = {
  mode: 'softcore',
  ladder: 'ladder',
};

const SETTINGS_FILENAME = 'settings.json';
const SETTINGS_DIR = BaseDirectory.AppConfig;

// Create the context for options
const OptionsContext = React.createContext<OptionsContextProps | undefined>(undefined);

// Provider component that wraps your app (or a part of it)
export const OptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<ISettings>(DEFAULT_SETTINGS);


  const updateSettings = useCallback(async (newSettings: Partial<ISettings>) => {
    try {
      let currentSettings: ISettings;
      try {
        const file = await readTextFile(SETTINGS_FILENAME, { baseDir: SETTINGS_DIR });
        currentSettings = JSON.parse(file);
      } catch {
        console.warn('Settings file missing during update, using defaults.');
        currentSettings = DEFAULT_SETTINGS;
      }

      const updated = { ...currentSettings, ...newSettings };

      await writeTextFile(SETTINGS_FILENAME, JSON.stringify(updated, null, 2), {
        baseDir: SETTINGS_DIR,
      });

      setSettings(updated);
      toast.success('Settings have been updated...');
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, []);

  async function fetchSettings() {
    try {
      const dirExists = await exists('.', { baseDir: SETTINGS_DIR });
      if (!dirExists) {
        await mkdir('.', { baseDir: SETTINGS_DIR, recursive: true });
      }

      const fileExists = await exists(SETTINGS_FILENAME, { baseDir: SETTINGS_DIR });
      if (!fileExists) {
        await writeTextFile(SETTINGS_FILENAME, JSON.stringify(DEFAULT_SETTINGS, null, 2), {
          baseDir: SETTINGS_DIR,
        });
      }

      const file = await readTextFile(SETTINGS_FILENAME, { baseDir: SETTINGS_DIR });
      const parsed = JSON.parse(file);
      setSettings(parsed);
    } catch (error) {
      console.warn('Error fetching settings' + error);
      setSettings(DEFAULT_SETTINGS);
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
