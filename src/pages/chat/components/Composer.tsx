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
import { ClipboardCopy, FileText, Gamepad2, Globe, Package, SendHorizontal, Settings2, X } from 'lucide-react';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import type { ChatListingState } from '../hooks/useChatListings';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { fillTemplate, isChatTemplate } from '@/lib/message-templates';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useOverlay } from '@/overlay';
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

/** One-click phrases inserted into the draft (never sent directly). */
export const QUICK_REPLIES = ['Still available?', 'Sold, sorry', 'Inv me', 'ty gl'] as const;

/** The offer message templates from Settings → Chat, offered by the "/" menu after the user's own templates. */
const OFFER_TEMPLATES = [
  { key: 'acceptOfferMessageTemplate', label: 'Offer accepted' },
  { key: 'rejectOfferMessageTemplate', label: 'Offer declined' },
  { key: 'soldOfferMessageTemplate', label: 'Item sold' },
] as const satisfies readonly { key: keyof ISettings; label: string }[];

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
  const listing = state && 'listing' in state ? state.listing : undefined;
  const name = listing?.item.name ?? findMarketLinks(url)[0]?.displayName ?? 'Market listing';
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
        aria-label={`Remove ${name}`}
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
  const { settings } = useOptions();
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

  // Template menu: the user's own templates, then the offer templates, then "Manage templates…"
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const slash = SLASH_COMMAND.exec(value);
  const templates = useMemo(() => {
    const vars = {
      gameInfo: templateVars.gameInfo,
      accountName: templateVars.accountName,
      characterName: templateVars.characterName,
      itemName: templateVars.itemName,
      price: templateVars.price,
    };
    const custom = (settings?.chatTemplates ?? [])
      .filter(isChatTemplate)
      .flatMap(({ id, name, text }) =>
        text.trim() ? [{ key: `custom:${id}`, label: name, text: fillTemplate(text, vars) }] : [],
      );
    const offers = OFFER_TEMPLATES.flatMap(({ key, label }) => {
      const template = settings?.[key];
      return typeof template === 'string' && template.trim()
        ? [{ key: `offer:${key}`, label, text: fillTemplate(template, vars) }]
        : [];
    });
    return [...custom, ...offers];
  }, [settings, templateVars]);
  const query = slash?.[1].toLowerCase().trim() ?? '';
  const matches = slash
    ? templates.filter((t) => t.label.toLowerCase().includes(query) || t.text.toLowerCase().includes(query))
    : [];
  // A bare "/" always opens it (with no templates yet it offers "Manage templates…"); "/text" only on a match
  const menuOpen = !!slash && dismissedAt !== value && (matches.length > 0 || query === '');
  // "Manage templates…" is the last option
  const manageIndex = matches.length;
  const activeIndex = Math.min(active, manageIndex);

  // Keep the option chosen with the arrow keys in view (a long template list scrolls)
  useLayoutEffect(() => {
    if (menuOpen) document.getElementById(`${menuId}-${activeIndex}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [menuOpen, menuId, activeIndex]);

  /** Opens Settings → Chat; the "/" typed to get here is dropped. */
  const manageTemplates = () => {
    lastSelectionRef.current = null;
    onChange('');
    openPanel('settings', { section: 'Chat' });
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
    if (menuOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive((activeIndex + step + manageIndex + 1) % (manageIndex + 1));
        return;
      }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
        e.preventDefault();
        if (activeIndex === manageIndex) {
          manageTemplates();
          return;
        }
        const { text: filled } = matches[activeIndex];
        edit(filled, filled.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissedAt(value);
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
  const whisperTip = `Copies /w *${whisperTarget ?? 'account'} … — paste it in the game chat`;

  return (
    <div className="@container shrink-0 px-3 pb-3 pt-1.5">
      <div className="relative rounded-2xl border border-border/80 bg-linear-to-b from-card to-card/85 shadow-panel ring-1 ring-inset ring-foreground/5 transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-ring/50 focus-within:ring-ring/20">
        {menuOpen && (
          <motion.div
            key="templates"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-panel"
          >
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-3" />
              Templates
              <span className="ml-auto font-normal normal-case tracking-normal">↑↓ to choose · Enter to insert</span>
            </div>
            <ul id={menuId}
              role="listbox"
              aria-label="Message templates"
              className="max-h-72 overflow-y-auto p-1">
              {matches.map((t, i) => (
                <li
                  key={t.key}
                  id={`${menuId}-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => edit(t.text, t.text.length)}
                  className={cn(
                    'cursor-pointer rounded-md px-2.5 py-1.5 transition-colors duration-(--dur-fast)',
                    i === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
                  )}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.text}</div>
                </li>
              ))}
              {matches.length === 0 ? (
                <li role="presentation"
                  className="px-2.5 py-1.5 text-xs text-muted-foreground">
                  No templates yet
                </li>
              ) : (
                <li role="presentation"
                  aria-hidden
                  className="mx-1 my-1 h-px bg-border" />
              )}
              <li
                id={`${menuId}-${manageIndex}`}
                role="option"
                aria-selected={activeIndex === manageIndex}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(manageIndex)}
                onClick={manageTemplates}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-(--dur-fast)',
                  activeIndex === manageIndex ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                )}
              >
                <Settings2 aria-hidden
                  className="size-3.5 shrink-0" />
                Manage templates…
              </li>
            </ul>
          </motion.div>
        )}

        {/* One sideways-scrolling line (no scrollbar). The Website/Whisper labels drop to icons only when the composer itself is under 380px wide */}
        <div
          role="toolbar"
          aria-label="Quick replies"
          className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-border/50 px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {onChannelChange && (
            <ToggleGroup
              type="single"
              size="sm"
              aria-label="Reply via"
              value={channel}
              onValueChange={(next) => next && onChannelChange(next as ReplyChannel)}
              className={cn('mr-1 shrink-0', segmentedClass)}
            >
              <Tip label="Send a website message (they get it on projectdiablo2.com)">
                <ToggleGroupItem
                  value="website"
                  aria-label="Website"
                  className={cn('h-6 flex-none gap-1.5 px-3 text-xs', segmentItemClass)}
                >
                  <Globe className="size-3" />
                  <span className="@max-[380px]:sr-only">Website</span>
                </ToggleGroupItem>
              </Tip>
              <Tip label={whisperTip}>
                <ToggleGroupItem
                  value="whisper"
                  aria-label="Whisper (copy)"
                  className={cn('h-6 flex-none gap-1.5 px-3 text-xs', segmentItemClass)}
                >
                  <Gamepad2 className="size-3" />
                  <span className="@max-[380px]:sr-only">Whisper (copy)</span>
                </ToggleGroupItem>
              </Tip>
            </ToggleGroup>
          )}
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              // Keep the draft's caret/selection: the chip inserts where the user was typing
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertAtCaret(reply)}
              className="shrink-0 whitespace-nowrap rounded-full border border-border/70 bg-background/50 px-2.5 py-0.5 text-xs text-muted-foreground outline-none transition-[border-color,background-color,color,transform] duration-(--dur-fast) hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
            >
              {reply}
            </button>
          ))}
          <span className="ml-auto hidden truncate pr-1 text-[10px] text-muted-foreground/80 @min-[640px]:inline">
            <kbd className="font-sans font-semibold">/</kbd> templates ·{' '}
            <kbd className="font-sans font-semibold">Shift+Enter</kbd> new line
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
              aria-label="Message"
              aria-placeholder={placeholder}
              aria-controls={menuOpen ? menuId : undefined}
              aria-activedescendant={menuOpen ? `${menuId}-${activeIndex}` : undefined}
              contentEditable
              tabIndex={0}
              spellCheck
              onInput={() => {
                const editor = editorRef.current;
                if (!editor) return;
                setActive(0);
                pillStore.sync(editor);
                onChange(serializeEditor(editor));
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                const editor = editorRef.current;
                lastSelectionRef.current = editor ? selectionOffsets(editor) : null;
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
          <Tip label={channel === 'whisper' ? `${whisperTip} (Enter)` : 'Send (Enter)'}>
            <button
              type="button"
              aria-label={channel === 'whisper' ? 'Copy whisper' : 'Send'}
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
              Enter copies <span className="font-medium text-foreground/85">/w *{whisperTarget ?? 'account'} …</span> —
              paste it in the game chat to send
            </span>
          </p>
        )}
      </div>
    </div>
  );
});
