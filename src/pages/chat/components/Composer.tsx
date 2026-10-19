import React, { forwardRef, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCopy, FileText, Gamepad2, Globe, SendHorizontal } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { fillTemplate } from '@/lib/message-templates';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { ListingPicker, listingMessageUrl } from './ListingPicker';
import { segmentedClass, segmentItemClass, Tip } from './chat-parts';

/** One-click phrases inserted into the draft (never sent directly). */
export const QUICK_REPLIES = ['Still available?', 'Sold, sorry', 'Inv me', 'ty gl'] as const;

/** The message templates from Settings → Chat offered by the "/" menu. */
const TEMPLATES = [
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

/** The composer's handle: focus it, or insert text at its caret (the trader sidebar links a listing). */
export interface ComposerHandle {
  focus: () => void;
  insert: (text: string) => void;
}

/** Message input of the open thread, a floating card: channel switch, quick replies, listing picker, input. */
export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { value, onChange, onSend, placeholder, templateVars, channel, onChannelChange, whisperTarget },
  ref,
) {
  const { settings } = useOptions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuId = useId();

  // Caret position to restore once a programmatic edit (insert, template) is rendered
  const caretRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const caret = caretRef.current;
    if (caret === null) return;
    caretRef.current = null;
    textareaRef.current?.setSelectionRange(caret, caret);
  }, [value]);

  const replaceDraft = (next: string, caret: number) => {
    caretRef.current = caret;
    onChange(next);
    textareaRef.current?.focus();
  };

  /** Insert at the caret (replacing a selection), padded with spaces so it doesn't glue onto words. */
  const insertAtCaret = (text: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const head = `${before}${before && !/\s$/.test(before) ? ' ' : ''}${text}${after && !/^\s/.test(after) ? ' ' : ''}`;
    replaceDraft(head + after, head.length);
  };
  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus(), insert: insertAtCaret }));

  // Template menu
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
    return TEMPLATES.flatMap(({ key, label }) => {
      const template = settings?.[key];
      return typeof template === 'string' && template.trim()
        ? [{ key, label, text: fillTemplate(template, vars) }]
        : [];
    });
  }, [settings, templateVars]);
  const query = slash?.[1].toLowerCase().trim() ?? '';
  const matches = slash
    ? templates.filter((t) => t.label.toLowerCase().includes(query) || t.text.toLowerCase().includes(query))
    : [];
  const menuOpen = !!slash && dismissedAt !== value && matches.length > 0;
  const activeIndex = Math.min(active, matches.length - 1);

  const send = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Keys finishing an IME composition belong to the composition
    if (e.nativeEvent.isComposing) return;
    if (menuOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setActive((activeIndex + step + matches.length) % matches.length);
        return;
      }
      if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
        e.preventDefault();
        const { text } = matches[activeIndex];
        replaceDraft(text, text.length);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissedAt(value);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
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
              className="p-1">
              {matches.map((t, i) => (
                <li
                  key={t.key}
                  id={`${menuId}-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => replaceDraft(t.text, t.text.length)}
                  className={cn(
                    'cursor-pointer rounded-md px-2.5 py-1.5 transition-colors duration-(--dur-fast)',
                    i === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
                  )}
                >
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.text}</div>
                </li>
              ))}
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
                  className={cn('h-6 gap-1 px-2 text-xs', segmentItemClass)}
                >
                  <Globe className="size-3" />
                  <span className="@max-[380px]:sr-only">Website</span>
                </ToggleGroupItem>
              </Tip>
              <Tip label={whisperTip}>
                <ToggleGroupItem
                  value="whisper"
                  aria-label="Whisper (copy)"
                  className={cn('h-6 gap-1 px-2 text-xs', segmentItemClass)}
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
          <ListingPicker
            onPick={(listing) => insertAtCaret(listingMessageUrl(listing))}
            onClosed={() => textareaRef.current?.focus()}
          />
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => {
              setActive(0);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Message"
            aria-controls={menuOpen ? menuId : undefined}
            aria-activedescendant={menuOpen ? `${menuId}-${activeIndex}` : undefined}
            // 1–6 lines: grows with its content, then scrolls
            className="field-sizing-content max-h-[8.25rem] min-h-8 flex-1 resize-none self-center bg-transparent px-1.5 py-1.5 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
          />
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
