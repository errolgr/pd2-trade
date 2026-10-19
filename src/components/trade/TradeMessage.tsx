import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Loader2,
  X,
  RefreshCw,
  User,
  MessageSquare,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  History,
  CheckSquare,
  RotateCcw,
  MessageCircle,
  Package,
  EyeOffIcon,
  Eye,
} from 'lucide-react';
import moment from 'moment';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useClipboard } from '@/hooks/useClipboard';
import { openUrl } from '@/lib/browser-opener';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { confirmToast, useOverlay } from '@/overlay';
import { useOptions } from '@/hooks/useOptions';
import { fillTemplate } from '@/lib/message-templates';
import { DUR, EASE_OUT, scaleIn } from '@/lib/motion';

export interface TradeMessageHistoryEntry {
  id: string;
  isIncoming: boolean;
  message: string;
  timestamp: Date;
}

export interface TradeMessageData {
  id: string;
  isIncoming: boolean;
  playerName: string;
  accountName?: string;
  characterName?: string;
  message: string;
  itemName?: string;
  price?: string;
  timestamp: Date;
  history?: TradeMessageHistoryEntry[];
  listingId?: string; // For website offers
  userId?: string; // User ID for website offers
  acceptedOfferId?: string; // ID of the accepted offer for this listing
  listingClosed?: boolean; // Outgoing website offers: the listing was sold or delisted (archived)
}

interface TradeMessageProps {
  trade: TradeMessageData;
  onClose: (id: string) => void;
  onRefresh?: (id: string) => void;
  onRevoke?: (id: string) => Promise<void>;
  onAccept?: (listingId: string, offerId: string) => Promise<void>;
  onReject?: (offerId: string) => Promise<void>;
  onUnaccept?: (listingId: string) => Promise<void>;
  onDelete?: (listingId: string) => Promise<void>;
  onDeleteOutgoing?: (offerId: string) => void;
  onRestoreOutgoing?: (offerId: string) => void;
  isHidden?: boolean;
}

export const TradeMessage: React.FC<TradeMessageProps> = ({
  trade,
  onClose,
  onRefresh,
  onRevoke,
  onAccept,
  onReject,
  onUnaccept,
  onDelete,
  onDeleteOutgoing,
  onRestoreOutgoing,
  isHidden = false,
}) => {
  const { authData, createConversation, sendMessage } = usePd2Website();
  const { openPanel } = useOverlay();
  const { settings } = useOptions();
  // Tokens every offer message template (Options → Chat) can use; accept messages add {gameInfo}.
  const templateVars = {
    accountName: trade.accountName,
    characterName: trade.characterName,
    itemName: trade.itemName,
    price: trade.price,
  };

  const [acceptPopoverOpen, setAcceptPopoverOpen] = useState(false);

  const [historyPopoverOpen, setHistoryPopoverOpen] = useState(false);
  const [gameName, setGameName] = useState('');
  const [password, setPassword] = useState('');
  const [copiedAction, setCopiedAction] = useState<'accept' | 'whisper' | 'reject' | 'sold' | null>(null);
  // Only the re-render matters: "time ago" labels use moment().fromNow() during render
  const [, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const historyCardRef = React.useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // The history card overlays the enclosing panel frame (not the whole full-monitor overlay)
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setPortalTarget(rootRef.current?.closest('[data-panel-id]') ?? document.body);
  }, []);
  const { copy } = useClipboard();

  // Update timer to refresh "time ago" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close the history card on a pointer press outside it (also presses on other panels, which no longer
  // blur a window), when the overlay window loses focus, or on Escape
  useEffect(() => {
    if (!historyPopoverOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (historyCardRef.current && !historyCardRef.current.contains(event.target as Node)) {
        setHistoryPopoverOpen(false);
      }
    };
    const handleWindowBlur = () => setHistoryPopoverOpen(false);
    // Escape closes the history card (QOL)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHistoryPopoverOpen(false);
    };

    // Small delay to prevent immediate close when opening
    const timeoutId = setTimeout(() => {
      // Capture phase: panel drag handles preventDefault/stopPropagation their pointerdown
      document.addEventListener('pointerdown', handlePointerDownOutside, true);
      window.addEventListener('blur', handleWindowBlur);
    }, 100);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('pointerdown', handlePointerDownOutside, true);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [historyPopoverOpen]);

  const formatTimeAgo = (date: Date): string => {
    return moment(date).fromNow();
  };

  const handleStop = () => {
    // Stop notifications for this trade
    onClose(trade.id);
  };

  const handleViewProfile = () => {
    // Open profile on website using account name
    const characterName = trade.characterName;
    const url = `https://www.projectdiablo2.com/character/${characterName}`;
    openUrl(url);
  };

  const handleChat = async () => {
    // Copy whisper command to clipboard
    const whisperCommand = `/w *${trade.accountName} `;
    await copy(whisperCommand);
    setCopiedAction('whisper');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleAccept = async () => {
    // For website offers, show popover with game/password inputs
    if (trade.listingId && trade.id && onAccept) {
      if (!gameName) {
        return; // Don't proceed if game name is empty
      }

      if (isProcessing) return;
      setIsProcessing(true);
      try {
        // Create or get conversation
        if (!trade.userId || !authData?.user?._id) {
          console.error('Missing user ID for sending message');
          setIsProcessing(false);
          return;
        }

        const participantIds = [authData.user._id, trade.userId];
        const conversation = await createConversation(participantIds);

        // Use custom message template from settings, or fall back to default
        const template = settings?.acceptOfferMessageTemplate || 'Your offer has been accepted. Game: {gameInfo}';
        const messageContent = fillTemplate(template, {
          ...templateVars,
          gameInfo: password ? `${gameName}////${password}` : gameName,
        });

        // Send message via website chat
        await sendMessage(conversation._id, messageContent, authData.user._id);

        // Accept the offer
        await onAccept(trade.listingId, trade.id);
        setCopiedAction('accept');
        setTimeout(() => setCopiedAction(null), 2000);
        setAcceptPopoverOpen(false);
      } catch (error) {
        console.error('Failed to accept offer:', error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // For non-website offers, use the old clipboard method
    if (!gameName) {
      return; // Don't proceed if game name is empty
    }

    // Use custom message template from settings, or fall back to default
    const template = settings?.acceptOfferMessageTemplate || 'Your offer has been accepted. Game: {gameInfo}';
    const message = fillTemplate(template, {
      ...templateVars,
      gameInfo: password ? `${gameName}////${password}` : gameName,
    });
    const acceptMessage = `/w *${trade.accountName || ''} ${message}`;

    await copy(acceptMessage);
    setCopiedAction('accept');
    setTimeout(() => setCopiedAction(null), 2000);
    setAcceptPopoverOpen(false);
  };

  const handleDecline = async () => {
    // For website offers, use the hook function
    if (trade.listingId && trade.id && onReject) {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await onReject(trade.id);
        setCopiedAction('reject');
        setTimeout(() => setCopiedAction(null), 2000);
      } catch (error) {
        console.error('Failed to reject offer:', error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // For non-website offers, use the old clipboard method
    const template = settings?.rejectOfferMessageTemplate || 'Your offer has been rejected.';
    const message = fillTemplate(template, templateVars);
    const rejectMessage = `/w *${trade.accountName || ''} ${message}`;
    await copy(rejectMessage);
    setCopiedAction('reject');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleUnaccept = async () => {
    // For website offers, use the hook function
    if (trade.listingId && onUnaccept) {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await onUnaccept(trade.listingId);
        setCopiedAction('reject');
        setTimeout(() => setCopiedAction(null), 2000);
      } catch (error) {
        console.error('Failed to unaccept offer:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const deleteListing = async (listingId: string) => {
    if (!onDelete || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);
    try {
      await onDelete(listingId);
      // Close the trade message after successful deletion
      onClose(trade.id);
    } catch (error) {
      console.error('Failed to delete listing:', error);
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleDelete = () => {
    const listingId = trade.listingId;
    if (!listingId || !onDelete) return;
    confirmToast({
      title: 'Delete Listing?',
      description: trade.itemName
        ? `Are you sure you want to delete the listing for ${trade.itemName}?`
        : 'Are you sure you want to delete this listing?',
      confirmLabel: 'Delete',
      variant: 'warning',
      duration: 10000,
      onConfirm: () => deleteListing(listingId),
    });
  };

  // Check if this offer is accepted
  const isAccepted = trade.listingId && trade.acceptedOfferId === trade.id;

  const handleSold = async () => {
    // Copy sold message to clipboard
    const template = settings?.soldOfferMessageTemplate || 'The item has been sold.';
    const message = fillTemplate(template, templateVars);
    const soldMessage = `/w *${trade.accountName || ''} ${message}`;
    await copy(soldMessage);
    setCopiedAction('sold');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleRevoke = async () => {
    if (onRevoke) {
      try {
        await onRevoke(trade.id);
      } catch (error) {
        console.error('Failed to revoke offer:', error);
      }
    }
  };

  const handleDeleteOutgoing = () => {
    if (onDeleteOutgoing && trade.listingId) {
      onDeleteOutgoing(trade.id);
      // Close the trade message after deletion
      onClose(trade.id);
    }
  };

  const handleRestoreOutgoing = () => {
    if (onRestoreOutgoing && trade.listingId) {
      onRestoreOutgoing(trade.id);
      // Close the trade message after restoration
      onClose(trade.id);
    }
  };

  const handleStartChat = async () => {
    if (!trade.userId || !authData?.user?._id) {
      console.error('Missing user ID for starting chat');
      return;
    }

    try {
      // Create conversation with both user IDs
      const participantIds = [authData.user._id, trade.userId];
      const conversation = await createConversation(participantIds);

      // Open (or focus) the chat panel on this conversation
      openPanel('chat', {
        conversationId: conversation._id,
        conversation: conversation,
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const accepted = Boolean(isAccepted);

  return (
    <>
      <div
        ref={rootRef}
        data-slot="trade-message"
        className={cn(
          'group/offer relative w-full overflow-hidden rounded-lg border bg-card/70 py-2.5 pl-4 pr-2.5 text-card-foreground shadow-sm',
          'transition-[border-color,box-shadow,opacity] duration-(--dur-med) ease-out hover:shadow-md',
          trade.isIncoming
            ? 'border-success/40 hover:border-success/70'
            : 'border-destructive/40 hover:border-destructive/70',
          isHidden && 'opacity-60 hover:opacity-90',
        )}
      >
        {/* Direction accent */}
        <span
          aria-hidden
          className={cn('absolute inset-y-0 left-0 w-1', trade.isIncoming ? 'bg-success/80' : 'bg-destructive/80')}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground"
                style={{ fontFamily: 'DiabloFont' }}>
                {trade.playerName}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground"
                title={moment(trade.timestamp).format('LLL')}>
                {formatTimeAgo(trade.timestamp)}
              </span>
              {accepted && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-success">
                  <CheckCircle className="size-3" />
                  Accepted
                </span>
              )}
              {isHidden && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <EyeOffIcon className="size-3" />
                  Hidden
                </span>
              )}
            </div>

            <div className="mb-1.5 flex min-w-0 items-center gap-2 text-sm">
              {trade.itemName && (
                <>
                  {trade.listingId ? (
                    <a
                      href={`https://www.projectdiablo2.com/market/listing/${trade.listingId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        openUrl(`https://www.projectdiablo2.com/market/listing/${trade.listingId}`);
                      }}
                      className="cursor-pointer truncate rounded-sm font-medium text-info underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {trade.itemName}
                    </a>
                  ) : (
                    <span className="truncate font-medium text-foreground">{trade.itemName}</span>
                  )}
                  <ArrowLeftRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                </>
              )}
              {trade.price && (
                <div className="flex shrink-0 items-center gap-1">
                  <span className="font-semibold tabular-nums text-foreground">{trade.price}</span>
                  <Package className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              {!trade.itemName && !trade.price && <span className="text-foreground/80">{trade.message}</span>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1">
              <div className="-ml-1.5 flex items-center gap-0.5">
                {trade.listingId && !trade.isIncoming && onDeleteOutgoing && (
                  <ActionButton tip="Hide offer"
                    tone="destructive"
                    onClick={handleDeleteOutgoing}>
                    <EyeOffIcon />
                  </ActionButton>
                )}

                {!trade.listingId && (
                  <ActionButton tip="Delete trade offer"
                    onClick={handleStop}>
                    <Trash2 />
                  </ActionButton>
                )}

                {trade.listingId && trade.isIncoming && onDelete && (
                  <ActionButton tip="Delete listing"
                    tone="destructive"
                    onClick={handleDelete}
                    disabled={isProcessing}>
                    <Trash2 />
                  </ActionButton>
                )}

                <ActionButton tip="View profile"
                  onClick={handleViewProfile}>
                  <User />
                </ActionButton>

                <ActionButton
                  label="Copy whisper command"
                  tip={copiedAction === 'whisper' ? 'Copied to clipboard!' : 'Copy whisper command'}
                  open={copiedAction === 'whisper' ? true : undefined}
                  done={copiedAction === 'whisper'}
                  onClick={handleChat}
                >
                  {copiedAction === 'whisper' ? <Check /> : <MessageSquare />}
                </ActionButton>

                {!trade.listingId && (
                  <ActionButton
                    label="Item sold"
                    tip={copiedAction === 'sold' ? 'Copied to clipboard!' : 'Item sold'}
                    open={copiedAction === 'sold' ? true : undefined}
                    done={copiedAction === 'sold'}
                    onClick={handleSold}
                  >
                    {copiedAction === 'sold' ? <Check /> : <CheckSquare />}
                  </ActionButton>
                )}

                {!trade.listingId && (
                  <ActionButton tip="View history"
                    onClick={() => setHistoryPopoverOpen(true)}>
                    <History />
                  </ActionButton>
                )}
              </div>

              <div className="flex items-center justify-end gap-0.5">
                {trade.listingId && trade.userId && (
                  <ActionButton tip="Start chat"
                    tone="info"
                    onClick={handleStartChat}>
                    <MessageCircle />
                  </ActionButton>
                )}

                {trade.listingId && !trade.isIncoming && isHidden && onRestoreOutgoing && (
                  <ActionButton tip="Restore offer"
                    tone="success"
                    onClick={handleRestoreOutgoing}>
                    <Eye />
                  </ActionButton>
                )}

                {trade.listingId && !trade.isIncoming && !isHidden && onRevoke && (
                  <ActionButton tip="Revoke offer"
                    tone="warning"
                    onClick={handleRevoke}>
                    <RotateCcw />
                  </ActionButton>
                )}

                {trade.isIncoming && (
                  <div className="flex items-center gap-0.5">
                    {!isAccepted && (
                      // Both website and non-website offers: popover with game/password inputs
                      <Popover open={acceptPopoverOpen}
                        onOpenChange={setAcceptPopoverOpen}>
                        <Tooltip open={copiedAction === 'accept' ? true : undefined}>
                          <TooltipTrigger asChild>
                            <PopoverTrigger
                              disabled={isProcessing}
                              aria-label="Accept"
                              className={cn(
                                actionButtonClass,
                                TONES.success,
                                'data-[state=open]:bg-success/15',
                                copiedAction === 'accept' && 'bg-success/15',
                              )}
                            >
                              <CheckCircle />
                            </PopoverTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {copiedAction === 'accept'
                                ? trade.listingId
                                  ? 'Offer accepted!'
                                  : 'Copied to clipboard!'
                                : 'Accept'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <PopoverContent align="end"
                          className="w-auto p-2.5">
                          <form
                            className="flex flex-col gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAccept();
                            }}
                          >
                            <p className="px-0.5 text-xs font-medium text-muted-foreground">
                              {trade.listingId ? 'Accept & message game info' : 'Copy accept whisper with game info'}
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={gameName}
                                onChange={(e) => setGameName(e.target.value)}
                                placeholder="Game"
                                className="h-8 w-32 text-sm md:text-sm"
                              />
                              <Input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="h-8 w-32 text-sm md:text-sm"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                disabled={!gameName || isProcessing}
                                className="h-8 cursor-pointer"
                              >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <Check />}
                                Accept
                              </Button>
                            </div>
                          </form>
                        </PopoverContent>
                      </Popover>
                    )}

                    {trade.listingId && isAccepted ? (
                      // Show unaccept button if offer is accepted
                      <ActionButton
                        label="Unaccept"
                        tip={copiedAction === 'reject' ? 'Offer unaccepted!' : 'Unaccept'}
                        tone="warning"
                        open={copiedAction === 'reject' ? true : undefined}
                        onClick={handleUnaccept}
                        disabled={isProcessing}
                      >
                        <RotateCcw />
                      </ActionButton>
                    ) : (
                      // Show reject button if offer is not accepted (or non-website offer)
                      <ActionButton
                        label="Reject"
                        tip={
                          copiedAction === 'reject'
                            ? trade.listingId
                              ? 'Offer rejected!'
                              : 'Copied to clipboard!'
                            : 'Reject'
                        }
                        tone="destructive"
                        open={copiedAction === 'reject' ? true : undefined}
                        onClick={handleDecline}
                        disabled={isProcessing}
                      >
                        <XCircle />
                      </ActionButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {onRefresh && (
            <ActionButton tip="Refresh"
              onClick={() => onRefresh(trade.id)}>
              <RefreshCw />
            </ActionButton>
          )}
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {historyPopoverOpen && (
              <motion.div
                key="history"
                className="absolute inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: DUR.med, ease: EASE_OUT } }}
                exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } }}
              >
                {/* Backdrop */}
                <div
                  className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
                  onClick={() => setHistoryPopoverOpen(false)}
                />
                {/* Centered Card */}
                <motion.div
                  ref={historyCardRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Communication History"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="relative z-50 flex max-h-full w-96 max-w-full flex-col rounded-lg border border-border bg-popover text-popover-foreground shadow-panel outline-none"
                  onBlur={() => setHistoryPopoverOpen(false)}
                  tabIndex={-1}
                >
                  <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <History className="size-4 shrink-0 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Communication History</h4>
                      <span className="truncate text-xs text-muted-foreground"
                        style={{ fontFamily: 'DiabloFont' }}>
                        {trade.playerName}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close history"
                      className="size-7"
                      onClick={() => setHistoryPopoverOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="max-h-[min(60vh,320px)] space-y-2 overflow-y-auto p-3">
                    {trade.history && trade.history.length > 0 ? (
                      trade.history
                        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              'rounded-md border-l-2 p-2 text-sm',
                              entry.isIncoming ? 'border-success bg-success/10' : 'border-info bg-info/10',
                            )}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span
                                className="text-xs font-medium text-foreground"
                                style={{ fontFamily: entry.isIncoming ? 'DiabloFont' : 'inherit' }}
                              >
                                {entry.isIncoming ? trade.playerName : 'You'}
                              </span>
                              <span
                                className="text-xs text-muted-foreground"
                                title={moment(entry.timestamp).format('LLL')}
                              >
                                {formatTimeAgo(entry.timestamp)}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-xs text-foreground/90">
                              {entry.message}
                            </p>
                          </div>
                        ))
                    ) : (
                      <div className="py-4 text-center text-sm text-muted-foreground">No history yet</div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
    </>
  );
};

const actionButtonClass = cn(
  buttonVariants({ variant: 'ghost', size: 'icon' }),
  'size-7 cursor-pointer rounded-md [&_svg]:size-3.5',
);

const TONES = {
  neutral: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  destructive: 'text-destructive hover:bg-destructive/10 hover:text-destructive',
  success: 'text-success hover:bg-success/10 hover:text-success',
  warning: 'text-warning hover:bg-warning/10 hover:text-warning',
  info: 'text-info hover:bg-info/10 hover:text-info',
} as const;

interface ActionButtonProps {
  /** Tooltip text (may change to transient feedback such as "Copied to clipboard!"). */
  tip: string;
  /** Stable accessible name; defaults to `tip`. */
  label?: string;
  tone?: keyof typeof TONES;
  open?: boolean;
  /** Briefly highlight the button after a successful action. */
  done?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/** Icon action with tooltip; the tooltip trigger is the button itself (no nested buttons). */
const ActionButton: React.FC<ActionButtonProps> = ({
  tip,
  label,
  tone = 'neutral',
  open,
  done,
  disabled,
  onClick,
  children,
}) => (
  <Tooltip open={open}>
    <TooltipTrigger
      type="button"
      aria-label={label ?? tip}
      disabled={disabled}
      onClick={onClick}
      className={cn(actionButtonClass, TONES[tone], done && 'bg-success/15 text-success')}
    >
      {children}
    </TooltipTrigger>
    <TooltipContent>
      <p>{tip}</p>
    </TooltipContent>
  </Tooltip>
);
