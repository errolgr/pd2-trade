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
      className="flex max-h-72 flex-col gap-2 overflow-y-auto px-3 py-2"
    >
      {/* One compact row per placeholder: name on the left, field on the right; two per row when there's room */}
      <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 @[420px]:grid-cols-2">
        {placeholders.map((name, index) => (
          <div key={name}
            className="flex min-w-0 items-center gap-2">
            <label
              htmlFor={`${id}-${index}`}
              className="max-w-24 shrink-0 truncate font-mono text-[11px] text-muted-foreground"
            >
              {`{${name}}`}
            </label>
            <Input
              id={`${id}-${index}`}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              aria-label={name}
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
              className="h-7 min-w-0 flex-1 px-2 text-xs"
            />
          </div>
        ))}
      </div>

      {/* Preview and actions on one line */}
      <div className="flex items-center gap-2">
        <p
          aria-label="Preview"
          title={preview}
          className="min-w-0 flex-1 truncate rounded-md bg-muted/40 px-2 py-1 text-xs text-foreground/90"
        >
          {preview}
        </p>
        <Button type="submit"
          size="sm"
          className="h-7 px-2.5 text-xs">
          <CornerDownLeft />
          Insert
        </Button>
        <Button type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {blank.length > 0 && (
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Left empty, inserted blank: {blank.map((name) => `{${name}}`).join(' ')}
        </p>
      )}
    </form>
  );
}
