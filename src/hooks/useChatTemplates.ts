import { useEffect, useMemo, useRef } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { isChatTemplate, type ChatTemplate } from '@/lib/message-templates';

export type ChatTemplateDraft = Pick<ChatTemplate, 'name' | 'text'>;

/**
 * The user's own chat templates and the edits on them, each saved to the settings right away. Settings → Chat
 * and the chat composer's "/" menu both edit through this, so they stay in sync.
 */
export function useChatTemplates() {
  const { settings, updateSettings } = useOptions();
  const saved = settings?.chatTemplates;
  const templates = useMemo(() => (saved ?? []).filter(isChatTemplate), [saved]);
  // The list edits apply to: the last one saved (an Undo after other edits keeps them)
  const latest = useRef(templates);
  useEffect(() => {
    latest.current = templates;
  }, [templates]);

  const save = (next: ChatTemplate[]) => {
    latest.current = next;
    updateSettings({ chatTemplates: next });
  };

  return {
    templates,
    /** Appends a new template; returns it. */
    add: (draft: ChatTemplateDraft): ChatTemplate => {
      const created = { id: crypto.randomUUID(), ...draft };
      save([...latest.current, created]);
      return created;
    },
    update: (id: string, draft: ChatTemplateDraft) =>
      save(latest.current.map((t) => (t.id === id ? { ...t, ...draft } : t))),
    /** Deletes a template; returns it and where it was, for `restore`. */
    remove: (id: string): { template: ChatTemplate; index: number } | null => {
      const index = latest.current.findIndex((t) => t.id === id);
      if (index < 0) return null;
      const template = latest.current[index];
      save(latest.current.filter((t) => t.id !== id));
      return { template, index };
    },
    /** Puts a deleted template back where it was (Undo). */
    restore: (template: ChatTemplate, index: number) => {
      if (latest.current.some((t) => t.id === template.id)) return;
      const next = [...latest.current];
      next.splice(Math.min(index, next.length), 0, template);
      save(next);
    },
    /** Swaps the template at `index` with its neighbour above (-1) or below (1). */
    move: (index: number, step: -1 | 1) => {
      const next = [...latest.current];
      if (!next[index] || !next[index + step]) return;
      [next[index], next[index + step]] = [next[index + step], next[index]];
      save(next);
    },
  };
}
