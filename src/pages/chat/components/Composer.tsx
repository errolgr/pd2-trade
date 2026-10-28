import React, {
  forwardRef,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  BookmarkPlus,
  ClipboardCopy,
  FileText,
  Gamepad2,
  Globe,
  Package,
  Pencil,
  Plus,
  SendHorizontal,
  Star,
  Settings2,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ChatListingState } from '../hooks/useChatListings';
import { ChatTemplateForm } from '@/components/custom/chat-template-form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useChatTemplates, type ChatTemplateDraft } from '@/hooks/useChatTemplates';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { Trans, useTranslation } from '@/i18n';
import { CHAT_TEMPLATE_TOKENS, fillTemplate, templatePlaceholders } from '@/lib/message-templates';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { undoToast, useOverlay } from '@/overlay';
import { useChatListings } from '../hooks/useChatListings';
import {
  hasLooseLinks,
  pillInfo,
  pillNodes,
  renderDraft,
  selectionOffsets,
  serializeEditor,
  setCaret,
} from '../lib/draft-editor';
import { findMarketLinks, spaceOutLinks } from '../lib/market-links';
import { ListingCard, listingIconBoxClass, listingPillClass } from './ListingCard';
import { ListingPicker, listingMessageUrl } from './ListingPicker';
import { segmentedClass, segmentItemClass, Tip } from './chat-parts';
import { TemplateFill } from './TemplateFill';

/** The offer message templates from Settings → Chat, offered by the "/" menu after the user's own templates. */
const OFFER_TEMPLATES = [
  { key: 'acceptOfferMessageTemplate', labelKey: 'composer.offerTemplates.accepted' },
  { key: 'rejectOfferMessageTemplate', labelKey: 'composer.offerTemplates.declined' },
  { key: 'soldOfferMessageTemplate', labelKey: 'composer.offerTemplates.sold' },
] as const satisfies readonly { key: keyof ISettings; labelKey: string }[];
type OfferTemplateKey = (typeof OFFER_TEMPLATES)[number]['key'];

/**
 * A template the "/" menu offers: `text` with the conversation's tokens filled in, `raw` as written and the
 * custom `placeholders` it asks for; `source` is what Edit/Delete work on.
 */
interface MenuTemplate {
  key: string;
  label: string;
  text: string;
  raw: string;
  placeholders: string[];
  /** Starred: a chip above the composer. */
  favorite: boolean;
  source: { kind: 'custom'; id: string } | { kind: 'offer'; key: OfferTemplateKey; label: string };
}

/** The template form open in the "/" menu: a new template, or editing one of the listed ones. */
type MenuForm = { kind: 'new'; label: string; initial: ChatTemplateDraft } | MenuTemplate['source'];

/** The menu's options after the templates. */
type MenuAction = 'save' | 'new' | 'manage';
const MENU_ACTIONS: Record<MenuAction, { labelKey: string; icon: LucideIcon }> = {
  save: { labelKey: 'composer.actions.save', icon: BookmarkPlus },
  new: { labelKey: 'composer.actions.new', icon: Plus },
  manage: { labelKey: 'composer.actions.manage', icon: Settings2 },
};

/** How long a deleted template can be restored. */
const TEMPLATE_UNDO_MS = 6000;

const rowAction =
  'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color] duration-(--dur-fast) hover:bg-background/70 hover:text-foreground [&_svg]:size-3.5';

/** Values for the template tokens; every token is filled, unknown ones with ''. */
export interface TemplateVars {
  gameInfo?: string;
  accountName?: string;
  characterName?: string;
  itemName?: string;
  price?: string | number;
}

/** "/query" typed as the whole draft opens the template menu. */
const SLASH_COMMAND = /^\/([^\n]*)$/;

/** How a reply goes out: a website DM, or a `/w *account` command copied for the game chat. */
export type ReplyChannel = 'website' | 'whisper';

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the trimmed text; the draft is cleared right away. */
  onSend: (text: string) => void;
  placeholder: string;
  templateVars: TemplateVars;
  channel: ReplyChannel;
  /** Set when both channels reach the person: shows the Website/Whisper switch. */
  onChannelChange?: (channel: ReplyChannel) => void;
  /** The account whispers go to (`/w *account`), for the whisper hints. */
  whisperTarget?: string;
}

/** The composer's handle: focus it, or link a listing at the caret (the trader sidebar's market). */
export interface ComposerHandle {
  focus: () => void;
  insertListing: (listing: MarketListingEntry) => void;
}

/** The editor's pill nodes, for React to render the item pills into (one store per composer). */
function createPillStore() {
  let nodes: HTMLElement[] = [];
  const listeners = new Set<() => void>();
  return {
    get: () => nodes,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes the editor's current pill nodes, when they changed. */
    sync: (editor: HTMLElement) => {
      const next = pillNodes(editor);
      if (next.length === nodes.length && next.every((node, i) => node === nodes[i])) return;
      nodes = next;
      listeners.forEach((listener) => listener());
    },
  };
}

/** A listing link inline in the draft: the chat's item pill (a name pill until looked up), removable. */
function DraftPill({
  url,
  state,
  onRemove,
}: {
  url: string;
  state: ChatListingState | undefined;
  onRemove: () => void;
}) {
  const { t } = useTranslation('chat');
  const listing = state && 'listing' in state ? state.listing : undefined;
  const name = listing?.item.name ?? findMarketLinks(url)[0]?.displayName ?? t('composer.marketListing');
  return (
    <span className="group/pill relative inline-flex max-w-full">
      {listing ? (
        <ListingCard listing={listing}
          listed={state?.status === 'listed'}
          url={url} />
      ) : (
        <span aria-busy={state?.status === 'loading' || undefined}
          className={listingPillClass}>
          <span className={listingIconBoxClass}>
            <Package className="size-3.5 text-muted-foreground" />
          </span>
          <span className="truncate font-semibold text-info">{name}</span>
        </span>
      )}
      <button
        type="button"
        aria-label={t('composer.remove', { name })}
        // Keep the caret in the editor
        onMouseDown={(e) => e.preventDefault()}
        onClick={onRemove}
        className="absolute -top-1.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-xs outline-none transition-[opacity,background-color,color] duration-(--dur-fast) group-hover/pill:opacity-100 hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <X className="size-2.5" />
      </button>
    </span>
  );
}

/**
 * Message input of the open thread, a floating card: channel switch, quick replies, listing picker and an
 * inline editor where listing links show as item pills right where they were put (see lib/draft-editor).
 */
export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { value, onChange, onSend, placeholder, templateVars, channel, onChannelChange, whisperTarget },
  ref,
) {
  const { t } = useTranslation('chat');
  const { settings, updateSettings } = useOptions();
  const chatTemplates = useChatTemplates();
  const { openPanel } = useOverlay();
  const editorRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [pillStore] = useState(createPillStore);
  const pills = useSyncExternalStore(pillStore.subscribe, pillStore.get);
  const links = useMemo(() => findMarketLinks(value), [value]);
  const listings = useChatListings(links.map((link) => link.listingId));

  // Draft offset for the caret once a programmatic edit (insert, template, pill, newline) is rendered
  const caretRef = useRef<number | null>(null);
  // Where the caret was when the editor lost focus (the picker and the sidebar insert there)
  const lastSelectionRef = useRef<[number, number] | null>(null);

  // The editor shows the draft: rebuilt when the draft changed other than by typing in it (a thread opened,
  // a template, a pill, Counter) or when typing/pasting left a listing URL as text (it becomes a pill)
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const focused = editor.ownerDocument.activeElement === editor;
    if (serializeEditor(editor) !== value || hasLooseLinks(editor)) {
      const typedCaret = focused ? selectionOffsets(editor)?.[1] : undefined;
      renderDraft(editor, value);
      const caret =
        caretRef.current ?? (typedCaret !== undefined && serializeEditor(editor) === value ? typedCaret : value.length);
      if (focused || caretRef.current !== null) setCaret(editor, caret);
    } else if (caretRef.current !== null) {
      setCaret(editor, caretRef.current);
    }
    caretRef.current = null;
    pillStore.sync(editor);
  }, [value, pillStore]);

  /** Applies a programmatic edit of the draft and puts the caret at `caret`. */
  const edit = (next: string, caret: number) => {
    caretRef.current = caret;
    onChange(next);
    editorRef.current?.focus();
  };

  /** The selection as draft offsets: live while focused, else where it was left (end of draft by default). */
  const selection = (): [number, number] => {
    const editor = editorRef.current;
    const live = editor && editor.ownerDocument.activeElement === editor ? selectionOffsets(editor) : null;
    const [start, end] = live ?? lastSelectionRef.current ?? [value.length, value.length];
    return [Math.min(start, value.length), Math.min(end, value.length)];
  };

  /** Insert at the caret (replacing a selection), padded with spaces so it doesn't glue onto words. */
  const insertAtCaret = (insert: string) => {
    const [start, end] = selection();
    const before = value.slice(0, start);
    const after = value.slice(end);
    const head = `${before}${before && !/\s$/.test(before) ? ' ' : ''}${insert}${after && !/^\s/.test(after) ? ' ' : ''}`;
    lastSelectionRef.current = null;
    edit(head + after, head.length);
  };

  const insertListing = (listing: MarketListingEntry) => insertAtCaret(listingMessageUrl(listing));
  useImperativeHandle(ref, () => ({
    focus: () => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      if (!selectionOffsets(editor)) setCaret(editor, value.length);
    },
    insertListing,
  }));

  /** Removes the `index`-th listing link of the draft. */
  const removeLink = (index: number) => {
    const link = links[index];
    if (link) edit(value.slice(0, link.start) + value.slice(link.end), link.start);
  };

  // Template menu, opened by "/" as the whole draft (filters by what follows) or the Templates button: the
  // user's own templates, the offer templates, then "Save message as template" (with a draft), "New template"
  // and "Manage templates…". Templates are added, edited and deleted right in it: the form replaces the list.
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [form, setForm] = useState<MenuForm | null>(null);
  // The template whose placeholders are being filled in before it goes in
  const [filling, setFilling] = useState<MenuTemplate | null>(null);
  const [active, setActive] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const slash = SLASH_COMMAND.exec(value);
  // Every token gets a value ('' when the conversation has none)
  const vars = useMemo(
    () => ({
      gameInfo: templateVars.gameInfo,
      accountName: templateVars.accountName,
      characterName: templateVars.characterName,
      itemName: templateVars.itemName,
      price: templateVars.price,
    }),
    [templateVars],
  );
  const templates = useMemo((): MenuTemplate[] => {
    const written: Pick<MenuTemplate, 'key' | 'label' | 'raw' | 'source' | 'favorite'>[] = [
      ...chatTemplates.templates.map(({ id, name, text, favorite }) => ({
        key: `custom:${id}`,
        label: name,
        raw: text,
        source: { kind: 'custom' as const, id },
        favorite: !!favorite,
      })),
      ...OFFER_TEMPLATES.map(({ key, labelKey }) => ({
        key: `offer:${key}`,
        label: t(labelKey),
        raw: settings?.[key] ?? '',
        source: { kind: 'offer' as const, key, label: t(labelKey) },
        favorite: (settings?.favoriteOfferTemplates ?? []).includes(key),
      })),
    ];
    return written
      .filter((tpl) => typeof tpl.raw === 'string' && tpl.raw.trim())
      .map((tpl) => ({ ...tpl, text: fillTemplate(tpl.raw, vars), placeholders: templatePlaceholders(tpl.raw) }));
  }, [chatTemplates.templates, settings, vars, t]);
  const query = slash?.[1].toLowerCase().trim() ?? '';
  const matches = slash
    ? templates.filter((tpl) => tpl.label.toLowerCase().includes(query) || tpl.text.toLowerCase().includes(query))
    : templates;
  // A bare "/" always opens it (with no templates yet it offers "New template"); "/text" only on a match
  const listOpen = slash ? dismissedAt !== value && (matches.length > 0 || query === '') : browsing;
  const editedTemplate =
    form?.kind === 'custom' ? chatTemplates.templates.find((tpl) => tpl.id === form.id) : undefined;
  // The open form's title and starting values (a template deleted elsewhere meanwhile closes its form)
  const formSetup =
    form?.kind === 'new'
      ? { label: form.label, initial: form.initial, submitLabel: t('composer.addTemplate') }
      : form?.kind === 'custom' && editedTemplate
        ? {
            label: t('composer.editNamed', { name: editedTemplate.name }),
            initial: editedTemplate,
            submitLabel: t('common:actions.save'),
          }
        : form?.kind === 'offer'
          ? {
              label: t('composer.editNamed', { name: form.label }),
              initial: { name: form.label, text: settings?.[form.key] ?? '' },
              submitLabel: t('common:actions.save'),
            }
          : null;
  const menuOpen = listOpen || formSetup !== null || filling !== null;
  const actions: MenuAction[] = [...(!slash && value.trim() ? (['save'] as const) : []), 'new', 'manage'];
  const optionCount = matches.length + actions.length;
  const activeIndex = Math.min(active, optionCount - 1);
  const activeTemplate: MenuTemplate | undefined = matches[activeIndex];
  const listShown = listOpen && !formSetup && !filling;
  const favorites = templates.filter((tpl) => tpl.favorite);

  // Keep the option chosen with the arrow keys in view (a long template list scrolls)
  useLayoutEffect(() => {
    if (listShown) document.getElementById(`${menuId}-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [listShown, menuId, activeIndex]);

  /** Back to typing: focuses the editor with the caret where it was left (end of the draft by default). */
  const focusEditor = () => {
    const editor = editorRef.current;
    if (!editor || editor.ownerDocument.activeElement === editor) return;
    editor.focus();
    setCaret(editor, Math.min(lastSelectionRef.current?.[1] ?? value.length, value.length));
  };

  /** Puts a filled template in: replaces the "/query" draft, or goes in at the caret (Templates button). */
  const insertTemplate = (text: string) => {
    setBrowsing(false);
    if (slash) edit(text, text.length);
    else insertAtCaret(text);
  };

  /** A template with custom placeholders asks for them first; others go in right away. */
  const pickTemplate = (template: MenuTemplate) => {
    if (template.placeholders.length > 0) setFilling(template);
    else insertTemplate(template.text);
  };

  /** Stars a template (a chip above the composer) or unstars it. */
  const toggleFavorite = (template: MenuTemplate) => {
    if (template.source.kind === 'custom') {
      chatTemplates.update(template.source.id, { favorite: !template.favorite });
      return;
    }
    const key = template.source.key;
    const starred = settings?.favoriteOfferTemplates ?? [];
    updateSettings({
      favoriteOfferTemplates: template.favorite ? starred.filter((k) => k !== key) : [...starred, key],
    });
  };

  /** Opens Settings → Chat; a "/" typed to get here is dropped. */
  const manageTemplates = () => {
    setBrowsing(false);
    if (slash) {
      lastSelectionRef.current = null;
      onChange('');
    }
    openPanel('settings', { section: 'Chat' });
  };

  const runAction = (action: MenuAction) => {
    if (action === 'manage') manageTemplates();
    else if (action === 'new')
      setForm({ kind: 'new', label: t('composer.actions.new'), initial: { name: '', text: '' } });
    else {
      // Listing links stay in as their URLs
      setForm({
        kind: 'new',
        label: t('composer.actions.save'),
        initial: { name: '', text: spaceOutLinks(value).trim() },
      });
    }
  };

  /** Deletes one of the user's templates right away, with an Undo. */
  const deleteTemplate = (id: string) => {
    const removed = chatTemplates.remove(id);
    if (!removed) return;
    undoToast({
      title: t('composer.templateDeleted'),
      description: t('composer.templateDeletedDescription', { name: removed.template.name }),
      duration: TEMPLATE_UNDO_MS,
      onUndo: () => chatTemplates.restore(removed.template, removed.index),
    });
  };

  /** Leaves the template form for the list, typing in the message again. */
  const closeForm = () => {
    setForm(null);
    focusEditor();
  };

  const saveForm = (draft: ChatTemplateDraft) => {
    if (form?.kind === 'new') chatTemplates.add(draft);
    else if (form?.kind === 'custom') chatTemplates.update(form.id, draft);
    else if (form?.kind === 'offer') {
      const patch: Partial<ISettings> = {};
      patch[form.key] = draft.text;
      updateSettings(patch);
    }
    closeForm();
  };

  const send = () => {
    const message = spaceOutLinks(value).trim();
    if (!message) return;
    onSend(message);
    lastSelectionRef.current = null;
    caretRef.current = 0;
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keys finishing an IME composition belong to the composition
    if (e.nativeEvent.isComposing) return;
    if (listShown) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive((activeIndex + step + optionCount) % optionCount);
        return;
      }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
        e.preventDefault();
        if (activeTemplate) pickTemplate(activeTemplate);
        else runAction(actions[activeIndex - matches.length]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (slash) setDismissedAt(value);
        setBrowsing(false);
        return;
      }
      // Ctrl/Cmd+S stars the chosen template, Ctrl/Cmd+E edits it, Ctrl/Cmd+D deletes it (one of the user's own)
      const shortcut = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey ? e.key.toLowerCase() : '';
      if (activeTemplate && shortcut === 's') {
        e.preventDefault();
        toggleFavorite(activeTemplate);
        return;
      }
      if (activeTemplate && shortcut === 'e') {
        e.preventDefault();
        setForm(activeTemplate.source);
        return;
      }
      if (activeTemplate?.source.kind === 'custom' && shortcut === 'd') {
        e.preventDefault();
        deleteTemplate(activeTemplate.source.id);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.shiftKey) {
        send();
        return;
      }
      // A newline in the text (never a browser-made block)
      const [start, end] = selection();
      edit(`${value.slice(0, start)}\n${value.slice(end)}`, start + 1);
      return;
    }
    // A pill is one unit: Backspace/Delete next to it removes the whole link
    if ((e.key === 'Backspace' || e.key === 'Delete') && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const [start, end] = selection();
      if (start !== end) return;
      const index = links.findIndex((link) => (e.key === 'Backspace' ? link.end === start : link.start === start));
      if (index >= 0) {
        e.preventDefault();
        removeLink(index);
      }
      return;
    }
    // Plain text only: no bold/italic/underline markup
    if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) e.preventDefault();
  };

  const canSend = value.trim().length > 0;
  const whisperTip = t('composer.whisperTip', { account: whisperTarget ?? t('composer.accountPlaceholder') });
  const acceptOfferTokens = [
    { token: '{gameInfo}', description: t('composer.tokens.gameInfo') },
    ...CHAT_TEMPLATE_TOKENS,
  ];

  return (
    <div className="@container shrink-0 px-3 pb-3 pt-1.5">
      <div className="relative rounded-2xl border border-border/80 bg-linear-to-b from-card to-card/85 shadow-panel ring-1 ring-inset ring-foreground/5 transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-ring/50 focus-within:ring-ring/20">
        {menuOpen && (
          <motion.div
            key="templates"
            ref={menuRef}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-panel"
          >
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3 shrink-0" />
              <span className="shrink-0">{t('composer.templates')}</span>
              <span className="ml-auto truncate font-normal normal-case tracking-normal">
                {formSetup
                  ? t('composer.hints.form')
                  : filling
                    ? t('composer.hints.fill')
                    : activeTemplate
                      ? activeTemplate.source.kind === 'custom'
                        ? activeTemplate.favorite
                          ? t('composer.hints.customUnstar')
                          : t('composer.hints.customStar')
                        : activeTemplate.favorite
                          ? t('composer.hints.offerUnstar')
                          : t('composer.hints.offerStar')
                      : t('composer.hints.list')}
              </span>
            </div>
            {formSetup ? (
              <ChatTemplateForm
                key={formSetup.label}
                label={formSetup.label}
                initial={formSetup.initial}
                submitLabel={formSetup.submitLabel}
                fixedName={form?.kind === 'offer'}
                tokens={
                  form?.kind === 'offer' && form.key === 'acceptOfferMessageTemplate' ? acceptOfferTokens : undefined
                }
                onSubmit={saveForm}
                onCancel={closeForm}
                className="max-h-80 overflow-y-auto"
              />
            ) : filling ? (
              <TemplateFill
                key={filling.key}
                label={filling.label}
                template={filling.raw}
                placeholders={filling.placeholders}
                vars={vars}
                onInsert={(text) => {
                  setFilling(null);
                  insertTemplate(text);
                }}
                onCancel={() => {
                  setFilling(null);
                  focusEditor();
                }}
              />
            ) : (
              <ul
                id={menuId}
                role="listbox"
                aria-label={t('composer.messageTemplates')}
                className="max-h-72 overflow-y-auto p-1"
              >
                {matches.map((tpl, i) => (
                  <li
                    key={tpl.key}
                    id={`${menuId}-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pickTemplate(tpl)}
                    className={cn(
                      'group/template flex cursor-pointer items-start gap-2 rounded-md py-1.5 pr-1.5 pl-2.5 transition-colors duration-(--dur-fast)',
                      i === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{tpl.label}</div>
                      <div className="truncate text-xs text-muted-foreground">{tpl.text}</div>
                    </div>
                    <div
                      className={cn(
                        'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-(--dur-fast) group-hover/template:opacity-100',
                        i === activeIndex && 'opacity-100',
                      )}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={t('composer.editNamed', { name: tpl.label })}
                        title={t('composer.editShortcut')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm(tpl.source);
                        }}
                        className={rowAction}
                      >
                        <Pencil />
                      </button>
                      {tpl.source.kind === 'custom' && (
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label={t('composer.deleteNamed', { name: tpl.label })}
                          title={t('composer.deleteShortcut')}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (tpl.source.kind === 'custom') deleteTemplate(tpl.source.id);
                          }}
                          className={cn(rowAction, 'hover:bg-destructive/15 hover:text-destructive')}
                        >
                          <Trash2 />
                        </button>
                      )}
                    </div>
                    {/* Mouse shortcuts for Ctrl+S / Ctrl+E / Ctrl+D (the keyboard stays in the message) */}
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={
                          tpl.favorite
                            ? t('composer.unstarNamed', { name: tpl.label })
                            : t('composer.starNamed', { name: tpl.label })
                        }
                        aria-pressed={tpl.favorite}
                        title={tpl.favorite ? t('composer.unstarShortcut') : t('composer.starShortcut')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(tpl);
                        }}
                        className={cn(
                          rowAction,
                          'transition-[color,background-color,opacity]',
                          tpl.favorite
                            ? 'text-warning'
                            : cn('opacity-0 group-hover/template:opacity-100', i === activeIndex && 'opacity-100'),
                        )}
                      >
                        <Star className={cn(tpl.favorite && 'fill-current')} />
                      </button>
                    </div>
                  </li>
                ))}
                {matches.length === 0 ? (
                  <li role="presentation"
                    className="px-2.5 py-1.5 text-xs text-muted-foreground">
                    {t('composer.noTemplates')}
                  </li>
                ) : (
                  <li role="presentation"
                    aria-hidden
                    className="mx-1 my-1 h-px bg-border" />
                )}
                {actions.map((action, j) => {
                  const i = matches.length + j;
                  const { labelKey, icon: Icon } = MENU_ACTIONS[action];
                  return (
                    <li
                      key={action}
                      id={`${menuId}-${i}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => runAction(action)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-(--dur-fast)',
                        i === activeIndex ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <Icon aria-hidden
                        className="size-3.5 shrink-0" />
                      {t(labelKey)}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}

        {/* One sideways-scrolling line (no scrollbar). The Website/Whisper labels drop to icons only when the composer itself is under 380px wide */}
        <div
          role="toolbar"
          aria-label={t('composer.quickReplies')}
          className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-border/50 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {onChannelChange && (
            <ToggleGroup
              type="single"
              size="sm"
              aria-label={t('composer.replyVia')}
              value={channel}
              onValueChange={(next) => next && onChannelChange(next as ReplyChannel)}
              className={cn('mr-1 shrink-0', segmentedClass)}
            >
              <Tip label={t('composer.websiteTip')}>
                <ToggleGroupItem
                  value="website"
                  aria-label={t('composer.website')}
                  className={cn('h-6 flex-none gap-1.5 px-3 text-xs', segmentItemClass)}
                >
                  <Globe className="size-3" />
                  <span className="@max-[380px]:sr-only">{t('composer.website')}</span>
                </ToggleGroupItem>
              </Tip>
              <Tip label={whisperTip}>
                <ToggleGroupItem
                  value="whisper"
                  aria-label={t('composer.whisperCopy')}
                  className={cn('h-6 flex-none gap-1.5 px-3 text-xs', segmentItemClass)}
                >
                  <Gamepad2 className="size-3" />
                  <span className="@max-[380px]:sr-only">{t('composer.whisperCopy')}</span>
                </ToggleGroupItem>
              </Tip>
            </ToggleGroup>
          )}
          <Tip label={t('composer.templatesTip')}>
            <button
              type="button"
              aria-label={t('composer.messageTemplates')}
              aria-expanded={menuOpen}
              // Keep the draft's caret: a template picked from here goes in where the user was typing
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (menuOpen) {
                  if (slash) setDismissedAt(value);
                  setBrowsing(false);
                  setForm(null);
                  setFilling(null);
                } else {
                  setDismissedAt(null);
                  setActive(0);
                  setBrowsing(true);
                }
                focusEditor();
              }}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/50 px-2 py-0.5 text-xs text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60',
                menuOpen && 'border-primary/40 bg-primary/10 text-foreground',
              )}
            >
              <kbd className="font-sans font-semibold">/</kbd>
              <FileText className="size-3" />
            </button>
          </Tip>
          {/* The starred templates, in template order; each picks its template like the "/" menu does.
              Unpinning is only done by unstarring the template (in the "/" menu or Settings). */}
          {favorites.length > 0 ? (
            favorites.map((tpl) => (
              <button
                key={tpl.key}
                type="button"
                title={tpl.text}
                // Keep the draft's caret/selection: the chip inserts where the user was typing
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickTemplate(tpl)}
                className="shrink-0 whitespace-nowrap rounded-full border border-border/70 bg-background/50 px-2.5 py-0.5 text-xs text-muted-foreground outline-none transition-[border-color,background-color,color] duration-(--dur-fast) hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
              >
                {tpl.label}
              </button>
            ))
          ) : (
            <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground/80">
              {t('composer.starHint')}
            </span>
          )}
          <span className="ml-auto hidden truncate pr-1 text-[10px] text-muted-foreground/80 @min-[640px]:inline">
            <Trans t={t}
              i18nKey="composer.newLine"
              components={{ kbd: <kbd className="font-sans font-semibold" /> }} />
          </span>
        </div>

        <div className="flex items-end gap-1 p-1.5">
          <ListingPicker onPick={insertListing}
            onClosed={() => editorRef.current?.focus()} />
          <div className="relative min-w-0 flex-1 self-center">
            {value === '' && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-1.5 top-1.5 truncate text-sm leading-5 text-muted-foreground"
              >
                {placeholder}
              </span>
            )}
            <div
              ref={editorRef}
              role="textbox"
              aria-multiline="true"
              aria-label={t('composer.message')}
              aria-placeholder={placeholder}
              aria-controls={listShown ? menuId : undefined}
              aria-activedescendant={listShown ? `${menuId}-${activeIndex}` : undefined}
              contentEditable
              tabIndex={0}
              spellCheck
              onInput={() => {
                const editor = editorRef.current;
                if (!editor) return;
                setActive(0);
                // Typing goes on with the message (the Templates button's menu closes; "/" opens it again)
                setBrowsing(false);
                pillStore.sync(editor);
                onChange(serializeEditor(editor));
              }}
              onKeyDown={handleKeyDown}
              onBlur={(e) => {
                const editor = editorRef.current;
                lastSelectionRef.current = editor ? selectionOffsets(editor) : null;
                // Clicking away closes the Templates button's menu; its own form keeps it open
                if (!menuRef.current?.contains(e.relatedTarget as Node | null)) setBrowsing(false);
              }}
              onPaste={(e) => {
                // Plain text only (never pasted markup); listing URLs in it become pills
                e.preventDefault();
                const pasted = e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n');
                const [start, end] = selection();
                edit(value.slice(0, start) + pasted + value.slice(end), start + pasted.length);
              }}
              onDrop={(e) => e.preventDefault()}
              // 1–6 lines: grows with its content, then scrolls
              className="max-h-[8.25rem] min-h-8 overflow-y-auto whitespace-pre-wrap break-words px-1.5 py-1.5 text-sm leading-5 text-foreground outline-none"
            />
            {pills.map((node, index) => {
              const { url, key } = pillInfo(node);
              const listingId = findMarketLinks(url)[0]?.listingId;
              return createPortal(
                <DraftPill
                  url={url}
                  state={listingId ? listings.get(listingId) : undefined}
                  onRemove={() => removeLink(index)}
                />,
                node,
                key,
              );
            })}
          </div>
          <Tip
            label={channel === 'whisper' ? t('composer.whisperTipEnter', { tip: whisperTip }) : t('composer.sendTip')}
          >
            <button
              type="button"
              aria-label={channel === 'whisper' ? t('composer.copyWhisper') : t('composer.send')}
              disabled={!canSend}
              onClick={send}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-primary to-primary/80 text-primary-foreground shadow-sm outline-none transition-[opacity,transform,box-shadow] duration-(--dur-fast) hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              {channel === 'whisper' ? <ClipboardCopy className="size-4" /> : <SendHorizontal className="size-4" />}
            </button>
          </Tip>
        </div>
        {channel === 'whisper' && (
          <p className="flex items-center gap-1.5 border-t border-border/50 px-3 py-1 text-[11px] text-muted-foreground">
            <ClipboardCopy aria-hidden
              className="size-3 shrink-0 text-warning" />
            <span className="truncate">
              <Trans
                t={t}
                i18nKey="composer.whisperFooter"
                values={{ account: whisperTarget ?? t('composer.accountPlaceholder') }}
                components={{ cmd: <span className="font-medium text-foreground/85" /> }}
              />
            </span>
          </p>
        )}
      </div>
    </div>
  );
});
