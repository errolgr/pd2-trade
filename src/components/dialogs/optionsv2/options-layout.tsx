import React, { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import {
  Check,
  Info,
  Keyboard,
  LayoutPanelTop,
  MessageSquare,
  Search,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { usePanel } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { fadeInUp, springSnappy } from '@/lib/motion';
import { cn } from '@/lib/utils';
import SettingGenereal from './appearance/layout';
import SettingsHotkeys from './hotkeys/layout';
import SettingsAbout from './about/layout';
import SettingsAccount from './account/layout';
import SettingsChat from './chat/layout';
import SettingsInterface from './interface/layout';
import SettingsStats from './stats/layout';
import SettingsNetWorth from './networth/layout';
import { SettingsNavContext, type SettingsSectionId } from './settings-ui';

interface INavItem {
  title: SettingsSectionId;
  icon: LucideIcon;
  content: React.ReactNode;
}
const sidebarNavItems: INavItem[] = [
  { title: 'General', icon: SlidersHorizontal, content: <SettingGenereal /> },
  { title: 'Account', icon: UserRound, content: <SettingsAccount /> },
  { title: 'Chat', icon: MessageSquare, content: <SettingsChat /> },
  { title: 'Interface', icon: LayoutPanelTop, content: <SettingsInterface /> },
  { title: 'Price Check', icon: Search, content: <SettingsStats /> },
  { title: 'Net Worth', icon: TrendingUp, content: <SettingsNetWorth /> },
  { title: 'Hotkeys', icon: Keyboard, content: <SettingsHotkeys /> },
  { title: 'About', icon: Info, content: <SettingsAbout /> },
];

const NAV_KEYS: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/** How long after a click/keypress in this window a settings change still counts as "yours" (debounces are ≤500ms). */
const SAVE_ATTRIBUTION_MS = 2500;

/**
 * Flashes "Saved" for a moment when settings change shortly after the user interacted with this window,
 * so background updates (token refresh, other windows) don't trigger it.
 */
function useSavedFlash() {
  const { settings, isLoading } = useOptions();
  const [saved, setSaved] = useState(false);
  const previous = React.useRef<string | null>(null);
  const lastInteraction = React.useRef(0);

  React.useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now();
    };
    window.addEventListener('pointerdown', mark, true);
    window.addEventListener('keydown', mark, true);
    return () => {
      window.removeEventListener('pointerdown', mark, true);
      window.removeEventListener('keydown', mark, true);
    };
  }, []);

  React.useEffect(() => {
    if (isLoading) return;
    const json = JSON.stringify(settings);
    const changed = previous.current !== null && previous.current !== json;
    previous.current = json;
    if (!changed || Date.now() - lastInteraction.current > SAVE_ATTRIBUTION_MS) return;
    setSaved(true);
    const t = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(t);
  }, [settings, isLoading]);

  return saved;
}

const findSection = (section: SettingsSectionId | undefined) =>
  section ? sidebarNavItems.find((i) => i.title === section) : undefined;

export default function SettingsLayout() {
  // keepMounted panel: every openPanel('settings', { section }) switches to that section
  const { close, payload, payloadVersion } = usePanel<'settings'>();
  const [selectedItem, setSelectedItem] = useState<INavItem>(() => findSection(payload?.section) ?? sidebarNavItems[0]);
  const [seenVersion, setSeenVersion] = useState(payloadVersion);
  if (payloadVersion !== seenVersion) {
    setSeenVersion(payloadVersion);
    const requested = findSection(payload?.section);
    if (requested) setSelectedItem(requested);
  }
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const saved = useSavedFlash();

  // Each section starts at the top instead of inheriting the previous scroll offset.
  React.useLayoutEffect(() => {
    scrollRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')?.scrollTo({ top: 0 });
  }, [selectedItem]);

  const goTo = React.useCallback((section: SettingsSectionId) => {
    const item = findSection(section);
    if (item) setSelectedItem(item);
  }, []);

  const onNavKeyDown = (e: React.KeyboardEvent, index: number) => {
    const next = NAV_KEYS[e.key];
    if (!next) return;
    e.preventDefault();
    const target = next(index, sidebarNavItems.length);
    setSelectedItem(sidebarNavItems[target]);
    tabRefs.current[target]?.focus();
  };

  return (
    <MotionConfig reducedMotion="user">
      <WindowPanel className="h-full w-full">
        <WindowChrome
          title={
            <span className="flex items-baseline gap-2">
              <span className="text-[15px]">Settings</span>
              <span className="hidden truncate text-xs font-normal text-muted-foreground md:inline">
                Manage your settings and set preferences
              </span>
            </span>
          }
          gripId="titlebar-drag-handle"
          onClose={close}
          closeLabel="Close settings"
          className="h-12 px-4"
        />

        <SettingsNavContext.Provider value={goTo}>
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-52 shrink-0 flex-col border-r border-border/70 bg-muted/20 p-3 lg:w-56">
              <nav
                role="tablist"
                aria-orientation="vertical"
                aria-label="Settings sections"
                className="flex flex-col gap-0.5"
              >
                {sidebarNavItems.map((item, index) => {
                  const active = item.title === selectedItem.title;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      ref={(el) => {
                        tabRefs.current[index] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`settings-tab-${index}`}
                      aria-selected={active}
                      aria-controls="settings-panel"
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(e) => onNavKeyDown(e, index)}
                      className={cn(
                        'group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium outline-none',
                        'transition-[color,background-color,transform] duration-(--dur-fast) ease-out motion-safe:active:scale-[0.98]',
                        'focus-visible:ring-2 focus-visible:ring-ring/60',
                        active ? 'text-foreground' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="settings-nav-active"
                          transition={springSnappy}
                          aria-hidden
                          className="absolute inset-0 rounded-md border border-border/70 bg-accent shadow-xs"
                        >
                          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />
                        </motion.span>
                      )}
                      <Icon
                        aria-hidden
                        className={cn(
                          'relative size-4 shrink-0 transition-colors duration-(--dur-fast)',
                          active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                        )}
                      />
                      <span className="relative truncate">{item.title}</span>
                    </button>
                  );
                })}
              </nav>

              <div
                aria-live="polite"
                className={cn(
                  'mt-auto flex items-center gap-1.5 px-2.5 pt-3 text-xs transition-colors duration-(--dur-med) ease-out',
                  saved ? 'text-success' : 'text-muted-foreground/80',
                )}
              >
                <Check
                  aria-hidden
                  className={cn(
                    'size-3.5 shrink-0 transition-transform duration-(--dur-med) ease-spring',
                    saved && 'motion-safe:scale-125',
                  )}
                />
                <span>{saved ? 'Saved' : 'Changes save automatically'}</span>
              </div>
            </aside>

            <ScrollArea ref={scrollRef}
              className="min-h-0 flex-1">
              <motion.div
                key={selectedItem.title}
                id="settings-panel"
                role="tabpanel"
                aria-labelledby={`settings-tab-${sidebarNavItems.indexOf(selectedItem)}`}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="mx-auto w-full max-w-3xl px-8 pt-6 pb-10"
              >
                {selectedItem.content}
              </motion.div>
            </ScrollArea>
          </div>
        </SettingsNavContext.Provider>
      </WindowPanel>
    </MotionConfig>
  );
}
