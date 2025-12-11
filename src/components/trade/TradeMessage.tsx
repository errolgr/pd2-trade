import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, User, ShoppingCart, ThumbsUp, ArrowRight, ArrowUp, Home, Package,
  Volume2, VolumeX, MessageSquare, Eye, Trash2, CheckCircle, XCircle, ArrowLeftRight,
  History, CheckSquare, RotateCcw, MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useClipboard } from '@/hooks/useClipboard';
import { openUrl } from '@/lib/browser-opener';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { emit } from '@/lib/browser-events';
import { useOptions } from '@/hooks/useOptions';

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
}

interface TradeMessageProps {
  trade: TradeMessageData;
  onClose: (id: string) => void;
  onRefresh?: (id: string) => void;
  onRevoke?: (id: string) => Promise<void>;
  onAccept?: (listingId: string, offerId: string) => Promise<void>;
  onReject?: (offerId: string) => Promise<void>;
  onUnaccept?: (listingId: string) => Promise<void>;
}

export const TradeMessage: React.FC<TradeMessageProps> = ({ trade, onClose, onRefresh, onRevoke, onAccept, onReject, onUnaccept }) => {
  const { authData, createConversation } = usePd2Website();
  const { settings } = useOptions();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [acceptPopoverOpen, setAcceptPopoverOpen] = useState(false);
  const [viewPopoverOpen, setViewPopoverOpen] = useState(false);
  const [historyPopoverOpen, setHistoryPopoverOpen] = useState(false);
  const [gameName, setGameName] = useState('');
  const [password, setPassword] = useState('');
  const [copiedAction, setCopiedAction] = useState<'accept' | 'whisper' | 'reject' | 'sold' | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const historyCardRef = React.useRef<HTMLDivElement>(null);
  const { copy } = useClipboard();

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle click outside and blur to close history card
  useEffect(() => {
    if (!historyPopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (historyCardRef.current && !historyCardRef.current.contains(event.target as Node)) {
        setHistoryPopoverOpen(false);
      }
    };

    const handleBlur = (event: FocusEvent) => {
      if (historyCardRef.current && !historyCardRef.current.contains(event.target as Node)) {
        setHistoryPopoverOpen(false);
      }
    };

    // Small delay to prevent immediate close when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('blur', handleBlur);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('blur', handleBlur);
    };
  }, [historyPopoverOpen]);

  const formatTimeAgo = (date: Date): string => {
    const totalSeconds = Math.floor((currentTime.getTime() - date.getTime()) / 1000);
    if (totalSeconds < 3600) {
      // Show MM:SS for times under an hour (matching the image)
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      // Show HH:MM for times over an hour
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  };

  const handleStop = () => {
    // Stop notifications for this trade
    onClose(trade.id);
  };

  const handleToggleSound = () => {
    setSoundEnabled(!soundEnabled);
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



  const handleTrade = () => {
    // Initiate trade
    console.log('Initiate trade:', trade.playerName);
  };

  const handleAccept = async () => {
    // For website offers, use the hook function
    if (trade.listingId && trade.id && onAccept) {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        await onAccept(trade.listingId, trade.id);
        setCopiedAction('accept');
        setTimeout(() => setCopiedAction(null), 2000);
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
    
    const accountName = trade.accountName || '';
    const characterName = trade.characterName || '';
    const itemName = trade.itemName || '';
    const price = trade.price || '';
    const gameInfo = password ? `${gameName}////${password}` : gameName;
    
    // Use custom message template from settings, or fall back to default
    const template = settings?.acceptOfferMessageTemplate || 'Your offer has been accepted. Game: {gameInfo}';
    const message = template
      .replace(/{gameInfo}/g, gameInfo)
      .replace(/{accountName}/g, accountName)
      .replace(/{characterName}/g, characterName)
      .replace(/{itemName}/g, itemName)
      .replace(/{price}/g, price);
    const acceptMessage = `/w *${accountName} ${message}`;
    
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
    const accountName = trade.accountName || '';
    const characterName = trade.characterName || '';
    const itemName = trade.itemName || '';
    const price = trade.price || '';
    
    const template = settings?.rejectOfferMessageTemplate || 'Your offer has been rejected.';
    const message = template
      .replace(/{accountName}/g, accountName)
      .replace(/{characterName}/g, characterName)
      .replace(/{itemName}/g, itemName)
      .replace(/{price}/g, price);
    const rejectMessage = `/w *${accountName} ${message}`;
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

  // Check if this offer is accepted
  const isAccepted = trade.listingId && trade.acceptedOfferId === trade.id;

  const handleSold = async () => {
    // Copy sold message to clipboard
    const accountName = trade.accountName || '';
    const characterName = trade.characterName || '';
    const itemName = trade.itemName || '';
    const price = trade.price || '';
    
    const template = settings?.soldOfferMessageTemplate || 'The item has been sold.';
    const message = template
      .replace(/{accountName}/g, accountName)
      .replace(/{characterName}/g, characterName)
      .replace(/{itemName}/g, itemName)
      .replace(/{price}/g, price);
    const soldMessage = `/w *${accountName} ${message}`;
    await copy(soldMessage);
    setCopiedAction('sold');
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleHistory = () => {
    // Show history popover
    setHistoryPopoverOpen(true);
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

  const handleStartChat = async () => {
    if (!trade.userId || !authData?.user?._id) {
      console.error('Missing user ID for starting chat');
      return;
    }

    try {
      // Create conversation with both user IDs
      const participantIds = [authData.user._id, trade.userId];
      const conversation = await createConversation(participantIds);
      
      console.log('Conversation created:', conversation);

      // Toggle chat window and pass conversation object
      await emit('toggle-chat-window', { 
        conversationId: conversation._id,
        conversation: conversation 
      });
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  return (
    <>
    <Card
      className={cn(
          'relative w-full border-1 shadow-sm bg-neutral-800',
        trade.isIncoming ? 'border-green-500 dark:border-green-600' : 'border-red-500 dark:border-red-600'
      )}
    >
        <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-white"
                style={{ fontFamily: 'DiabloFont' }}>{trade.playerName}</span>
              <span className="text-xs text-neutral-400">{formatTimeAgo(trade.timestamp)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm mb-2">
              {trade.itemName && (
                <>
                  {trade.listingId ? (
                    <a
                      href={`https://www.projectdiablo2.com/market/listing/${trade.listingId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        openUrl(`https://www.projectdiablo2.com/market/listing/${trade.listingId}`);
                      }}
                      className="truncate text-blue-400 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      {trade.itemName}
                    </a>
                  ) : (
                    <span className="truncate text-white">{trade.itemName}</span>
                  )}
                  <ArrowLeftRight className="h-3 w-3 text-neutral-400 flex-shrink-0" />
                </>
              )}
              {trade.price && (
                <div className="flex items-center gap-1">
                  <span className="text-white">{trade.price}</span>
                  <Package className="h-3 w-3 text-neutral-400" />
                </div>
              )}
              {!trade.itemName && !trade.price && (
                <span className="text-neutral-300">{trade.message}</span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-wrap justify-between">
            <div className="flex items-center gap-1">
                {!trade.listingId && (
                <Tooltip>
                <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleStop}
                      className="h-7 w-7 cursor-pointer"
                    >
                    <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                  <p>Delete trade offer</p>
                  </TooltipContent>
                </Tooltip>
                )}

              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleViewProfile}
                    className="h-7 w-7 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View profile</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip open={copiedAction === 'whisper' ? true : undefined}>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleChat}
                    className="h-7 w-7 cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                  <p>{copiedAction === 'whisper' ? 'Copied to clipboard!' : 'Copy whisper command'}</p>
                  </TooltipContent>
                </Tooltip>

              {!trade.listingId && (
                <Tooltip open={copiedAction === 'sold' ? true : undefined}>
                  <TooltipTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSold}
                      className="h-7 w-7 cursor-pointer"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>{copiedAction === 'sold' ? 'Copied to clipboard!' : 'Item sold'}</p>
                    </TooltipContent>
                  </Tooltip>
              )}

              {!trade.listingId && (
                <Tooltip>
                  <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-pointer"
                    onClick={() => setHistoryPopoverOpen(true)}
                  >
                    <History className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>View history</p>
                  </TooltipContent>
                </Tooltip>
              )}
              </div>

              <div className="flex items-center justify-end gap-1">
                {trade.listingId && trade.userId && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartChat}
                        className="h-7 w-7 cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Start chat</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {trade.listingId && !trade.isIncoming && onRevoke && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRevoke}
                        className="h-7 w-7 cursor-pointer text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Revoke offer</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              
            {trade.isIncoming && (
                <div className="flex items-center gap-1">
                  {trade.listingId ? (
                    // Website offers: show accept button only if not accepted
                    !isAccepted && (
                      <Tooltip open={copiedAction === 'accept' ? true : undefined}>
                        <TooltipTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isProcessing}
                            onClick={handleAccept}
                            className="h-7 w-7 cursor-pointer text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copiedAction === 'accept' ? 'Offer accepted!' : 'Accept'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  ) : (
                    // Non-website offers: popover with game/password inputs
                  <Tooltip open={copiedAction === 'accept' ? true : undefined}>
                    <TooltipTrigger>
                      <div>
                        <Popover open={acceptPopoverOpen}
                          onOpenChange={setAcceptPopoverOpen}>
                          <PopoverTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 cursor-pointer text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <div className="flex gap-2">
                              <Input
                                value={gameName}
                                onChange={(e) => setGameName(e.target.value)}
                                placeholder="Game"
                                className="w-32 focus-visible:ring-0"
                              />
                              <Input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="w-32 focus-visible:ring-0"
                              />
                              <Button
                                onClick={handleAccept}
                                disabled={!gameName}
                                className="cursor-pointer"
                              >
                                Accept
                    </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>{copiedAction === 'accept' ? 'Copied to clipboard!' : 'Accept'}</p>
                  </TooltipContent>
                </Tooltip>
                  )}

                  {trade.listingId && isAccepted ? (
                    // Show unaccept button if offer is accepted
                    <Tooltip open={copiedAction === 'reject' ? true : undefined}>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleUnaccept}
                          disabled={isProcessing}
                          className="h-7 w-7 cursor-pointer text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 pt-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copiedAction === 'reject' ? 'Offer unaccepted!' : 'Unaccept'}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    // Show reject button if offer is not accepted (or non-website offer)
                  <Tooltip open={copiedAction === 'reject' ? true : undefined}>
                    <TooltipTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDecline}
                        disabled={isProcessing}
                        className="h-7 w-7 cursor-pointer text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 pt-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                        <p>{copiedAction === 'reject' ? (trade.listingId ? 'Offer rejected!' : 'Copied to clipboard!') : 'Reject'}</p>
                  </TooltipContent>
                </Tooltip>
                  )}
                </div>
              )}
          </div>
          </div>
          </div>

          {onRefresh && (
                <Tooltip>
                  <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRefresh(trade.id)}
                  className="h-7 w-7 flex-shrink-0 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                <p>Refresh</p>
                  </TooltipContent>
                </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>

    {historyPopoverOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50" 
          onClick={() => setHistoryPopoverOpen(false)}
        />
        {/* Centered Card */}
        <Card 
          ref={historyCardRef}
          className="relative z-50 w-96 max-h-[80vh] flex flex-col shadow-lg bg-neutral-800 border-neutral-700"
          onBlur={() => setHistoryPopoverOpen(false)}
          tabIndex={-1}
        >
          <CardContent className="p-4 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h4 className="font-medium text-sm text-white">Communication History</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setHistoryPopoverOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea>
              <div className="space-y-2 pr-4 max-h-[200px]">
                {trade.history && trade.history.length > 0 ? (
                  trade.history
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'rounded-md p-2 text-sm',
                          entry.isIncoming
                            ? 'bg-neutral-700/50 border-l-2 border-green-500'
                            : 'bg-neutral-700/30 border-l-2 border-blue-500'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white"
                            style={{ fontFamily: entry.isIncoming ? 'DiabloFont' : 'inherit' }}>
                            {entry.isIncoming ? trade.playerName : 'You'}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {formatTimeAgo(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-200 whitespace-pre-wrap break-words">
                          {entry.message}
                        </p>
                      </div>
                    ))
                ) : (
                  <div className="text-sm text-neutral-400 text-center py-4">
                    No history yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    )}
    </>
  );
};

