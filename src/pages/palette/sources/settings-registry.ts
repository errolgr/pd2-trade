import type { TFunction } from 'i18next';
import { isTauri } from '@tauri-apps/api/core';
import type { ISettings } from '@/hooks/useOptions';
import type { SettingsSectionId } from '@/components/dialogs/optionsv2/settings-ui';
import {
  ageDayOptions,
  alertSecondsOptions,
  AUTO_DELIST_OPTIONS,
  AUTO_SNAPSHOT_OPTIONS,
  BUYOUT_OPTIONS,
  CHAT_TIMING_OPTIONS,
  CORRUPTED_FILTER_OPTIONS,
  LADDER_OPTIONS,
  LANGUAGE_OPTIONS,
  LISTINGS_VIEW_OPTIONS,
  MARGIN_UNIT_OPTIONS,
  MODE_OPTIONS,
  PAGE_SIZE_OPTIONS,
  PRICE_WINDOW_SELECT_OPTIONS,
  RANK_DISPLAY_OPTIONS,
  SELLER_OPTIONS,
  type SettingOption,
  SORT_OPTIONS,
  TICKER_ANCHOR_OPTIONS,
  TIMER_LAYOUT_OPTIONS,
  TIMER_ZONES_OPTIONS,
  ZONE_ALERT_OPTIONS,
} from '@/components/dialogs/optionsv2/setting-options';
import { HOTKEY_ROWS } from '@/components/dialogs/optionsv2/hotkeys/hotkey-form';
import { formatHotkey } from '../lib/hotkey';
import { getSeasonSettingOptions } from '@/lib/seasons';
import { getTheme, THEMES } from '@pd2-trader/ui/tokens';
import { clampWindowTransparency } from '@/lib/themes';
import { DEFAULT_PRICE_WINDOW_HOURS } from '@/lib/price-window';

/**
 * Every user-facing setting of the Settings window, for the command palette's settings source: where it lives, the
 * label its form row shows (the form's own `settings` keys), extra search terms, and how the palette changes it.
 * Values fall back to the same defaults the forms show.
 */

/** An ISettings key, or a row whose state lives elsewhere (the leaderboard profile is stored server-side). */
export type SettingsFieldKey = keyof ISettings | 'publicProfile';

type Text = (t: TFunction, settings: ISettings) => string;

interface EntryBase {
  key: SettingsFieldKey;
  section: SettingsSectionId;
  /**
   * The row's label as the form shows it: its key, or `label` when it depends on the settings or isn't translated
   * (markup and a trailing colon are stripped for the palette).
   */
  labelKey?: string;
  label?: Text;
  /** Keys of the sub-section / group headings the row sits under: searched like the section name. */
  groupKeys?: string[];
  /** Extra search terms the labels don't contain. */
  keywords?: string[];
  /** Whether the form shows the row now (desktop-only rows, rows shown under another choice). */
  shown?: (settings: ISettings) => boolean;
}

/** A switch: the palette flips it in place. */
export interface BooleanSetting extends EntryBase {
  kind: 'boolean';
  key: keyof ISettings;
  value: (settings: ISettings) => boolean;
  /** The form greys the switch out (e.g. chat notifications while "Notify when" is Never): open Settings instead. */
  disabled?: (settings: ISettings) => boolean;
}

/** A select: the palette drills into its options and sets one in place. */
export interface SelectSetting extends EntryBase {
  kind: 'select';
  key: keyof ISettings;
  /** The current choice, as the select holds it (a string). */
  value: (settings: ISettings) => string;
  options: (settings: ISettings) => SettingOption[];
  /** Saved as a number (the select's strings convert back). */
  numeric?: boolean;
}

/** Anything else (sliders, text, lists, server-side state): the palette opens Settings on the row. */
export interface OpenSetting extends EntryBase {
  kind: 'open';
  /** The current value, shown at the row's end. */
  trailing?: Text;
}

export type SettingEntry = BooleanSetting | SelectSetting | OpenSetting;

const HOTKEY_KEYWORDS = ['hotkey', 'shortcut', 'keybind', 'key'];
const SOUND_KEYWORDS = ['sound', 'volume', 'audio'];
const chatMuted = (s: ISettings) => (s.whisperNotificationTiming || 'both') === 'never';

export const SETTINGS_REGISTRY: readonly SettingEntry[] = [
  // General
  {
    kind: 'select',
    key: 'ladder',
    section: 'General',
    label: () => 'Ladder',
    groupKeys: ['settings:general.game.group'],
    keywords: ['non-ladder', 'realm'],
    value: (s) => s.ladder || 'non-ladder',
    options: () => LADDER_OPTIONS,
  },
  {
    kind: 'select',
    key: 'mode',
    section: 'General',
    labelKey: 'settings:general.game.mode',
    groupKeys: ['settings:general.game.group'],
    keywords: ['softcore', 'hardcore', 'sc', 'hc', 'realm'],
    value: (s) => s.mode || 'softcore',
    options: () => MODE_OPTIONS,
  },
  {
    kind: 'select',
    key: 'selectedSeasonId',
    section: 'General',
    labelKey: 'settings:general.game.season.label',
    groupKeys: ['settings:general.game.group'],
    keywords: ['ladder reset', 'price data'],
    value: (s) => s.selectedSeasonId ?? 'current',
    options: () => getSeasonSettingOptions(),
  },
  {
    kind: 'open',
    key: 'diablo2Directory',
    section: 'General',
    labelKey: 'settings:general.directory.label',
    keywords: ['path', 'folder', 'install', 'game'],
  },
  {
    kind: 'boolean',
    key: 'debugLoggingEnabled',
    section: 'General',
    labelKey: 'settings:general.troubleshooting.debugLogging.label',
    groupKeys: ['settings:general.troubleshooting.group'],
    keywords: ['log', 'logs', 'troubleshoot'],
    value: (s) => s.debugLoggingEnabled ?? false,
  },

  // Account
  {
    kind: 'open',
    key: 'pd2Token',
    section: 'Account',
    labelKey: 'settings:account.token.label',
    groupKeys: ['settings:account.group'],
    keywords: ['token', 'login', 'sign in'],
    shown: () => !isTauri(),
  },
  {
    kind: 'open',
    key: 'account',
    section: 'Account',
    labelKey: 'settings:account.account.label',
    groupKeys: ['settings:account.group'],
    keywords: ['game account', 'login', 'log in', 'sign in', 'log out', 'sign out'],
    trailing: (_t, s) => s.account ?? '',
  },

  // Chat
  {
    kind: 'select',
    key: 'whisperNotificationTiming',
    section: 'Chat',
    labelKey: 'settings:chat.timing.label',
    groupKeys: ['settings:chat.notifications.group'],
    keywords: ['notifications', 'whisper', 'in game', 'out of game', 'mute'],
    value: (s) => s.whisperNotificationTiming || 'both',
    options: () => CHAT_TIMING_OPTIONS,
  },
  {
    kind: 'boolean',
    key: 'whisperNotificationsEnabled',
    section: 'Chat',
    labelKey: 'settings:chat.general.label',
    groupKeys: ['settings:chat.notifications.group'],
    keywords: ['whisper', 'sound'],
    value: (s) => s.whisperNotificationsEnabled ?? true,
    disabled: chatMuted,
  },
  {
    kind: 'boolean',
    key: 'toastPopupsEnabled',
    section: 'Chat',
    labelKey: 'settings:chat.toasts.label',
    groupKeys: ['settings:chat.notifications.group', 'settings:chat.toasts.typesLabel'],
    keywords: ['toast', 'popup', 'notifications', 'whispers', 'offers', 'joins', 'net worth'],
    value: (s) => s.toastPopupsEnabled ?? true,
    disabled: chatMuted,
  },
  {
    kind: 'boolean',
    key: 'tradeNotificationsEnabled',
    section: 'Chat',
    labelKey: 'settings:chat.trade.label',
    groupKeys: ['settings:chat.notifications.group'],
    keywords: ['trade', 'offers', 'sound'],
    value: (s) => s.tradeNotificationsEnabled ?? true,
    disabled: chatMuted,
  },
  {
    kind: 'boolean',
    key: 'whisperAnnouncementsEnabled',
    section: 'Chat',
    labelKey: 'settings:chat.announcements.label',
    groupKeys: ['settings:chat.notifications.group'],
    keywords: ['announcements'],
    value: (s) => s.whisperAnnouncementsEnabled ?? false,
    disabled: chatMuted,
  },
  {
    kind: 'boolean',
    key: 'whisperJoinNotificationsEnabled',
    section: 'Chat',
    labelKey: 'settings:chat.joins.label',
    groupKeys: ['settings:chat.notifications.group'],
    keywords: ['joins', 'player joined', 'game'],
    value: (s) => s.whisperJoinNotificationsEnabled ?? false,
    disabled: chatMuted,
  },
  {
    kind: 'open',
    key: 'whisperIgnoreList',
    section: 'Chat',
    labelKey: 'settings:chat.ignore.label',
    groupKeys: ['settings:chat.ignore.group'],
    keywords: ['block', 'mute', 'players'],
    trailing: (t, s) => {
      const count = s.whisperIgnoreList?.length ?? 0;
      return count > 0 ? t('settings:chat.ignore.count', { count }) : '';
    },
  },
  {
    kind: 'open',
    key: 'whisperNotificationVolume',
    section: 'Chat',
    label: (t, s) => t('settings:chat.sound.notificationVolume.label', { value: s.whisperNotificationVolume ?? 70 }),
    groupKeys: ['settings:chat.sound.group'],
    keywords: [...SOUND_KEYWORDS, 'whisper'],
  },
  {
    kind: 'open',
    key: 'chatTemplates',
    section: 'Chat',
    labelKey: 'settings:chatTemplates.listLabel',
    groupKeys: ['settings:chat.templates.group'],
    keywords: ['templates', 'macros', 'messages'],
  },
  {
    kind: 'open',
    key: 'acceptOfferMessageTemplate',
    section: 'Chat',
    labelKey: 'settings:chat.templates.accept.label',
    groupKeys: ['settings:chat.templates.group'],
    keywords: ['offer', 'accept', 'message'],
  },
  {
    kind: 'open',
    key: 'rejectOfferMessageTemplate',
    section: 'Chat',
    labelKey: 'settings:chat.templates.reject.label',
    groupKeys: ['settings:chat.templates.group'],
    keywords: ['offer', 'reject', 'decline', 'message'],
  },
  {
    kind: 'open',
    key: 'soldOfferMessageTemplate',
    section: 'Chat',
    labelKey: 'settings:chat.templates.sold.label',
    groupKeys: ['settings:chat.templates.group'],
    keywords: ['offer', 'sold', 'message'],
  },

  // Interface
  {
    kind: 'select',
    key: 'language',
    section: 'Interface',
    labelKey: 'settings:interface.language.label',
    groupKeys: ['settings:interface.language.group'],
    keywords: ['language', 'locale', 'translation'],
    value: (s) => s.language ?? 'system',
    options: () => LANGUAGE_OPTIONS,
  },
  {
    kind: 'boolean',
    key: 'chatButtonOverlayEnabled',
    section: 'Interface',
    labelKey: 'settings:interface.chatButton.label',
    groupKeys: ['settings:interface.overlays'],
    keywords: ['chat button', 'overlay', 'floating'],
    value: (s) => s.chatButtonOverlayEnabled ?? true,
  },
  {
    kind: 'open',
    key: 'windowTransparency',
    section: 'Interface',
    label: (t, s) =>
      t('settings:interface.windowTransparency.label', { value: clampWindowTransparency(s.windowTransparency) }),
    groupKeys: ['settings:interface.overlays'],
    keywords: ['transparency', 'opacity', 'transparent', 'see-through', 'background'],
  },
  {
    kind: 'select',
    key: 'themeId',
    section: 'Interface',
    labelKey: 'settings:sections.theme.title',
    groupKeys: ['settings:theme.groupLabel'],
    keywords: ['theme', 'color', 'colour', 'dark', 'light', 'appearance', 'skin'],
    value: (s) => getTheme(s.themeId).id,
    options: () => THEMES.map((theme) => ({ value: theme.id, label: theme.name })),
  },
  {
    kind: 'boolean',
    key: 'corruptedZoneTimerEnabled',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.enabled.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'tz', 'corrupted', 'timer', 'overlay'],
    value: (s) => s.corruptedZoneTimerEnabled ?? false,
  },
  {
    kind: 'select',
    key: 'corruptedZoneTimerAnchor',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.position.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'position', 'anchor', 'corner'],
    value: (s) => s.corruptedZoneTimerAnchor ?? 'top-right',
    options: () => TICKER_ANCHOR_OPTIONS,
  },
  {
    kind: 'boolean',
    key: 'corruptedZoneTimerLocked',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.locked.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'lock', 'drag'],
    value: (s) => s.corruptedZoneTimerLocked ?? false,
  },
  {
    kind: 'select',
    key: 'corruptedZoneTimerLayout',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.layout.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'horizontal', 'vertical'],
    value: (s) => s.corruptedZoneTimerLayout ?? 'horizontal',
    options: () => TIMER_LAYOUT_OPTIONS,
  },
  {
    kind: 'open',
    key: 'corruptedZoneTimerOpacity',
    section: 'Interface',
    label: (t, s) => t('settings:interface.zoneTimer.opacity', { value: s.corruptedZoneTimerOpacity ?? 90 }),
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'opacity', 'transparency'],
  },
  {
    kind: 'select',
    key: 'corruptedZoneTimerZones',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.zones.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'followed'],
    value: (s) => s.corruptedZoneTimerZones ?? 'all',
    options: () => TIMER_ZONES_OPTIONS,
  },
  {
    kind: 'select',
    key: 'corruptedZoneAlerts',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.alerts.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'alerts', 'toast', 'notify'],
    value: (s) => s.corruptedZoneAlerts ?? 'off',
    options: () => ZONE_ALERT_OPTIONS,
  },
  {
    kind: 'open',
    key: 'corruptedZoneAlertLeadMinutes',
    section: 'Interface',
    label: (t, s) => {
      const minutes = s.corruptedZoneAlertLeadMinutes ?? 0;
      return minutes === 0
        ? t('settings:interface.zoneTimer.lead.atStart')
        : t('settings:interface.zoneTimer.lead.before', { count: minutes });
    },
    groupKeys: ['settings:sections.zoneTimer.title', 'settings:interface.zoneTimer.lead.ariaLabel'],
    keywords: ['terror zone', 'corrupted', 'minutes', 'early', 'ahead'],
    shown: (s) => (s.corruptedZoneAlerts ?? 'off') !== 'off',
  },
  {
    kind: 'open',
    key: 'corruptedZoneFollowed',
    section: 'Interface',
    labelKey: 'settings:interface.zoneTimer.followed.label',
    groupKeys: ['settings:sections.zoneTimer.title'],
    keywords: ['terror zone', 'corrupted', 'follow', 'zones'],
    shown: (s) => s.corruptedZoneAlerts === 'followed' || s.corruptedZoneTimerZones === 'followed',
    trailing: (t, s) => {
      const count = s.corruptedZoneFollowed?.length ?? 0;
      return count > 0 ? t('settings:zonePicker.followedCount', { count }) : '';
    },
  },

  // Price check
  {
    kind: 'select',
    key: 'priceWindowHours',
    section: 'Price Check',
    labelKey: 'settings:stats.priceWindow.label',
    groupKeys: ['settings:stats.prices.group'],
    keywords: ['price', 'average', 'sales', 'days', 'hours'],
    value: (s) => String(s.priceWindowHours ?? DEFAULT_PRICE_WINDOW_HOURS),
    options: () => PRICE_WINDOW_SELECT_OPTIONS,
    numeric: true,
  },
  {
    kind: 'open',
    key: 'fillStatValue',
    section: 'Price Check',
    label: (t, s) =>
      (s.statFillMarginUnit ?? 'percent') === 'percent'
        ? t('settings:stats.fillStatValue.labelPercent')
        : t('settings:stats.fillStatValue.labelFlat'),
    groupKeys: ['settings:stats.statRanges.group'],
    keywords: ['margin', 'stat range', 'fill'],
    trailing: (_t, s) => {
      const value = s.fillStatValue ?? 5;
      return (s.statFillMarginUnit ?? 'percent') === 'percent' ? `±${value}%` : `±${value}`;
    },
  },
  {
    kind: 'select',
    key: 'statFillMarginUnit',
    section: 'Price Check',
    labelKey: 'settings:stats.marginUnit.label',
    groupKeys: ['settings:stats.statRanges.group'],
    keywords: ['margin', 'percent', 'flat', 'stat range'],
    value: (s) => s.statFillMarginUnit ?? 'percent',
    options: () => MARGIN_UNIT_OPTIONS,
  },
  {
    kind: 'boolean',
    key: 'statFillLeaveMinEmpty',
    section: 'Price Check',
    labelKey: 'settings:stats.leaveMinEmpty.label',
    groupKeys: ['settings:stats.statRanges.group'],
    keywords: ['minimum', 'stat range', 'blank'],
    value: (s) => s.statFillLeaveMinEmpty ?? false,
  },
  {
    kind: 'boolean',
    key: 'statFillLeaveMaxEmpty',
    section: 'Price Check',
    labelKey: 'settings:stats.leaveMaxEmpty.label',
    groupKeys: ['settings:stats.statRanges.group'],
    keywords: ['maximum', 'stat range', 'blank'],
    value: (s) => s.statFillLeaveMaxEmpty ?? false,
  },
  {
    kind: 'select',
    key: 'statDefaultCorruptedFilter',
    section: 'Price Check',
    labelKey: 'settings:stats.corruptedFilter.label',
    groupKeys: ['settings:stats.filters.group'],
    keywords: ['corrupted', 'corruption', 'filter'],
    value: (s) => s.statDefaultCorruptedFilter ?? 'both',
    options: () => CORRUPTED_FILTER_OPTIONS,
  },
  {
    kind: 'select',
    key: 'rareRankDisplay',
    section: 'Price Check',
    labelKey: 'settings:stats.rankDisplay.label',
    groupKeys: ['settings:stats.rareAppraisal.group'],
    keywords: ['rare', 'appraisal', 'rank', 'bar', 'blocks'],
    value: (s) => s.rareRankDisplay ?? 'bar',
    options: () => RANK_DISPLAY_OPTIONS,
  },

  // Market
  {
    kind: 'select',
    key: 'stashAutoDelist',
    section: 'Market',
    labelKey: 'settings:market.listings.autoDelist.label',
    groupKeys: ['settings:market.listings.group'],
    keywords: ['delist', 'auto delist', 'stash', 'listings'],
    value: (s) => s.stashAutoDelist ?? 'ask',
    options: () => AUTO_DELIST_OPTIONS,
  },
  {
    kind: 'select',
    key: 'myListingsView',
    section: 'Market',
    labelKey: 'settings:market.listings.view.label',
    groupKeys: ['settings:market.listings.group'],
    keywords: ['listings', 'cards', 'rows', 'compact'],
    value: (s) => s.myListingsView ?? 'cards',
    options: () => LISTINGS_VIEW_OPTIONS,
  },
  {
    kind: 'select',
    key: 'marketDefaultSort',
    section: 'Market',
    labelKey: 'settings:market.browser.sort.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['sort', 'order', 'newest', 'cheapest'],
    value: (s) => s.marketDefaultSort ?? 'newest',
    options: () => SORT_OPTIONS,
  },
  {
    kind: 'select',
    key: 'marketDefaultSeller',
    section: 'Market',
    labelKey: 'settings:market.browser.seller.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['seller', 'online', 'in game', 'filter'],
    value: (s) => s.marketDefaultSeller ?? 'all',
    options: () => SELLER_OPTIONS,
  },
  {
    kind: 'select',
    key: 'marketDefaultHasBuyout',
    section: 'Market',
    labelKey: 'settings:market.browser.buyout.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['buyout', 'bo', 'filter'],
    value: (s) => s.marketDefaultHasBuyout ?? 'any',
    options: () => BUYOUT_OPTIONS,
  },
  {
    kind: 'select',
    key: 'marketDefaultMaxAgeDays',
    section: 'Market',
    labelKey: 'settings:market.browser.age.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['age', 'days', 'old', 'filter'],
    value: (s) => String(s.marketDefaultMaxAgeDays ?? 3),
    options: (s) => ageDayOptions(s.marketDefaultMaxAgeDays ?? 3),
    numeric: true,
  },
  {
    kind: 'select',
    key: 'marketPageSize',
    section: 'Market',
    labelKey: 'settings:market.browser.pageSize.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['page size', 'results'],
    value: (s) => String(s.marketPageSize ?? 25),
    options: () => PAGE_SIZE_OPTIONS,
    numeric: true,
  },
  {
    kind: 'open',
    key: 'marketWhisperTemplate',
    section: 'Market',
    labelKey: 'settings:market.browser.whisper.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['whisper', 'copy', 'message', 'template'],
  },
  {
    kind: 'boolean',
    key: 'marketShowDealBadges',
    section: 'Market',
    labelKey: 'settings:market.browser.dealBadges.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['deal', 'badge', 'price'],
    value: (s) => s.marketShowDealBadges ?? true,
  },
  {
    kind: 'boolean',
    key: 'marketShowPriceHistory',
    section: 'Market',
    labelKey: 'settings:market.browser.priceHistory.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['price', 'history', 'chart'],
    value: (s) => s.marketShowPriceHistory ?? true,
  },
  {
    kind: 'boolean',
    key: 'marketShowSellerCard',
    section: 'Market',
    labelKey: 'settings:market.browser.sellerCard.label',
    groupKeys: ['settings:market.browser.group'],
    keywords: ['seller', 'card'],
    value: (s) => s.marketShowSellerCard ?? true,
  },
  {
    kind: 'select',
    key: 'marketAlertToastSeconds',
    section: 'Market',
    labelKey: 'settings:market.alerts.duration.label',
    groupKeys: ['settings:market.alerts.group'],
    keywords: ['alert', 'popup', 'toast', 'seconds', 'watch'],
    value: (s) => String(s.marketAlertToastSeconds ?? 8),
    options: (s) => alertSecondsOptions(s.marketAlertToastSeconds ?? 8),
    numeric: true,
  },
  {
    kind: 'boolean',
    key: 'marketAlertSoundEnabled',
    section: 'Market',
    labelKey: 'settings:market.alerts.sound.label',
    groupKeys: ['settings:market.alerts.group'],
    keywords: [...SOUND_KEYWORDS, 'alert', 'watch'],
    value: (s) => s.marketAlertSoundEnabled ?? true,
  },
  {
    kind: 'open',
    key: 'marketAlertVolume',
    section: 'Market',
    label: (t, s) => t('settings:market.alerts.volume.label', { value: s.marketAlertVolume ?? 70 }),
    groupKeys: ['settings:market.alerts.group'],
    keywords: [...SOUND_KEYWORDS, 'alert'],
  },

  // Net worth
  {
    kind: 'boolean',
    key: 'netWorthTrackingEnabled',
    section: 'Net Worth',
    labelKey: 'settings:networth.history.tracking.label',
    groupKeys: ['settings:networth.history.group'],
    keywords: ['net worth', 'history', 'snapshots', 'tracking'],
    value: (s) => s.netWorthTrackingEnabled !== false,
  },
  {
    kind: 'select',
    key: 'netWorthAutoSnapshotMinutes',
    section: 'Net Worth',
    labelKey: 'settings:networth.history.autoSnapshot.label',
    groupKeys: ['settings:networth.history.group'],
    keywords: ['net worth', 'snapshot', 'interval', 'minutes'],
    value: (s) => String(s.netWorthAutoSnapshotMinutes ?? 15),
    options: () => AUTO_SNAPSHOT_OPTIONS,
    numeric: true,
  },
  {
    kind: 'open',
    key: 'publicProfile',
    section: 'Net Worth',
    labelKey: 'settings:publicProfile.optedIn',
    groupKeys: ['settings:publicProfile.group'],
    keywords: ['leaderboard', 'public', 'profile', 'holdings', 'display name'],
  },
  {
    kind: 'boolean',
    key: 'netWorthTickerEnabled',
    section: 'Net Worth',
    labelKey: 'settings:networth.ticker.enabled.label',
    groupKeys: ['settings:networth.ticker.group'],
    keywords: ['net worth', 'ticker', 'overlay', 'hr'],
    value: (s) => s.netWorthTickerEnabled ?? false,
  },
  {
    kind: 'select',
    key: 'netWorthTickerAnchor',
    section: 'Net Worth',
    labelKey: 'settings:networth.ticker.position.label',
    groupKeys: ['settings:networth.ticker.group'],
    keywords: ['net worth', 'ticker', 'position', 'anchor', 'corner'],
    value: (s) => s.netWorthTickerAnchor ?? 'top-center',
    options: () => TICKER_ANCHOR_OPTIONS,
  },
  {
    kind: 'open',
    key: 'netWorthTickerOpacity',
    section: 'Net Worth',
    label: (t, s) => t('settings:networth.ticker.opacity', { value: s.netWorthTickerOpacity ?? 90 }),
    groupKeys: ['settings:networth.ticker.group'],
    keywords: ['net worth', 'ticker', 'opacity', 'transparency'],
  },
  {
    kind: 'open',
    key: 'netWorthToastThresholdHr',
    section: 'Net Worth',
    labelKey: 'settings:networth.toastThreshold.label',
    groupKeys: ['settings:networth.toastThreshold.group'],
    keywords: ['net worth', 'toast', 'threshold', 'notification'],
    trailing: (_t, s) => `${s.netWorthToastThresholdHr ?? 0.5} HR`,
  },

  // Hotkeys
  ...HOTKEY_ROWS.map(
    (row): OpenSetting => ({
      kind: 'open',
      key: row.key,
      section: 'Hotkeys',
      labelKey: `settings:${row.labelKey}`,
      groupKeys: ['settings:hotkeys.group'],
      keywords: HOTKEY_KEYWORDS,
      trailing: (t, s) => formatHotkey(s[row.modifier], s[row.key]) ?? t('settings:hotkeys.off'),
    }),
  ),

  // About
  {
    kind: 'boolean',
    key: 'autoUpdateEnabled',
    section: 'About',
    labelKey: 'settings:about.updates.auto.label',
    groupKeys: ['settings:about.updates.group'],
    keywords: ['update', 'upgrade', 'version'],
    value: (s) => s.autoUpdateEnabled ?? true,
    shown: () => isTauri(),
  },
];

/** A form label as plain text: without its markup (`<num>…</num>`) and a trailing colon ("Notify when:"). */
export const plainLabel = (text: string) => text.replace(/<\/?\w+>/g, '').replace(/\s*[:：]\s*$/, '');
