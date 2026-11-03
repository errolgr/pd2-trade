import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Search, Trophy } from 'lucide-react';
import { fadeIn, springSnappy } from '@/lib/motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { usePanel, useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { type BuildsFilters, type BuildsMode, EMPTY_BUILDS_FILTERS } from '@/lib/builds-api';
import type { BuildsPanelPayload, BuildsTab } from './lib/types';
import { type BuildsActions, BuildsActionsContext } from './lib/context';
import { marketFiltersFor } from './lib/market-link';
import { MetaTab, toggleListFilter } from './components/MetaTab';
import { CharactersTab, type CharactersView } from './components/CharactersTab';
import { CharacterView } from './components/CharacterView';
import { Segmented } from './components/parts';
import { useTranslation } from '@/i18n';

/** Typing into a field: the panel's shortcuts stand aside. */
const isTextEntry = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** `builds` panel: the ladder meta (pd2trader.com /builds), your characters, and one character's build. */
const BuildsPage: React.FC = () => {
  const { payload, payloadVersion, close, visible } = usePanel<'builds'>();
  const { openPanel } = useOverlay();
  const { settings } = useOptions();
  const { t } = useTranslation('builds');

  const [tab, setTab] = useState<BuildsTab>('meta');
  const [charactersView, setCharactersView] = useState<CharactersView>('mine');
  const [character, setCharacter] = useState<{ name: string; mode?: BuildsMode } | null>(null);
  const [filters, setFilters] = useState<BuildsFilters>(EMPTY_BUILDS_FILTERS);
  const [modeChoice, setModeChoice] = useState<BuildsMode | null>(null);
  /** Names of item filters added from a character (the Meta chips can't look them up in its usage lists). */
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(new Map());
  const [lookup, setLookup] = useState('');
  const lookupRef = useRef<HTMLInputElement>(null);
  const mode: BuildsMode = modeChoice ?? (settings?.mode === 'hardcore' ? 'hardcore' : 'softcore');

  // keepMounted: nothing is fetched until the panel was first shown
  const [activated, setActivated] = useState(false);
  if (visible && !activated) setActivated(true);

  // openPanel('builds', payload), adjusted during render; no payload = keep where it was
  const [handledVersion, setHandledVersion] = useState(-1);
  if (handledVersion !== payloadVersion) {
    setHandledVersion(payloadVersion);
    applyPayload(payload);
  }

  function applyPayload(p: BuildsPanelPayload | undefined) {
    if (!p) return;
    if (p.filters) {
      setFilters({ ...EMPTY_BUILDS_FILTERS, ...p.filters });
      if (p.filters.mode) setModeChoice(p.filters.mode);
      setTab('meta');
    }
    if (p.tab) setTab(p.tab);
    if (p.character) {
      setCharacter({ name: p.character.name, mode: p.character.mode });
      if (p.character.mode) setModeChoice(p.character.mode);
    } else if (p.filters || p.tab) {
      setCharacter(null);
    }
  }

  const showMeta = (next: BuildsFilters) => {
    setFilters(next);
    setTab('meta');
    setCharacter(null);
  };

  const actions = useMemo<BuildsActions>(
    () => ({
      mode,
      openCharacter: (name, m) => setCharacter({ name, mode: m }),
      searchMarket: (item, m) => {
        const marketFilters = marketFiltersFor(item, m ?? mode);
        if (marketFilters) openPanel('market', { filters: marketFilters });
      },
      filterMetaByItem: (item, merc) => {
        const list = merc ? 'mercItems' : 'items';
        setLabels((prev) => new Map(prev).set(item.key, item.name));
        setFilters((f) => (f[list].includes(item.key) ? f : toggleListFilter(f, list, item.key)));
        setTab('meta');
        setCharacter(null);
      },
      showClassMeta: (className) => showMeta({ ...EMPTY_BUILDS_FILTERS, classes: [className] }),
    }),
    [mode, openPanel],
  );

  const changeMode = (next: BuildsMode) => {
    setModeChoice(next);
    // Viewing a character: look for it in the other mode
    if (character) setCharacter({ name: character.name, mode: next });
  };

  const openLookup = () => {
    const name = lookup.trim();
    if (!name) return;
    setCharacter({ name });
    lookupRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !(e.target instanceof HTMLElement)) return;
    if (e.target.closest('[data-radix-popper-content-wrapper]')) return;
    const typing = isTextEntry(e.target);
    if (e.key === 'Escape') {
      e.preventDefault();
      if (typing) {
        e.target.blur();
        e.currentTarget.focus();
      } else if (character) setCharacter(null);
      else close();
    } else if (e.key === '/' && !typing) {
      e.preventDefault();
      lookupRef.current?.focus();
    }
  };

  const view = character ? `character:${character.name.toLowerCase()}` : tab;

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={250}>
        <BuildsActionsContext.Provider value={actions}>
          <WindowPanel
            animate
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="relative z-10 h-full w-full outline-none"
          >
            <WindowChrome
              title={t('page.title')}
              icon={<Trophy className="text-primary" />}
              onClose={close}
              closeLabel={t('page.close')}
              center={
                <form
                  role="search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    openLookup();
                  }}
                  className="relative"
                >
                  <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={lookupRef}
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    placeholder={t('page.lookupPlaceholder')}
                    aria-label={t('page.lookupLabel')}
                    spellCheck={false}
                    autoComplete="off"
                    className="h-7 w-60 rounded-md border border-input bg-background/60 pr-2 pl-7 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </form>
              }
              actions={
                <>
                  <Segmented
                    label={t('page.mode')}
                    layoutId="builds-mode"
                    value={mode}
                    onChange={changeMode}
                    options={[
                      { value: 'softcore', label: 'SC', title: 'Softcore' },
                      { value: 'hardcore', label: 'HC', title: 'Hardcore' },
                    ]}
                  />
                  <Tabs
                    value={character ? '' : tab}
                    onValueChange={(v) => {
                      setTab(v as BuildsTab);
                      setCharacter(null);
                    }}
                  >
                    <TabsList className="h-7 p-0.5">
                      {(['meta', 'characters'] as const).map((value) => (
                        <TabsTrigger
                          key={value}
                          value={value}
                          className="h-6 px-2.5 text-xs after:hidden data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                        >
                          {!character && tab === value && (
                            <motion.span
                              layoutId="builds-tab-active"
                              transition={springSnappy}
                              aria-hidden
                              className="absolute inset-0 rounded-md bg-background shadow-sm"
                            />
                          )}
                          <span className="relative">
                            {value === 'meta' ? t('page.tabs.meta') : t('page.tabs.characters')}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </>
              }
            />
            {activated && (
              <div className="relative min-h-0 flex-1">
                <AnimatePresence mode="wait"
                  initial={false}>
                  <motion.div
                    key={view}
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute inset-0 flex flex-col"
                  >
                    {character ? (
                      <CharacterView name={character.name}
                        mode={character.mode}
                        onBack={() => setCharacter(null)} />
                    ) : tab === 'meta' ? (
                      <MetaTab filters={{ ...filters, mode }}
                        onChange={setFilters}
                        labels={labels} />
                    ) : (
                      <CharactersTab view={charactersView}
                        onView={setCharactersView} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </WindowPanel>
        </BuildsActionsContext.Provider>
      </TooltipProvider>
    </MotionConfig>
  );
};

export default BuildsPage;
