import React from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bell,
  BellOff,
  Eraser,
  ExternalLink,
  Gamepad2,
  MoreHorizontal,
  PanelRight,
  Pin,
  PinOff,
  Swords,
  Trash2,
  UserRound,
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
import type { TraderPresence } from '../hooks/useTraderProfile';
import { characterUrl, ChatAvatar, profileUrl, Tip } from './chat-parts';

const iconButtonClass = cn(
  buttonVariants({ variant: 'ghost', size: 'icon' }),
  'size-8 shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
);

export function ThreadHeader({
  name,
  participant,
  account,
  inGameOnly,
  characterName,
  presence,
  presenceText,
  pinned,
  muted,
  archived,
  traderOpen,
  onToggleTrader,
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
  /** Their presence (dot on the avatar), and its label ('In game now'); undefined while unknown. */
  presence: TraderPresence['kind'] | undefined;
  presenceText: string | undefined;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  /** The Trader sidebar is showing. */
  traderOpen: boolean;
  /** Shows or hides the Trader sidebar (the avatar and name open it too). */
  onToggleTrader: () => void;
  /** Compact layout: back to the conversation list. */
  onBack?: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onToggleArchive: () => void;
  onDeleteConversation?: () => void;
  onForgetWhispers?: () => void;
}) {
  const username = participant?.username;
  return (
    <div className="relative flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-linear-to-b from-card/80 to-card/30 px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack && (
          <button
            type="button"
            aria-label="Back to conversations"
            title="Back to conversations (Esc)"
            onClick={onBack}
            className={cn(iconButtonClass, '-ml-1')}
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Trader details for ${name}`}
          onClick={traderOpen ? undefined : onToggleTrader}
          className="shrink-0 rounded-full outline-none transition-transform duration-(--dur-fast) hover:scale-105 active:scale-95"
        >
          <ChatAvatar name={name}
            presence={presence}
            className="size-10" />
        </button>
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-tight tracking-tight text-foreground">
            <button
              type="button"
              onClick={traderOpen ? undefined : onToggleTrader}
              className="min-w-0 truncate rounded-sm outline-none hover:underline hover:decoration-primary/50 hover:underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              {name}
            </button>
            {muted && <BellOff role="img"
              aria-label="Muted"
              className="size-3 shrink-0 text-muted-foreground" />}
            {pinned && <Pin role="img"
              aria-label="Pinned"
              className="size-3 shrink-0 text-primary/80" />}
          </h3>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {username && (
              <Tip label="Open their Project Diablo 2 profile"
                side="bottom">
                <button
                  type="button"
                  onClick={() => openUrl(profileUrl(username))}
                  className="inline-flex min-w-0 items-center gap-0.5 rounded-sm outline-none transition-colors duration-(--dur-fast) hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <span className="truncate">@{username}</span>
                  <ExternalLink aria-hidden
                    className="size-3 shrink-0 opacity-70" />
                </button>
              </Tip>
            )}
            {presenceText && (
              <>
                {username && <span aria-hidden>·</span>}
                <span className={cn('shrink-0', presence === 'ingame' && 'font-medium text-success')}>
                  {presenceText}
                </span>
              </>
            )}
            {account && (
              <span
                className="ml-0.5 flex min-w-0 items-center gap-1 rounded-full border border-border/70 bg-background/50 px-1.5 py-px"
                title="In-game account"
              >
                <Gamepad2 aria-hidden
                  className="size-3 shrink-0" />
                <span className="truncate font-medium text-foreground/85">{account}</span>
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
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Tip label={traderOpen ? 'Hide trader details' : 'Show trader details'}
          side="bottom">
          <button
            type="button"
            aria-label="Trader details"
            aria-pressed={traderOpen}
            onClick={onToggleTrader}
            className={cn(
              iconButtonClass,
              traderOpen && 'bg-primary/12 text-primary hover:bg-primary/18 hover:text-primary',
            )}
          >
            <PanelRight className="size-4" />
          </button>
        </Tip>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Conversation options"
            className={iconButtonClass}>
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
            {(username || characterName) && <DropdownMenuSeparator />}
            {username && (
              <DropdownMenuItem onSelect={() => openUrl(profileUrl(username))}
                className="cursor-pointer">
                <UserRound className="size-4" />
                View Profile
              </DropdownMenuItem>
            )}
            {characterName && (
              <DropdownMenuItem onSelect={() => openUrl(characterUrl(characterName))}
                className="cursor-pointer">
                <Swords className="size-4" />
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
    </div>
  );
}
