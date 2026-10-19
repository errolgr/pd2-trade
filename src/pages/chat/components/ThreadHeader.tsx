import React from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bell,
  BellOff,
  Eraser,
  Gamepad2,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  User,
} from 'lucide-react';
import type { Participant } from '@/common/types/pd2-website/ChatTypes';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { openUrl } from '@/lib/browser-opener';
import { cn } from '@/lib/utils';
import { ChatAvatar } from './chat-parts';

export function ThreadHeader({
  name,
  participant,
  account,
  inGameOnly,
  characterName,
  pinned,
  muted,
  archived,
  onBack,
  onTogglePin,
  onToggleMute,
  onToggleArchive,
  onDeleteConversation,
  onForgetWhispers,
}: {
  name: string;
  participant: Participant | undefined;
  /** The in-game account whispers reach. */
  account: string | undefined;
  /** No website user is known: only whispers reach them. */
  inGameOnly: boolean;
  /** A character seen in their whispers (opens their armory page). */
  characterName: string | undefined;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** Compact layout: back to the conversation list. */
  onBack?: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onToggleArchive: () => void;
  onDeleteConversation?: () => void;
  onForgetWhispers?: () => void;
}) {
  const username = participant?.username && participant.username !== name ? participant.username : null;
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/50 px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            aria-label="Back to conversations"
            title="Back to conversations (Esc)"
            onClick={onBack}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              '-ml-1 size-8 shrink-0 text-muted-foreground hover:text-foreground',
            )}
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <ChatAvatar name={name}
          className="size-9" />
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-tight text-foreground">
            <span className="truncate">{name}</span>
            {muted && <BellOff role="img"
              aria-label="Muted"
              className="size-3 shrink-0 text-muted-foreground" />}
            {pinned && <Pin role="img"
              aria-label="Pinned"
              className="size-3 shrink-0 text-primary/80" />}
          </h3>
          {(username || account || inGameOnly) && (
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
              {inGameOnly && (
                <span
                  className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-medium uppercase tracking-wide"
                  title="Not linked to a website account: replies are copied as in-game whispers"
                >
                  in-game only
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
            'size-8 shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end"
          side="bottom"
          sideOffset={5}>
          <DropdownMenuItem onSelect={onTogglePin}
            className="cursor-pointer">
            {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            {pinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleMute}
            className="cursor-pointer">
            {muted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            {muted ? 'Unmute' : 'Mute'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleArchive}
            className="cursor-pointer">
            {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {archived ? 'Unarchive' : 'Archive'}
          </DropdownMenuItem>
          {characterName && (
            <DropdownMenuItem
              onSelect={() => openUrl(`https://www.projectdiablo2.com/character/${encodeURIComponent(characterName)}`)}
              className="cursor-pointer"
            >
              <User className="size-4" />
              View Character
            </DropdownMenuItem>
          )}
          {(onForgetWhispers || onDeleteConversation) && <DropdownMenuSeparator />}
          {onForgetWhispers && (
            <DropdownMenuItem variant="destructive"
              onSelect={onForgetWhispers}
              className="cursor-pointer">
              <Eraser className="size-4" />
              Delete Whisper History
            </DropdownMenuItem>
          )}
          {onDeleteConversation && (
            <DropdownMenuItem variant="destructive"
              onSelect={onDeleteConversation}
              className="cursor-pointer">
              <Trash2 className="size-4" />
              Delete Conversation
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
