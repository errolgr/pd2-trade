import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, FileText, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useOptions } from '@/hooks/useOptions';
import {
  CHAT_TEMPLATE_TEXT_MAX,
  CHAT_TEMPLATE_TOKENS,
  chatTemplateSchema,
  isChatTemplate,
  type ChatTemplate,
} from '@/lib/message-templates';
import { listItem, springSnappy } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { MacroTemplate } from '@/pages/quick-list/components/MacroManagerSheet';

const rowAction =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-(--dur-fast) hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-90 disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5';

type FieldErrors = Partial<Record<'name' | 'text', string>>;

/**
 * The user's own chat templates (Settings → Chat): listed in "/" menu order, each can be moved, edited or
 * deleted, and new ones added. Every change is saved right away.
 */
export function ChatTemplatesEditor() {
  const { settings, updateSettings } = useOptions();
  const templates = (settings?.chatTemplates ?? []).filter(isChatTemplate);
  // The template being edited ('new': the add form)
  const [editing, setEditing] = useState<string | null>(null);

  const save = (next: ChatTemplate[]) => updateSettings({ chatTemplates: next });

  const move = (index: number, step: -1 | 1) => {
    const next = [...templates];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    save(next);
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Type <kbd className="rounded-sm border border-border/70 bg-muted/60 px-1 font-mono text-[11px]">/</kbd> in a
        chat message to use these. Tokens fill in from the conversation.
      </p>

      {templates.length > 0 ? (
        <ul aria-label="Your templates"
          className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {templates.map((template, index) => (
              <motion.li
                key={template.id}
                layout
                variants={listItem}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={springSnappy}
                className="group/template rounded-lg border border-border/70 bg-background/40"
              >
                {editing === template.id ? (
                  <TemplateForm
                    initial={template}
                    submitLabel="Save"
                    onSubmit={({ name, text }) => {
                      save(templates.map((t) => (t.id === template.id ? { ...t, name, text } : t)));
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="flex items-start gap-2 py-2 pr-1.5 pl-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{template.name}</div>
                      <MacroTemplate
                        text={template.text}
                        className="line-clamp-2 text-xs whitespace-pre-wrap text-muted-foreground"
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity duration-(--dur-fast) group-hover/template:opacity-100 group-focus-within/template:opacity-100">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${template.name} up`}
                        title="Move up"
                        className={rowAction}
                      >
                        <ChevronUp />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === templates.length - 1}
                        aria-label={`Move ${template.name} down`}
                        title="Move down"
                        className={rowAction}
                      >
                        <ChevronDown />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(template.id)}
                        aria-label={`Edit ${template.name}`}
                        title="Edit"
                        className={rowAction}
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          save(templates.filter((t) => t.id !== template.id));
                          if (editing === template.id) setEditing(null);
                        }}
                        aria-label={`Delete ${template.name}`}
                        title="Delete"
                        className={cn(rowAction, 'hover:bg-destructive/15 hover:text-destructive')}
                      >
                        <X />
                      </button>
                    </div>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 px-3 py-2.5 text-xs text-muted-foreground">
          <FileText aria-hidden
            className="size-3.5" />
          No templates of your own yet.
        </p>
      )}

      {editing === 'new' ? (
        <div className="rounded-lg border border-border/70 bg-background/40">
          <TemplateForm
            initial={{ name: '', text: '' }}
            submitLabel="Add template"
            onSubmit={({ name, text }) => {
              save([...templates, { id: crypto.randomUUID(), name, text }]);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <Button type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setEditing('new')}>
          <Plus />
          Add template
        </Button>
      )}
    </div>
  );
}

/** Name + multi-line text of a template, with token chips that insert at the caret; validated on submit. */
function TemplateForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; text: string };
  submitLabel: string;
  onSubmit: (template: { name: string; text: string }) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initial.name);
  const [text, setText] = useState(initial.text);
  const [errors, setErrors] = useState<FieldErrors>({});
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Caret to restore in the text once an inserted token is rendered
  const caretRef = useRef<number | null>(null);

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
      aria-label={initial.name ? `Edit ${initial.name}` : 'New template'}
      noValidate
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2.5 p-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-name`}
          className="text-xs font-medium text-foreground">
          Name
        </label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          placeholder="e.g. Still available?"
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

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={`${id}-text`}
            className="text-xs font-medium text-foreground">
            Message
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
          placeholder="e.g. Hi, is your {itemName} still available?"
          aria-invalid={errors.text ? true : undefined}
          aria-describedby={errors.text ? `${id}-text-error` : `${id}-tokens`}
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
          {CHAT_TEMPLATE_TOKENS.map(({ token, description }) => (
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
          Cancel
        </Button>
      </div>
    </form>
  );
}
