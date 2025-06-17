import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface HoverPopoverProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export const HoverDropdown: React.FC<HoverPopoverProps> = ({ content, children }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={'focus:outline-none focus-visible:outline-none'}>{children}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
};
