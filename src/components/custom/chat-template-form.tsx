import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ChatTemplateDraft } from '@/hooks/useChatTemplates';
import {
  CHAT_TEMPLATE_TEXT_MAX,
  CHAT_TEMPLATE_TOKENS,
  chatTemplateSchema,
  templatePlaceholders,
} from '@/lib/message-templates';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

type FieldErrors = Partial<Record<'name' | 'text', string>>;

export interface ChatTemplateToken {
  token: string;
  description: string;
}

interface ChatTemplateFormProps {
  /** Accessible name of the form ("New template", "Edit Haggle"...). */
  label: string;
  initial: ChatTemplateDraft;
  submitLabel: string;
  onSubmit: (template: ChatTemplateDraft) => void;
  onCancel: () => void;
  /** A template whose name can't change (the offer templates): only its text is edited. */
  fixedName?: boolean;
  /** Token chips offered under the text (default: the chat template tokens). */
  tokens?: readonly ChatTemplateToken[];
  className?: string;
}

/**
 * Name + multi-line text of a chat template, with token chips that insert at the caret; validated on submit
 * (Settings → Chat and the composer's "/" menu). Enter in the name or Ctrl/Cmd+Enter in the text saves, Esc
 * cancels.
 */
export function ChatTemplateForm({
  label,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  fixedName = false,
  tokens = CHAT_TEMPLATE_TOKENS,
  className,
}: ChatTemplateFormProps) {
  const { t } = useTranslation('app');
  const id = useId();
  const [name, setName] = useState(initial.name);
  const [text, setText] = useState(initial.text);
  const [errors, setErrors] = useState<FieldErrors>({});
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Caret to restore in the text once an inserted token is rendered
  const caretRef = useRef<number | null>(null);
  // The placeholders this text will ask for when used
  const asks = templatePlaceholders(text);

  useLayoutEffect(() => {
    const textarea = textRef.current;
    if (caretRef.current === null || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [text]);

  const insertToken = (token: string) => {
    const textarea = textRef.current;
    const start = textarea?.selectionStart ?? text.length;
    const end = textarea?.selectionEnd ?? text.length;
    caretRef.current = start + token.length;
    setText(text.slice(0, start) + token + text.slice(end));
    setErrors((current) => ({ ...current, text: undefined }));
  };

  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const parsed = chatTemplateSchema.safeParse({ name, text });
    if (parsed.success) {
      onSubmit({ name: parsed.data.name, text: parsed.data.text });
      return;
    }
    const next: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof FieldErrors;
      next[field] ??= issue.message;
    }
    setErrors(next);
  };

  const errorClass = 'text-xs text-destructive';
  return (
    <form
      aria-label={label}
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
      className={cn('flex flex-col gap-2.5 p-3', className)}
    >
      {!fixedName && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-name`}
            className="text-xs font-medium text-foreground">
            {t('chatTemplateForm.name')}
          </label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            placeholder={t('chatTemplateForm.namePlaceholder')}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
            autoFocus
            className="h-8 text-sm"
          />
          {errors.name && (
            <p id={`${id}-name-error`}
              role="alert"
              className={errorClass}>
              {errors.name}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={`${id}-text`}
            className="text-xs font-medium text-foreground">
            {t('chatTemplateForm.message')}
          </label>
          <span
            className={cn(
              'text-[11px] tabular-nums',
              text.trim().length > CHAT_TEMPLATE_TEXT_MAX ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {text.trim().length}/{CHAT_TEMPLATE_TEXT_MAX}
          </span>
        </div>
        <Textarea
          id={`${id}-text`}
          ref={textRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErrors((current) => ({ ...current, text: undefined }));
          }}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter saves; Enter alone is a new line
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
          }}
          rows={3}
          placeholder={t('chatTemplateForm.messagePlaceholder')}
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={errors.text ? `${id}-text-error` : `${id}-tokens ${id}-asks`}
          autoFocus={fixedName}
          className="min-h-16 font-mono text-sm"
        />
        {errors.text && (
          <p id={`${id}-text-error`}
            role="alert"
            className={errorClass}>
            {errors.text}
          </p>
        )}
        <div id={`${id}-tokens`}
          className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-muted-foreground">Insert:</span>
          {tokens.map(({ token, description }) => (
            <button
              key={token}
              type="button"
              title={description}
              // Keep the text's caret: the token goes where the user was typing
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertToken(token)}
              className="rounded-sm border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] text-foreground/80 outline-none transition-[color,background-color,border-color] duration-(--dur-fast) hover:border-ring/50 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {token}
            </button>
          ))}
        </div>
        <p id={`${id}-asks`}
          className="text-[11px] leading-relaxed text-muted-foreground">
          {asks.length > 0 ? (
            <>
              {t('chatTemplateForm.asksWhenUsed')}
              {asks.map((name) => (
                <React.Fragment key={name}>
                  {' '}
                  <code className="rounded bg-primary/12 px-1 py-px font-mono text-primary">{`{${name}}`}</code>
                </React.Fragment>
              ))}
            </>
          ) : (
            t('chatTemplateForm.asksNone')
          )}
        </p>
      </div>

      <div className="flex gap-1.5">
        <Button type="submit"
          size="sm">
          <Check />
          {submitLabel}
        </Button>
        <Button type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
      </div>
    </form>
  );
}
