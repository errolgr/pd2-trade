import React, { forwardRef, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, SendHorizontal } from 'lucide-react';
import { useOptions, type ISettings } from '@/hooks/useOptions';
import { fillTemplate } from '@/lib/message-templates';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { ListingPicker, listingMessageUrl } from './ListingPicker';

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

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the trimmed text; the draft is cleared right away. */
  onSend: (text: string) => void;
  placeholder: string;
  templateVars: TemplateVars;
}

/** Message input of the open thread; `ref` is the textarea (focus it to start typing). */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { value, onChange, onSend, placeholder, templateVars },
  ref,
) {
  const { settings } = useOptions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => textareaRef.current!, []);
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

  return (
    <div className="shrink-0 border-t border-border bg-card/50 px-3 pb-3 pt-2">
      <div className="mb-2 flex items-center gap-1.5">
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            type="button"
            // Keep the draft's caret/selection: the chip inserts where the user was typing
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertAtCaret(reply)}
            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground outline-none transition-colors duration-(--dur-fast) hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]"
          >
            {reply}
          </button>
        ))}
        <span className="ml-auto hidden truncate text-[10px] text-muted-foreground/80 lg:inline">
          <kbd className="font-sans font-semibold">/</kbd> templates ·{' '}
          <kbd className="font-sans font-semibold">Shift+Enter</kbd> new line
        </span>
      </div>

      <div className="relative">
        {menuOpen && (
          <motion.div
            key="templates"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-panel"
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

        <div className="flex items-end gap-1 rounded-xl border border-input bg-background/60 p-1 shadow-xs transition-[border-color,box-shadow] duration-(--dur-fast) focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/25">
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
          <button
            type="button"
            aria-label="Send"
            title="Send (Enter)"
            disabled={!canSend}
            onClick={send}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs outline-none transition-[opacity,transform,background-color] duration-(--dur-fast) hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <SendHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
