import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, FileText, Pencil, Plus, X } from 'lucide-react';
import { ChatTemplateForm } from '@/components/custom/chat-template-form';
import { Button } from '@/components/ui/button';
import { useChatTemplates } from '@/hooks/useChatTemplates';
import { listItem, springSnappy } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { MacroTemplate } from '@/pages/quick-list/components/MacroManagerSheet';

const rowAction =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-(--dur-fast) hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-90 disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5';

/**
 * The user's own chat templates (Settings → Chat): listed in "/" menu order, each can be moved, edited or
 * deleted, and new ones added. Every change is saved right away.
 */
export function ChatTemplatesEditor() {
  const { templates, add, update, remove, move } = useChatTemplates();
  // The template being edited ('new': the add form)
  const [editing, setEditing] = useState<string | null>(null);

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
                  <ChatTemplateForm
                    label={`Edit ${template.name}`}
                    initial={template}
                    submitLabel="Save"
                    onSubmit={(draft) => {
                      update(template.id, draft);
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
                          remove(template.id);
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
          <ChatTemplateForm
            label="New template"
            initial={{ name: '', text: '' }}
            submitLabel="Add template"
            onSubmit={(draft) => {
              add(draft);
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
