import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, Pin, PinOff, Search, X } from 'lucide-react';
import { cn } from '@pd2-trader/ui';
import { DUR, EASE_OUT } from '@/lib/motion';
import { useOptions } from '@/hooks/useOptions';
import { useSignIn } from '@/hooks/useSignIn';
import { showToast, useOverlay, usePanel } from '@/overlay';
import { useTranslation } from '@/i18n';
import { useActionsSource } from './sources/actions';
import { useItemsSource } from './sources/items';
import { useBuildsSource } from './sources/builds';
import { useChatSource } from './sources/chat';
import { useListingsSource } from './sources/listings';
import { useSettingsSource } from './sources/settings';
import {
  PALETTE_MIXED_LIMIT,
  PALETTE_SCOPED_LIMIT,
  boostRecents,
  groupOfId,
  isPinned,
  pushRecent,
  refsForGroup,
  shownRecents,
  tabScope,
  togglePin,
} from './lib/compose';
import { formatHotkey } from './lib/hotkey';
import {
  PALETTE_GROUPS,
  type PaletteAction,
  type PaletteGroupId,
  type PaletteItem,
  type PaletteRunContext,
  type PaletteScope,
  type PaletteSourceInput,
  type PaletteSourceResult,
} from './lib/types';

const SIGN_IN_ROW = 'palette:signIn';
const NO_REFS: never[] = [];

interface Section {
  key: string;
  heading: string;
  items: PaletteItem[];
}

/** The command palette: one search over actions, items, builds, chat, listings and settings (see lib/types.ts). */
export default function PalettePage() {
  const { t } = useTranslation('palette');
  const { close } = usePanel<'palette'>();
  const { openPanel } = useOverlay();
  const { settings, updateSettings } = useOptions();
  const { openSignIn } = useSignIn();
  const [query, setQuery] = useState('');
  const [scopes, setScopes] = useState<PaletteScope[]>([]);
  const [selected, setSelected] = useState('');
  const [menuFor, setMenuFor] = useState<PaletteItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();
  const scope = scopes.at(-1) ?? null;
  const pins = settings.palettePins ?? NO_REFS;
  const recents = settings.paletteRecents ?? NO_REFS;

  const groupLabels = useMemo(
    () => Object.fromEntries(PALETTE_GROUPS.map((g) => [g, t(`groups.${g}`)])) as Record<PaletteGroupId, string>,
    [t],
  );

  // One stable input per group: sources may key effects on refs / scope
  const inputs = useMemo(() => {
    const idle: PaletteSourceInput = { query: '', scope: null, limit: 0, refs: NO_REFS };
    return Object.fromEntries(
      PALETTE_GROUPS.map((group): [PaletteGroupId, PaletteSourceInput] => {
        if (scope && scope.group !== group) return [group, idle];
        return [
          group,
          {
            query: q,
            scope: scope?.group === group ? scope : null,
            limit: scope ? PALETTE_SCOPED_LIMIT : PALETTE_MIXED_LIMIT,
            refs: q ? NO_REFS : refsForGroup(pins, recents, group),
          },
        ];
      }),
    ) as Record<PaletteGroupId, PaletteSourceInput>;
  }, [pins, q, recents, scope]);

  // Fixed order (hooks): PALETTE_GROUPS
  const results: Record<PaletteGroupId, PaletteSourceResult> = {
    actions: useActionsSource(inputs.actions),
    items: useItemsSource(inputs.items),
    builds: useBuildsSource(inputs.builds),
    chat: useChatSource(inputs.chat),
    listings: useListingsSource(inputs.listings),
    settings: useSettingsSource(inputs.settings),
  };
  const visibleGroups = scope ? [scope.group] : PALETTE_GROUPS;
  const loading = visibleGroups.some((g) => results[g].loading);
  const signedOut = !!q || !!scope ? visibleGroups.some((g) => results[g].signedOut) : false;

  const sections: Section[] = (() => {
    if (!q && !scope) {
      const byId = new Map(PALETTE_GROUPS.flatMap((g) => results[g].items).map((item) => [item.ref.id, item]));
      const resolve = (refs: typeof pins) => refs.flatMap((r) => byId.get(r.id) ?? []);
      return [
        { key: 'pinned', heading: t('groups.pinned'), items: resolve(pins) },
        { key: 'recent', heading: t('groups.recent'), items: resolve(shownRecents(pins, recents)) },
      ];
    }
    return visibleGroups.map((g) => ({
      key: g,
      heading: groupLabels[g],
      // Scoped with nothing typed: the source's own list (an account's characters, a setting's options)
      items: q ? boostRecents(results[g].items, recents, inputs[g].limit) : results[g].items,
    }));
  })().filter((s) => s.items.length > 0);

  const itemsById = new Map(sections.flatMap((s) => s.items).map((item) => [item.ref.id, item]));
  const visibleIds = [...itemsById.keys(), ...(signedOut ? [SIGN_IN_ROW] : [])];
  const visibleKey = visibleIds.join('\n');
  // Typo matches are listed in place but never highlighted first: Enter takes the best real match
  const firstId = visibleIds.find((id) => !itemsById.get(id)?.weak) ?? visibleIds[0] ?? '';

  // The highlight follows the first row (results arriving from the server reorder the list) until the user moves it
  // with the arrow keys or the pointer; a new query or scope hands it back to the first row
  const [userMoved, setUserMoved] = useState(false);
  useEffect(() => setUserMoved(false), [q, scope]);
  useEffect(() => {
    if (!userMoved || !visibleKey.split('\n').includes(selected)) setSelected(firstId);
  }, [visibleKey, firstId, selected, userMoved]);

  const pushScope = useCallback((next: PaletteScope, keepQuery = false) => {
    setScopes((current) => [...current, next]);
    if (!keepQuery) setQuery('');
    setMenuFor(null);
  }, []);

  const popScope = useCallback(() => setScopes((current) => current.slice(0, -1)), []);

  const run = useCallback(
    (item: PaletteItem, action: PaletteAction) => {
      updateSettings({ paletteRecents: pushRecent(recents, item.ref) });
      const ctx: PaletteRunContext = { openPanel, close, scope: (s) => pushScope(s) };
      // Run first: an action that opens a panel claims the keyboard before the palette lets go of it
      Promise.resolve()
        .then(() => action.run(ctx))
        .catch((error: unknown) => {
          console.error('[Palette] Action failed:', error);
          showToast({ title: t('errors.actionFailed'), description: String(error), variant: 'error' });
        });
      if (action.keepOpen) {
        setMenuFor(null);
        inputRef.current?.focus();
      } else close();
    },
    [close, openPanel, pushScope, recents, t, updateSettings],
  );

  const openMenu = () => {
    const item = itemsById.get(selected);
    if (item) setMenuFor(item);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') setUserMoved(true);
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (scope) return;
      const target = tabScope(query, groupLabels, groupOfId(selected));
      if (target) pushScope(target.scope, target.keepQuery);
    } else if (e.key === 'Backspace' && query === '' && scope) {
      e.preventDefault();
      popScope();
    } else if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || isCaretAtEnd(e)) {
      e.preventDefault();
      openMenu();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  const paletteHotkey = formatHotkey(settings.hotkeyModifierPalette, settings.hotkeyKeyPalette);
  const empty = !!q && sections.length === 0 && !signedOut && !loading;

  return (
    <div className="flex h-full w-full items-start justify-center">
      <div
        data-interactive="true"
        // The action menu sits over the bottom-right of the card: a short result list grows to fit it
        className={cn(
          'pointer-events-auto relative flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-surface-foreground shadow-panel backdrop-blur-md',
          menuFor && 'min-h-80',
        )}
      >
        <Command
          label={t('input.label')}
          shouldFilter={false}
          value={selected}
          onValueChange={setSelected}
          loop
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="relative flex h-13 shrink-0 items-center gap-2.5 border-b border-border/60 px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            {scope && (
              <button
                type="button"
                onClick={() => {
                  popScope();
                  inputRef.current?.focus();
                }}
                aria-label={t('scope.remove', { label: scope.label ?? groupLabels[scope.group] })}
                className="flex shrink-0 items-center gap-1 rounded-full border border-primary/60 bg-primary/15 px-2.5 py-0.5 text-xs text-primary"
              >
                {scope.label ?? groupLabels[scope.group]}
                <X className="h-3 w-3" />
              </button>
            )}
            <Command.Input
              ref={inputRef}
              autoFocus
              value={query}
              onValueChange={setQuery}
              onKeyDown={onInputKeyDown}
              placeholder={scope ? t('input.scopedPlaceholder') : t('input.placeholder')}
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {!scope && <span className="shrink-0 text-xs text-muted-foreground">{t('scope.tabHint')}</span>}
            <AnimatePresence>
              {loading && (
                <motion.div
                  role="progressbar"
                  aria-label={t('loading')}
                  className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.fast }}
                >
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-primary/70"
                    initial={{ x: '-100%' }}
                    animate={{ x: '300%' }}
                    transition={{ duration: 1.1, ease: EASE_OUT, repeat: Infinity }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Command.List
            onPointerMove={() => setUserMoved(true)}
            className="min-h-0 overflow-y-auto overscroll-contain px-1.5 py-1.5 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {sections.map((section) => (
              <Command.Group key={section.key}
                heading={section.heading}>
                {section.items.map((item) => (
                  <PaletteRow key={item.ref.id}
                    item={item}
                    onSelect={() => run(item, item.primary)} />
                ))}
              </Command.Group>
            ))}
            {signedOut && (
              <Command.Item
                value={SIGN_IN_ROW}
                onSelect={() => {
                  openSignIn();
                  close();
                }}
                className={ROW_CLASS}
              >
                <LogIn className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{t('signIn.title')}</span>
              </Command.Item>
            )}
            {empty && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {t('empty.noResults', { query: q })}
              </div>
            )}
          </Command.List>
        </Command>

        <div className="flex h-9 shrink-0 items-center gap-4 border-t border-border/60 px-4 text-xs text-muted-foreground">
          <span>{t('footer.move')}</span>
          <span>{t('footer.open')}</span>
          <span>{t('footer.actions')}</span>
          {scope ? <span>{t('footer.unscope')}</span> : <span>{t('footer.scope')}</span>}
          <span>{t('footer.close')}</span>
          {paletteHotkey && (
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-sans text-2xs">{paletteHotkey}</kbd>
          )}
        </div>

        {menuFor && (
          <ActionMenu
            item={menuFor}
            pinned={isPinned(pins, menuFor.ref.id)}
            onRun={(action) => run(menuFor, action)}
            onTogglePin={() => {
              updateSettings({ palettePins: togglePin(pins, menuFor.ref) });
              setMenuFor(null);
              inputRef.current?.focus();
            }}
            onClose={() => {
              setMenuFor(null);
              inputRef.current?.focus();
            }}
          />
        )}
      </div>
    </div>
  );
}

/** → at the end of the typed text opens the action menu (anywhere else it moves the caret). */
function isCaretAtEnd(e: React.KeyboardEvent<HTMLInputElement>): boolean {
  if (e.key !== 'ArrowRight' || e.shiftKey) return false;
  const input = e.currentTarget;
  return input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
}

const ROW_CLASS =
  'flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 text-sm outline-none data-[selected=true]:bg-primary/15';

function PaletteRow({ item, onSelect }: { item: PaletteItem; onSelect: () => void }) {
  return (
    <Command.Item value={item.ref.id}
      onSelect={onSelect}
      className={ROW_CLASS}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">{item.icon}</span>
      <span className={cn('truncate', item.titleClassName)}>{item.ref.title}</span>
      {item.subtitle && <span className="shrink-0 truncate text-xs text-muted-foreground">{item.subtitle}</span>}
      {item.badge && (
        <span className="shrink-0 rounded-full border border-border px-1.5 text-2xs leading-4 text-muted-foreground">
          {item.badge}
        </span>
      )}
      {item.trailing && (
        <span className="ml-auto flex shrink-0 items-center gap-2 pl-3 text-xs text-muted-foreground">
          {item.trailing}
        </span>
      )}
    </Command.Item>
  );
}

interface ActionMenuProps {
  item: PaletteItem;
  pinned: boolean;
  onRun(action: PaletteAction): void;
  onTogglePin(): void;
  onClose(): void;
}

/** Ctrl+K / →: the highlighted row's actions, searchable (outside the main Command, so its keys stay here). */
function ActionMenu({ item, pinned, onRun, onTogglePin, onClose }: ActionMenuProps) {
  const { t } = useTranslation('palette');
  const actions = [item.primary, ...(item.actions ?? [])];
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.fast, ease: EASE_OUT }}
      className="absolute bottom-11 right-2 z-10 w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-panel"
    >
      <Command label={t('menu.label', { title: item.ref.title })}
        loop>
        <div className="truncate px-3 pt-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          {item.ref.title}
        </div>
        <Command.Input
          autoFocus
          placeholder={t('menu.placeholder')}
          onKeyDown={(e) => {
            if (
              e.key === 'Escape' ||
              (e.key === 'Backspace' && e.currentTarget.value === '') ||
              e.key === 'ArrowLeft'
            ) {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }
          }}
          className="h-8 w-full bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-56 overflow-y-auto p-1">
          {actions.map((action) => (
            <Command.Item
              key={action.id}
              value={`${action.id} ${action.label}`}
              onSelect={() => onRun(action)}
              className={ROW_CLASS}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                {action.icon}
              </span>
              <span className="truncate">{action.label}</span>
              {action === item.primary && <span className="ml-auto text-xs text-muted-foreground">↵</span>}
              {action.shortcut && action !== item.primary && (
                <kbd className="ml-auto font-sans text-2xs text-muted-foreground">{action.shortcut}</kbd>
              )}
            </Command.Item>
          ))}
          <Command.Item
            value={`pin ${t(pinned ? 'menu.unpin' : 'menu.pin')}`}
            onSelect={onTogglePin}
            className={ROW_CLASS}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
              {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </span>
            <span className="truncate">{t(pinned ? 'menu.unpin' : 'menu.pin')}</span>
          </Command.Item>
        </Command.List>
      </Command>
    </motion.div>
  );
}
