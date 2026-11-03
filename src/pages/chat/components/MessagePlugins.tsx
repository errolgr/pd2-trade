import React from 'react';
import { SlotAction, SlotBadge } from '@pd2-trader/ui';
import type { Tone } from '@pd2-trader/plugin-sdk';
import { fromTimelineEntry } from '@/plugins/adapters/chat';
import { runPluginCommand } from '@/plugins/ui/hooks';
import type { TimelineEntry } from '../lib/inbox';
import { useMessagePluginSlot } from '../hooks/useMessagePluginSlot';

/** `chat.decorate` highlight: the bubble's ring in the plugin's tone (overrides the resting ring). */
const HIGHLIGHT_RING: Record<Tone, string> = {
  default: 'ring-2 ring-foreground/40',
  muted: 'ring-2 ring-muted-foreground/50',
  success: 'ring-2 ring-success/60',
  warning: 'ring-2 ring-warning/60',
  danger: 'ring-2 ring-destructive/60',
  'q-unique': 'ring-2 ring-q-unique/60',
  'q-set': 'ring-2 ring-q-set/60',
  'q-rare': 'ring-2 ring-q-rare/60',
  'q-magic': 'ring-2 ring-q-magic/60',
  'q-crafted': 'ring-2 ring-q-crafted/60',
  'q-rune': 'ring-2 ring-q-rune/60',
};

/**
 * Plugin output for one chat bubble (B3): `chat.decorate` tags + highlight and `chat.action` buttons. Each
 * message is asked once per running plugin set; nothing is built or called without such a plugin. Pending
 * and failed plugins render nothing inline (their failures show on the Plugins page).
 */
export function useMessagePlugins(entry: TimelineEntry, otherName: string) {
  const input = entry.offer || entry.trade ? null : () => fromTimelineEntry(entry, { other: otherName });
  const decorations = useMessagePluginSlot('chat.decorate', input, entry.key);
  const actions = useMessagePluginSlot('chat.action', input, entry.key);

  const decorated = decorations.flatMap((r) =>
    r.state === 'ok' && r.value ? [{ pluginId: r.pluginId, ...r.value }] : [],
  );
  const highlight = decorated.find((d) => d.highlight)?.highlight;
  const tags = decorated.flatMap((d) =>
    d.tags.map((tag, i) => <SlotBadge key={`${d.pluginId}:${i}`}
      text={tag.text}
      tone={tag.tone} />),
  );
  const buttons = actions.flatMap((r) =>
    r.state === 'ok'
      ? r.value.map((button, i) => (
          <SlotAction
            key={`${r.pluginId}:${i}`}
            label={button.label}
            onClick={() => runPluginCommand(r.pluginId, button.commandId, button.args ?? entry.key)}
          />
        ))
      : [],
  );

  return {
    highlightClass: highlight ? HIGHLIGHT_RING[highlight] : undefined,
    tags: tags.length > 0 ? tags : null,
    actions:
      buttons.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1 self-center opacity-0 transition-opacity duration-(--dur-fast) focus-within:opacity-100 group-hover/msg:opacity-100">
          {buttons}
        </div>
      ) : null,
  };
}
