import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import React, { useState } from 'react';

interface HoverPopoverProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onSelect?: () => void;
}

export const HoverPopover: React.FC<HoverPopoverProps> = ({ content, children, className, onSelect }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild
        onClick={onSelect}>
        {/* Wrap the child with mouse events to control the popover */}
        <div onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}>
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        side="bottom" // optional: position the popover below the trigger
        align="center"
        className={className ? className : 'p-0 bg-transparent border-0'}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
};
