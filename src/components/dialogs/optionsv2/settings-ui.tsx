import * as React from 'react';
import {
  ArrowRight,
  Info,
  Keyboard,
  LayoutPanelTop,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Store,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@pd2-trader/ui';

/**
 * App-specific settings navigation: section ids, sidebar entries and cross-section links. The generic building
 * blocks (SettingsSection, SettingsGroup, SettingsRow, SettingsHint, SettingsSkeleton) live in @pd2-trader/ui.
 */

export type SettingsSectionId =
  | 'General'
  | 'Account'
  | 'Chat'
  | 'Interface'
  | 'Price Check'
  | 'Market'
  | 'Net Worth'
  | 'Hotkeys'
  | 'About';

/** The sections in sidebar order, with their nav label and icon. */
export const SETTINGS_SECTIONS: readonly { id: SettingsSectionId; titleKey: string; icon: LucideIcon }[] = [
  { id: 'General', titleKey: 'settings:nav.general', icon: SlidersHorizontal },
  { id: 'Account', titleKey: 'settings:nav.account', icon: UserRound },
  { id: 'Chat', titleKey: 'settings:nav.chat', icon: MessageSquare },
  { id: 'Interface', titleKey: 'settings:nav.interface', icon: LayoutPanelTop },
  { id: 'Price Check', titleKey: 'settings:nav.priceCheck', icon: Search },
  { id: 'Market', titleKey: 'settings:nav.market', icon: Store },
  { id: 'Net Worth', titleKey: 'settings:nav.netWorth', icon: TrendingUp },
  { id: 'Hotkeys', titleKey: 'settings:nav.hotkeys', icon: Keyboard },
  { id: 'About', titleKey: 'settings:nav.about', icon: Info },
];

/** Lets a form jump to another settings section (e.g. "configured under Hotkeys"). */
export const SettingsNavContext = React.createContext<((section: SettingsSectionId) => void) | null>(null);

/**
 * Link-styled button that switches to another settings section; plain text outside the settings window.
 * `children` is optional for use as a <Trans> component, which supplies the translated link text.
 */
export function SettingsLink({ to, children }: { to: SettingsSectionId; children?: React.ReactNode }) {
  const go = React.useContext(SettingsNavContext);
  if (!go) return <>{children}</>;
  return (
    <Button type="button"
      variant="link"
      size="inline"
      onClick={() => go(to)}
      className="group/link gap-0.5 rounded-sm">
      {children}
      <ArrowRight className="size-3 transition-transform duration-(--dur-fast) ease-out group-hover/link:translate-x-0.5" />
    </Button>
  );
}
