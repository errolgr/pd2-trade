import React from 'react';
import type { JsonValue, UiNode } from '@pd2-trader/plugin-sdk';
import { PriceTag, SlotAction, SlotBadge, SlotDivider, SlotList, SlotRow, SlotSection, SlotText } from './slot-components';

/**
 * Renders a validated declarative tree (PRD §6.2) with slot components only. Input is already schema-checked
 * by the host (instance.validateSlotOutput); plugin strings render as React text, never HTML.
 */
export function UiTree({
  nodes,
  onCommand,
}: {
  nodes: UiNode[];
  onCommand: (commandId: string, args?: JsonValue) => void;
}) {
  return (
    <>
      {nodes.map((node, i) => (
        <UiNodeView key={i}
          node={node}
          onCommand={onCommand} />
      ))}
    </>
  );
}

function UiNodeView({ node, onCommand }: { node: UiNode; onCommand: (commandId: string, args?: JsonValue) => void }) {
  switch (node.type) {
    case 'section':
      return (
        <SlotSection title={node.title}>
          <UiTree nodes={node.children}
            onCommand={onCommand} />
        </SlotSection>
      );
    case 'row':
      return <SlotRow label={node.label}
        value={node.value}
        tone={node.tone} />;
    case 'badge':
      return <SlotBadge text={node.text}
        tone={node.tone} />;
    case 'text':
      return <SlotText text={node.text}
        tone={node.tone}
        size={node.size} />;
    case 'price':
      return <PriceTag amount={node.amount}
        unit={node.unit}
        trend={node.trend} />;
    case 'button':
      return (
        <div>
          <SlotAction label={node.label}
            onClick={() => onCommand(node.commandId, node.args)} />
        </div>
      );
    case 'divider':
      return <SlotDivider />;
    case 'list':
      return (
        <SlotList
          items={node.items.map((item, i) => (
            <UiNodeView key={i}
              node={item}
              onCommand={onCommand} />
          ))}
        />
      );
  }
}
