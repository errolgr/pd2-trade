import React, { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Check, type LucideIcon } from 'lucide-react';
import { Button, ScrollArea, cn, PanelChrome, PanelSurface, fadeInUp, springSnappy } from '@pd2-trader/ui';
import { usePanel } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import SettingGenereal from './appearance/layout';
import SettingsHotkeys from './hotkeys/layout';
import SettingsAbout from './about/layout';
import SettingsAccount from './account/layout';
import SettingsChat from './chat/layout';
import SettingsInterface from './interface/layout';
import SettingsStats from './stats/layout';
import SettingsNetWorth from './networth/layout';
import SettingsMarket from './market/layout';
import { SETTINGS_SECTIONS, SettingsNavContext, type SettingsSectionId } from './settings-ui';
import { useTranslation } from '@/i18n';

interface INavItem {
  title: SettingsSectionId;
  titleKey: string;
  icon: LucideIcon;
  content: React.ReactNode;
}
const SECTION_CONTENT: Record<SettingsSectionId, React.ReactNode> = {
  General: <SettingGenereal />,
  Account: <SettingsAccount />,
  Chat: <SettingsChat />,
  Interface: <SettingsInterface />,
  'Price Check': <SettingsStats />,
  Market: <SettingsMarket />,
  'Net Worth': <SettingsNetWorth />,
  Hotkeys: <SettingsHotkeys />,
  About: <SettingsAbout />,
};
const sidebarNavItems: INavItem[] = SETTINGS_SECTIONS.map((section) => ({
  title: section.id,
  titleKey: section.titleKey,
  icon: section.icon,
  content: SECTION_CONTENT[section.id],
}));

/** How long the setting openPanel('settings', { field }) jumps to stays highlighted. */
const FIELD_FLASH_MS = 1600;
/** How long to wait for that setting's row to render (forms show a skeleton until settings load). */
const FIELD_WAIT_MS = 2000;

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

/** The setting asked for by openPanel('settings', { field }); `version` re-triggers the same field on a re-open. */
type FieldRequest = { key: string; version: number } | null;

/**
 * Scrolls the asked-for setting (its `data-setting-key` element, see SettingsRow) into view once it renders, and
 * flashes it.
 */
function useRevealField(field: FieldRequest, rootRef: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const root = rootRef.current;
    if (!field || !root) return;
    const selector = `[data-setting-key="${field.key}"]`;
    let flashed: HTMLElement | null = null;
    let flashTimer: number | undefined;
    const reveal = (el: HTMLElement) => {
      observer.disconnect();
      window.clearTimeout(waitTimer);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      el.setAttribute('data-highlighted', '');
      flashed = el;
      flashTimer = window.setTimeout(() => el.removeAttribute('data-highlighted'), FIELD_FLASH_MS);
    };
    const observer = new MutationObserver(() => {
      const el = root.querySelector<HTMLElement>(selector);
      if (el) reveal(el);
    });
    const waitTimer = window.setTimeout(() => observer.disconnect(), FIELD_WAIT_MS);
    const present = root.querySelector<HTMLElement>(selector);
    if (present) reveal(present);
    else observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(waitTimer);
      window.clearTimeout(flashTimer);
      flashed?.removeAttribute('data-highlighted');
    };
  }, [field, rootRef]);
}

export default function SettingsLayout() {
  const { t } = useTranslation('settings');
  // keepMounted panel: every openPanel('settings', { section, field }) switches to that section (and setting)
  const { close, payload, payloadVersion } = usePanel<'settings'>();
  const [selectedItem, setSelectedItem] = useState<INavItem>(() => findSection(payload?.section) ?? sidebarNavItems[0]);
  const [field, setField] = useState<FieldRequest>(() =>
    payload?.field ? { key: payload.field, version: payloadVersion } : null,
  );
  const [seenVersion, setSeenVersion] = useState(payloadVersion);
  if (payloadVersion !== seenVersion) {
    setSeenVersion(payloadVersion);
    const requested = findSection(payload?.section);
    if (requested) setSelectedItem(requested);
    setField(payload?.field ? { key: payload.field, version: payloadVersion } : null);
  }
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const saved = useSavedFlash();

  // Each section starts at the top instead of inheriting the previous scroll offset.
  React.useLayoutEffect(() => {
    scrollRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]')?.scrollTo({ top: 0 });
  }, [selectedItem]);

  // After the scroll-to-top above: effects run after layout effects
  useRevealField(field, scrollRef);

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
      <PanelSurface className="h-full w-full">
        <PanelChrome
          title={
            <span className="flex items-baseline gap-2">
              <span className="text-base">{t('layout.title')}</span>
              <span className="hidden truncate text-xs font-normal text-muted-foreground md:inline">
                {t('layout.subtitle')}
              </span>
            </span>
          }
          gripId="titlebar-drag-handle"
          onClose={close}
          closeLabel={t('layout.closeLabel')}
          className="h-12 px-4"
        />

        <SettingsNavContext.Provider value={goTo}>
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-52 shrink-0 flex-col border-r border-border/70 bg-muted/20 p-3 lg:w-56">
              <nav
                role="tablist"
                aria-orientation="vertical"
                aria-label={t('layout.navLabel')}
                className="flex flex-col gap-0.5"
              >
                {sidebarNavItems.map((item, index) => {
                  const active = item.title === selectedItem.title;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.title}
                      ref={(el) => {
                        tabRefs.current[index] = el;
                      }}
                      type="button"
                      variant="ghost"
                      size="row"
                      role="tab"
                      id={`settings-tab-${index}`}
                      aria-selected={active}
                      aria-controls="settings-panel"
                      tabIndex={active ? 0 : -1}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(e) => onNavKeyDown(e, index)}
                      className={cn(
                        'group relative h-9 gap-2.5 rounded-md px-2.5 py-0 font-medium aria-selected:bg-transparent',
                        active
                          ? 'text-foreground hover:bg-transparent hover:text-foreground aria-selected:text-foreground'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
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
                      <span className="relative truncate">{t(item.titleKey)}</span>
                    </Button>
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
                <span>{saved ? t('layout.saved') : t('layout.autoSave')}</span>
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
      </PanelSurface>
    </MotionConfig>
  );
}
