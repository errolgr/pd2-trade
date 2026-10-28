import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { useCallback, useEffect } from 'react';
import { readTextFile, writeTextFile, BaseDirectory, mkdir, exists } from '@/lib/browser-fs';
import mergeWith from 'lodash/mergeWith';
import { startDebugLogging, stopDebugLogging } from '@/lib/debug-logger';
import SettingsLayout from '@/components/dialogs/optionsv2/options-layout';
import { isTauri } from '@tauri-apps/api/core';
import { applyTheme, applyWindowTransparency, DEFAULT_THEME_ID, getTheme } from '@/lib/themes';
import { DEFAULT_PRICE_WINDOW_HOURS, type PriceWindowHours } from '@/lib/price-window';
import { DEFAULT_CHAT_TEMPLATES, type ChatTemplate } from '@/lib/message-templates';
import { showToast } from '@/overlay';
import * as Sentry from '@sentry/react';
import type { BuildsMode } from '@/lib/builds-api';
import { applyLanguage, type LanguageSetting } from '@/i18n';

/** A tracked character the builds panel remembers (followed / recently viewed). */
export interface BuildCharacterRef {
  name: string;
  mode: BuildsMode;
}

export type NetWorthTickerAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'above-chat'
  | 'custom';

export interface ISettings {
  ladder: 'ladder' | 'non-ladder';
  mode: 'hardcore' | 'softcore';
  hotkeyModifier: 'ctrl' | 'alt';
  hotkeyKey: string;
  hotkeyModifierListItem: 'ctrl' | 'alt';
  hotkeyKeyListItem: string;
  lastSeenVersion?: string;
  pd2Token?: string;
  pd2RefreshToken?: string;
  pd2TokenExpiry?: number;
  account?: string;
  hotkeyModifierSettings?: 'ctrl' | 'alt';
  hotkeyKeySettings?: string;
  hotkeyModifierCurrencyValuation: 'ctrl' | 'alt';
  hotkeyKeyCurrencyValuation: string;
  hotkeyModifierChat: 'ctrl' | 'alt';
  hotkeyKeyChat: string;
  hotkeyModifierOffers: 'ctrl' | 'alt';
  hotkeyKeyOffers: string;
  hotkeyModifierDelist: 'ctrl' | 'alt';
  hotkeyKeyDelist: string;
  fillStatValue?: number;
  statFillMarginUnit?: 'percent' | 'flat';
  statFillLeaveMinEmpty?: boolean;
  statFillLeaveMaxEmpty?: boolean;
  statDefaultCorruptedFilter?: 'both' | 'corrupted' | 'non-corrupted';
  priceWindowHours?: PriceWindowHours; // Price-check averages: rolling window sent as `hours` (default 7 days)
  rareRankDisplay?: 'bar' | 'blocks'; // Price-check rare appraisal: continuous percentile bar or 6 rank blocks
  rareStatsExpanded?: boolean; // Price-check rare popover: "Stats on this item" open (last state)
  whisperNotificationsEnabled?: boolean; // General/non-trade whispers
  diablo2Directory?: string;
  chatButtonOverlayEnabled?: boolean; // Toggle for chat button overlay visibility
  whisperIgnoreList?: string[];
  whisperAnnouncementsEnabled?: boolean;
  whisperJoinNotificationsEnabled?: boolean;
  tradeNotificationsEnabled?: boolean; // Trade whispers
  whisperNotificationTiming?: 'in-game' | 'out-of-game' | 'both' | 'never'; // When to notify
  whisperNotificationVolume?: number; // Volume for whisper notifications (0-100)
  marketAlertSoundEnabled?: boolean; // Play a sound with market Watch / saved-search alert popups
  marketAlertVolume?: number; // Volume of the market alert sound (0-100)
  acceptOfferMessageTemplate?: string; // Custom message template for accepting offers (without /w *{accountName})
  rejectOfferMessageTemplate?: string; // Custom message template for rejecting offers (without /w *{accountName})
  soldOfferMessageTemplate?: string; // Custom message template for sold items (without /w *{accountName})
  chatTemplates?: ChatTemplate[]; // The user's own chat message templates ("/" in the chat composer), in menu order
  favoriteOfferTemplates?: ('acceptOfferMessageTemplate' | 'rejectOfferMessageTemplate' | 'soldOfferMessageTemplate')[]; // Offer templates starred as chips above the chat composer
  selectedSeasonId?: string; // Selected season for price filtering
  listingNoteMacros?: { label: string; text: string }[]; // Quick-fill note presets for listing items
  toastPopupsEnabled?: boolean; // Master toggle for toast popups
  toastPopupTypes?: string[]; // Which toast types are enabled: 'whispers' | 'trade' | 'joins' | 'offers'
  debugLoggingEnabled?: boolean;
  netWorthTrackingEnabled?: boolean; // history snapshots on pd2trader.com; on unless explicitly turned off
  netWorthTickerEnabled?: boolean;
  netWorthTickerAnchor?: NetWorthTickerAnchor;
  /**
   * Legacy: the old ticker window's dragged top-left in physical screen pixels. No longer written; the ticker
   * migrates it once into the overlay panel layout and clears it.
   */
  netWorthTickerPosition?: { x: number; y: number };
  netWorthTickerOpacity?: number; // 0-100
  netWorthAutoSnapshotMinutes?: number; // 0 = off, otherwise >= 5
  netWorthToastThresholdHr?: number;
  corruptedZoneTimerEnabled?: boolean; // Corrupted zone timer overlay (src/lib/corrupted-zones.ts)
  corruptedZoneTimerAnchor?: NetWorthTickerAnchor;
  corruptedZoneTimerOpacity?: number; // 30-100
  corruptedZoneTimerZones?: 'all' | 'followed'; // timer: every zone, or only followed ones (all while none followed)
  corruptedZoneAlerts?: 'off' | 'all' | 'followed'; // toast when the corrupted zone rotates (any, or a followed one)
  corruptedZoneFollowed?: string[]; // CORRUPTED_ZONES names for the 'followed' timer and toasts
  hotkeyModifierSnapshot?: 'ctrl' | 'alt';
  hotkeyKeySnapshot?: string; // '' = unbound
  hotkeyModifierMarket?: 'ctrl' | 'alt';
  hotkeyKeyMarket?: string; // '' = unbound
  hotkeyModifierBuilds?: 'ctrl' | 'alt';
  hotkeyKeyBuilds?: string; // '' = unbound
  followedBuildCharacters?: BuildCharacterRef[]; // builds panel: starred characters
  recentBuildCharacters?: BuildCharacterRef[]; // builds panel: last viewed characters, newest first
  themeId?: string; // Color theme id from src/lib/themes.ts
  autoUpdateEnabled?: boolean; // false = only notify about new versions, never download/restart automatically
  windowTransparency?: number; // 0-WINDOW_TRANSPARENCY_MAX (%) from src/lib/themes.ts; 0 = opaque
  language?: LanguageSetting; // UI language (src/i18n); 'system' follows the OS language
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
  hotkeyModifier: 'ctrl',
  hotkeyKey: 'd',
  lastSeenVersion: '0.0.0', // fallback version
  hotkeyModifierListItem: 'ctrl',
  hotkeyKeyListItem: 'l',
  hotkeyModifierSettings: 'ctrl',
  hotkeyKeySettings: 'o',
  hotkeyModifierCurrencyValuation: 'ctrl',
  hotkeyKeyCurrencyValuation: 'x',
  hotkeyModifierChat: 'ctrl',
  hotkeyKeyChat: 't',
  hotkeyModifierOffers: 'ctrl',
  hotkeyKeyOffers: 'b',
  hotkeyModifierDelist: 'ctrl',
  hotkeyKeyDelist: 'u',
  fillStatValue: 5,
  statFillMarginUnit: 'percent',
  statFillLeaveMinEmpty: false,
  statFillLeaveMaxEmpty: false,
  statDefaultCorruptedFilter: 'both',
  priceWindowHours: DEFAULT_PRICE_WINDOW_HOURS,
  whisperNotificationsEnabled: true,
  tradeNotificationsEnabled: true,
  whisperNotificationTiming: 'both',
  whisperNotificationVolume: 70,
  marketAlertSoundEnabled: true,
  marketAlertVolume: 70,
  toastPopupsEnabled: true,
  toastPopupTypes: ['whispers', 'trade', 'joins', 'offers', 'networth'],
  chatButtonOverlayEnabled: true,
  acceptOfferMessageTemplate: 'Your offer has been accepted. Game: {gameInfo}',
  rejectOfferMessageTemplate: 'Your offer has been rejected.',
  soldOfferMessageTemplate: 'The item has been sold.',
  chatTemplates: DEFAULT_CHAT_TEMPLATES,
  netWorthTrackingEnabled: true,
  netWorthTickerEnabled: false,
  netWorthTickerAnchor: 'top-center',
  netWorthTickerOpacity: 90,
  netWorthAutoSnapshotMinutes: 15,
  netWorthToastThresholdHr: 0.5,
  corruptedZoneTimerEnabled: false,
  corruptedZoneTimerAnchor: 'top-right',
  corruptedZoneTimerOpacity: 90,
  corruptedZoneTimerZones: 'all',
  corruptedZoneAlerts: 'off',
  corruptedZoneFollowed: [],
  hotkeyModifierSnapshot: 'ctrl',
  hotkeyKeySnapshot: '',
  hotkeyModifierMarket: 'ctrl',
  hotkeyKeyMarket: 'm',
  hotkeyModifierBuilds: 'ctrl',
  hotkeyKeyBuilds: '',
  followedBuildCharacters: [],
  recentBuildCharacters: [],
  themeId: DEFAULT_THEME_ID,
  autoUpdateEnabled: true,
  windowTransparency: 0,
  language: 'system',
};

/** The hotkeys besides the market one, as [modifier field, key field]. */
const OTHER_HOTKEYS: [keyof ISettings, keyof ISettings][] = [
  ['hotkeyModifier', 'hotkeyKey'],
  ['hotkeyModifierListItem', 'hotkeyKeyListItem'],
  ['hotkeyModifierSettings', 'hotkeyKeySettings'],
  ['hotkeyModifierCurrencyValuation', 'hotkeyKeyCurrencyValuation'],
  ['hotkeyModifierChat', 'hotkeyKeyChat'],
  ['hotkeyModifierOffers', 'hotkeyKeyOffers'],
  ['hotkeyModifierDelist', 'hotkeyKeyDelist'],
  ['hotkeyModifierSnapshot', 'hotkeyKeySnapshot'],
  ['hotkeyModifierBuilds', 'hotkeyKeyBuilds'],
];

/**
 * Settings saved before the market hotkey existed get the default Ctrl+M, unless the user already bound that
 * combo to another hotkey: then the market hotkey starts unbound rather than stealing it.
 */
export function migrateMarketHotkey(saved: Record<string, unknown> | null, merged: ISettings): ISettings {
  if (saved?.hotkeyKeyMarket !== undefined) return merged;
  const combo = `${merged.hotkeyModifierMarket}+${merged.hotkeyKeyMarket?.toLowerCase()}`;
  const taken = OTHER_HOTKEYS.some(
    ([modifier, key]) => `${merged[modifier] ?? 'ctrl'}+${String(merged[key] ?? '').toLowerCase()}` === combo,
  );
  return taken ? { ...merged, hotkeyKeyMarket: '' } : merged;
}

const SETTINGS_FILENAME = 'settings.json';
const SETTINGS_DIR = BaseDirectory.AppConfig;

// Create the context for options
const OptionsContext = React.createContext<OptionsContextProps | undefined>(undefined);

// Provider component that wraps your app (or a part of it)
export const OptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [settings, setSettings] = React.useState<ISettings>(DEFAULT_SETTINGS);

  const settingsJsonRef = React.useRef('');

  const updateSettings = useCallback(async (newSettings: Partial<ISettings>) => {
    try {
      await navigator.locks.request('settings-file', async () => {
        let currentSettings: ISettings;
        try {
          const file = await readTextFile(SETTINGS_FILENAME, { baseDir: SETTINGS_DIR });
          currentSettings = JSON.parse(file);
        } catch {
          console.warn('Settings file missing during update, using defaults.');
          currentSettings = DEFAULT_SETTINGS;
        }

        const updated = { ...currentSettings, ...newSettings };
        const updatedJson = JSON.stringify(updated, null, 2);

        // Skip if nothing actually changed
        if (updatedJson === settingsJsonRef.current) return;

        // The config dir can disappear after load (Windows reports os error 3 on write), so recreate it.
        if (!(await exists('', { baseDir: SETTINGS_DIR }))) await mkdir('', { baseDir: SETTINGS_DIR, recursive: true });
        await writeTextFile(SETTINGS_FILENAME, updatedJson, {
          baseDir: SETTINGS_DIR,
        });

        settingsJsonRef.current = updatedJson;
        setSettings(updated);
      });
    } catch (error) {
      // Fixed message: the fs error embeds the user's home path, which would split the Sentry issue per user.
      Sentry.captureException(new Error('Error updating settings'), { extra: { cause: String(error) } });
    }
  }, []);

  async function fetchSettings() {
    try {
      await navigator.locks.request('settings-file', async () => {
        // Use empty string to refer to the base directory itself
        const dirExists = await exists('', { baseDir: SETTINGS_DIR });
        if (!dirExists) {
          console.log('[OptionsProvider] creating config directory...');
          await mkdir('', { baseDir: SETTINGS_DIR, recursive: true });
        }

        const fileExists = await exists(SETTINGS_FILENAME, { baseDir: SETTINGS_DIR });
        if (!fileExists) {
          await writeTextFile(SETTINGS_FILENAME, JSON.stringify(DEFAULT_SETTINGS, null, 2), {
            baseDir: SETTINGS_DIR,
          });
        }

        const file = await readTextFile(SETTINGS_FILENAME, { baseDir: SETTINGS_DIR });
        const parsed = JSON.parse(file);

        // Deep merge parsed into a copy of the defaults. Saved arrays replace the default ones whole (lodash
        // would merge them by index, bringing back removed toast types or deleted chat templates).
        const merged: ISettings = migrateMarketHotkey(
          parsed,
          mergeWith({}, DEFAULT_SETTINGS, parsed, (_default: unknown, saved: unknown) =>
            Array.isArray(saved) ? saved : undefined,
          ),
        );

        const mergedJson = JSON.stringify(merged, null, 2);

        // Write merged settings back to disk if anything was missing
        if (JSON.stringify(parsed) !== JSON.stringify(merged)) {
          await writeTextFile(SETTINGS_FILENAME, mergedJson, {
            baseDir: SETTINGS_DIR,
          });
        }

        // Only update state if settings actually changed
        if (mergedJson !== settingsJsonRef.current) {
          settingsJsonRef.current = mergedJson;
          setSettings(merged);
        }
      });
    } catch (error) {
      console.warn('Error fetching settings', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  // Check for token in URL parameters (browser mode)
  useEffect(() => {
    if (isTauri()) return; // Skip in Tauri mode

    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');

    if (tokenFromUrl && !isLoading) {
      // Only update if we don't already have a token or if it's different
      if (!settings?.pd2Token || settings.pd2Token !== tokenFromUrl) {
        console.log('[OptionsProvider] Token found in URL, updating settings...');
        updateSettings({ pd2Token: tokenFromUrl });

        // Clean up URL by removing token parameter
        urlParams.delete('token');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);

        showToast({
          title: 'PD2 Trader',
          description: 'Token loaded from URL successfully!',
        });
      }
    }
  }, [isLoading, settings?.pd2Token, updateSettings]);

  // Single overlay window, single OptionsProvider: settings side effects (theme, transparency,
  // debug logging) are applied here once loaded. Before that, main.tsx applied the cached theme
  // and initDebugLoggingFromSettings() read the file directly.
  useEffect(() => {
    if (isLoading) return;
    applyTheme(getTheme(settings.themeId));
  }, [isLoading, settings.themeId]);

  useEffect(() => {
    if (isLoading) return;
    applyWindowTransparency(settings.windowTransparency);
  }, [isLoading, settings.windowTransparency]);

  useEffect(() => {
    if (isLoading) return;
    if (settings.debugLoggingEnabled) startDebugLogging();
    else stopDebugLogging();
  }, [isLoading, settings.debugLoggingEnabled]);

  useEffect(() => {
    if (isLoading) return;
    applyLanguage(settings.language);
  }, [isLoading, settings.language]);

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
