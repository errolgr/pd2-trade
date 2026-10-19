import React from 'react';
import { Gamepad2, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Participant } from '@/common/types/pd2-website/ChatTypes';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChatAvatar, participantName } from './chat-parts';

export function ThreadHeader({
  participant,
  onDelete,
}: {
  participant: Participant | undefined;
  onDelete: () => void;
}) {
  const name = participantName(participant);
  const username = participant?.username && participant.username !== name ? participant.username : null;
  const account = participant?.game?.accounts?.[0];
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/50 px-4">
      <div className="flex min-w-0 items-center gap-3">
        <ChatAvatar name={name}
          className="size-9" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold leading-tight text-foreground">{name}</h3>
          {(username || account) && (
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {username && <span className="truncate">@{username}</span>}
              {username && account && <span aria-hidden>·</span>}
              {account && (
                <span className="flex min-w-0 items-center gap-1"
                  title="In-game account">
                  <Gamepad2 aria-hidden
                    className="size-3 shrink-0" />
                  <span className="truncate font-medium text-foreground/80">{account}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Conversation options"
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'icon' }),
            'size-8 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"
          side="bottom"
          sideOffset={5}>
          <DropdownMenuItem variant="destructive"
            onSelect={onDelete}
            className="cursor-pointer">
            <Trash2 className="size-4" />
            Delete Conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
