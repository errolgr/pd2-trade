import React, { useId, useRef, useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fillTemplate } from '@/lib/message-templates';

/** Answers given to template placeholders this session, by name: offered again next time ({game}, {pw}...). */
const rememberedAnswers = new Map<string, string>();

interface TemplateFillProps {
  /** The template's name. */
  label: string;
  /** Its text as written, tokens and placeholders unfilled. */
  template: string;
  /** Its custom placeholders, in order (templatePlaceholders). */
  placeholders: string[];
  /** The conversation's token values. */
  vars: Readonly<Record<string, string | number | null | undefined>>;
  onInsert: (text: string) => void;
  onCancel: () => void;
}

/**
 * "Fill in" step of a template with custom placeholders, in the chat's "/" menu: one field per placeholder
 * (prefilled with this session's last answer) and a live preview of the message. Enter moves to the next field
 * and inserts from the last one (Ctrl/Cmd+Enter from any), Esc goes back to the list.
 */
export function TemplateFill({ label, template, placeholders, vars, onInsert, onCancel }: TemplateFillProps) {
  const id = useId();
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(placeholders.map((name) => [name, rememberedAnswers.get(name) ?? ''])),
  );
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const preview = fillTemplate(template, vars, answers);
  const blank = placeholders.filter((name) => !answers[name]);

  const insert = () => {
    placeholders.forEach((name) => rememberedAnswers.set(name, answers[name]));
    onInsert(preview);
  };

  return (
    <form
      aria-label={`Fill in ${label}`}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        insert();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex max-h-80 flex-col gap-2.5 overflow-y-auto p-3"
    >
      {placeholders.map((name, index) => (
        <div key={name}
          className="flex flex-col gap-1">
          <label htmlFor={`${id}-${index}`}
            className="text-xs font-medium text-foreground">
            {name}
          </label>
          <Input
            id={`${id}-${index}`}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={answers[name]}
            onChange={(e) => setAnswers((current) => ({ ...current, [name]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (e.ctrlKey || e.metaKey || index === placeholders.length - 1) insert();
              else inputs.current[index + 1]?.focus();
            }}
            autoFocus={index === 0}
            autoComplete="off"
            className="h-8 text-sm"
          />
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground">Preview</span>
        <p
          aria-label="Preview"
          className="whitespace-pre-wrap break-words rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5 text-sm text-foreground"
        >
          {preview}
        </p>
        {blank.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            Left empty, inserted blank: {blank.map((name) => `{${name}}`).join(' ')}
          </p>
        )}
      </div>

      <div className="flex gap-1.5">
        <Button type="submit"
          size="sm">
          <CornerDownLeft />
          Insert
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
