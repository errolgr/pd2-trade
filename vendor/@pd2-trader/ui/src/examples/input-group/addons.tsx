import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  Kbd,
} from '@pd2-trader/ui';
import { Copy, Link, Send } from 'lucide-react';
import { useState } from 'react';

export const meta = {
  title: 'Addons',
  description:
    'Icons, text, kbd and buttons inside one box: `InputGroupAddon align` places them inline (start/end) or as a row above/below a textarea; the group owns the focus ring.',
  order: 0,
};

export default function InputGroupAddonsExample() {
  const [message, setMessage] = useState('WTS Shako 2.5 HR, whisper *Sorc_Errol');
  return (
    <div className="flex w-popover flex-col gap-3 rounded-lg border bg-surface p-4">
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>Min</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Minimum price"
          inputMode="decimal"
          defaultValue="0.5" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>HR</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <Link aria-hidden />
        </InputGroupAddon>
        <InputGroupInput aria-label="Listing link"
          readOnly
          value="pd2trader.com/l/8f3k2" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs"
            aria-label="Copy link">
            <Copy />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput aria-label="Jump to"
          placeholder="Jump to panel…" />
        <InputGroupAddon align="inline-end">
          <Kbd>Ctrl K</Kbd>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea aria-label="Trade message"
          value={message}
          onChange={(e) => setMessage(e.target.value)} />
        <InputGroupAddon align="block-end"
          className="border-t border-border">
          <InputGroupText className="text-2xs tabular-nums">{message.length} / 120</InputGroupText>
          <InputGroupButton size="sm"
            variant="default"
            className="ml-auto">
            <Send /> Send
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
