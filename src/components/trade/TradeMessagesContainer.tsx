import React, { useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { TradeMessage } from './TradeMessage';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, Inbox, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, fadeInUp } from '@/lib/motion';
import { useTradeMessages } from '@/hooks/useTradeMessages';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';

export const TradeMessagesContainer: React.FC = () => {
  const { trades, removeTrade } = useTradeMessages();
  const [showHiddenOffers, setShowHiddenOffers] = useState(false);
  const {
    incomingOffers,
    outgoingOffers,
    hiddenOutgoingOffers,
    revokeOffer,
    acceptOffer,
    rejectOffer,
    unacceptOffer,
    deleteOutgoingOffer,
    restoreOutgoingOffer,
    deleteMarketListing,
    refresh,
  } = usePd2Website();

  const incomingWhispers = useMemo(() => {
    return trades.filter((t) => t.isIncoming).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [trades]);

  const outgoingWhispers = useMemo(() => {
    return trades.filter((t) => !t.isIncoming).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [trades]);

  const incomingWebsiteOffersSorted = useMemo(() => {
    return [...incomingOffers].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [incomingOffers]);

  const outgoingWebsiteOffersSorted = useMemo(() => {
    return [...outgoingOffers].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [outgoingOffers]);

  const hiddenOutgoingWebsiteOffersSorted = useMemo(() => {
    return [...hiddenOutgoingOffers].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [hiddenOutgoingOffers]);

  const whispersTotal = incomingWhispers.length + outgoingWhispers.length;
  const websiteTotal = incomingWebsiteOffersSorted.length + outgoingWebsiteOffersSorted.length;

  return (
    <TooltipProvider delayDuration={250}>
      <MotionConfig reducedMotion="user">
        <WindowPanel animate
          className="h-full w-full">
          <Tabs defaultValue="whispers"
            className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
            {/* Drag Handle with Title and Tabs */}
            <WindowChrome
              title={
                <span className="flex items-center gap-3">
                  <span data-tauri-drag-region>Offers</span>
                  <TabsList className="h-8">
                    <TabsTrigger value="whispers"
                      className="gap-1.5 px-2.5 text-xs">
                      Whispers <CountPill count={whispersTotal} />
                    </TabsTrigger>
                    <TabsTrigger value="website"
                      className="gap-1.5 px-2.5 text-xs">
                      Website <CountPill count={websiteTotal} />
                    </TabsTrigger>
                  </TabsList>
                </span>
              }
              titleClassName="overflow-visible"
              onClose={() => getCurrentWebviewWindow().hide()}
              closeLabel="Hide offers"
            />

            {/* Whispers Tab */}
            <TabsContent value="whispers"
              className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
              <Tabs defaultValue="incoming"
                className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
                <SubTabs incoming={incomingWhispers.length}
                  outgoing={outgoingWhispers.length} />

                <TabsContent value="incoming"
                  className="m-0 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
                  <OfferList
                    empty={
                      <EmptyOffers
                        icon={<Inbox />}
                        title="No incoming whispers"
                        hint="Trade whispers from the game show up here."
                      />
                    }
                  >
                    {incomingWhispers.map((trade) => (
                      <OfferItem key={trade.id}>
                        <TradeMessage trade={trade}
                          onClose={removeTrade} />
                      </OfferItem>
                    ))}
                  </OfferList>
                </TabsContent>

                <TabsContent value="outgoing"
                  className="m-0 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
                  <OfferList
                    empty={
                      <EmptyOffers
                        icon={<Send />}
                        title="No outgoing whispers"
                        hint="Whispers you send to sellers show up here."
                      />
                    }
                  >
                    {outgoingWhispers.map((trade) => (
                      <OfferItem key={trade.id}>
                        <TradeMessage trade={trade}
                          onClose={removeTrade} />
                      </OfferItem>
                    ))}
                  </OfferList>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Website Offers Tab */}
            <TabsContent value="website"
              className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
              <Tabs defaultValue="incoming"
                className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
                <SubTabs incoming={incomingWebsiteOffersSorted.length}
                  outgoing={outgoingWebsiteOffersSorted.length} />

                <TabsContent value="incoming"
                  className="m-0 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
                  <OfferList
                    empty={
                      <EmptyOffers
                        icon={<Inbox />}
                        title="No incoming website offers"
                        hint="Offers on your projectdiablo2.com listings show up here."
                      />
                    }
                  >
                    {incomingWebsiteOffersSorted.map((trade) => (
                      <OfferItem key={trade.id}>
                        <TradeMessage
                          trade={trade}
                          onClose={removeTrade}
                          onAccept={acceptOffer}
                          onReject={rejectOffer}
                          onUnaccept={unacceptOffer}
                          onDelete={async (listingId: string) => {
                            await deleteMarketListing(listingId);
                            // Refresh offers after deletion
                            refresh();
                          }}
                        />
                      </OfferItem>
                    ))}
                  </OfferList>
                </TabsContent>

                <TabsContent value="outgoing"
                  className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex flex-shrink-0 items-center justify-between px-4 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHiddenOffers(!showHiddenOffers)}
                      aria-pressed={showHiddenOffers}
                      className={cn('h-8 text-xs text-muted-foreground', showHiddenOffers && 'bg-accent text-accent-foreground')}
                    >
                      {showHiddenOffers ? (
                        <>
                          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                          Hide Hidden Offers ({hiddenOutgoingWebsiteOffersSorted.length})
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Show Hidden Offers ({hiddenOutgoingWebsiteOffersSorted.length})
                        </>
                      )}
                    </Button>
                  </div>
                  <OfferList
                    empty={
                      <EmptyOffers
                        icon={<Send />}
                        title="No outgoing website offers"
                        hint={
                          hiddenOutgoingWebsiteOffersSorted.length > 0 && !showHiddenOffers
                            ? `${hiddenOutgoingWebsiteOffersSorted.length} hidden offer(s) not shown.`
                            : 'Offers you make on the website show up here.'
                        }
                      />
                    }
                  >
                    {outgoingWebsiteOffersSorted.map((trade) => (
                      <OfferItem key={trade.id}>
                        <TradeMessage
                          trade={trade}
                          onClose={removeTrade}
                          onRevoke={revokeOffer}
                          onDeleteOutgoing={deleteOutgoingOffer}
                        />
                      </OfferItem>
                    ))}
                    {showHiddenOffers &&
                      hiddenOutgoingWebsiteOffersSorted.map((trade) => (
                        <OfferItem key={trade.id}>
                          <TradeMessage
                            trade={trade}
                            onClose={removeTrade}
                            onRevoke={revokeOffer}
                            onDeleteOutgoing={deleteOutgoingOffer}
                            onRestoreOutgoing={restoreOutgoingOffer}
                            isHidden
                          />
                        </OfferItem>
                      ))}
                  </OfferList>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </WindowPanel>
      </MotionConfig>
    </TooltipProvider>
  );
};

const CountPill: React.FC<{ count: number }> = ({ count }) => (
  <span
    className={cn(
      'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums transition-colors duration-(--dur-fast)',
      count > 0 ? 'bg-primary/15 text-foreground' : 'bg-muted text-muted-foreground',
    )}
  >
    {count}
  </span>
);

const SubTabs: React.FC<{ incoming: number; outgoing: number }> = ({ incoming, outgoing }) => (
  <div className="flex-shrink-0 px-4 pt-2.5">
    <TabsList className="h-8">
      <TabsTrigger value="incoming"
        className="gap-1.5 px-2.5 text-xs">
        <ArrowDownLeft className="size-3.5 text-success" />
        Incoming <CountPill count={incoming} />
      </TabsTrigger>
      <TabsTrigger value="outgoing"
        className="gap-1.5 px-2.5 text-xs">
        <ArrowUpRight className="size-3.5 text-destructive" />
        Outgoing <CountPill count={outgoing} />
      </TabsTrigger>
    </TabsList>
  </div>
);

/** Scrollable offer list; shows `empty` when it has no children. Items animate in/out. */
const OfferList: React.FC<{ empty: React.ReactNode; children: React.ReactNode }> = ({ empty, children }) => {
  const hasItems = React.Children.toArray(children).some(Boolean);
  return (
    <ScrollArea className="h-full px-4">
      <div className="flex flex-col gap-2 pb-4">
        <AnimatePresence initial={false}>
          {hasItems ? children : <motion.div key="empty"
            variants={fadeIn}
            initial="hidden"
            animate="visible">{empty}</motion.div>}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
};

const OfferItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div layout="position"
    variants={fadeInUp}
    initial="hidden"
    animate="visible"
    exit="exit">
    {children}
  </motion.div>
);

const EmptyOffers: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="flex flex-col items-center gap-2 py-10 text-center">
    <span className="mb-1 flex size-10 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground [&_svg]:size-5">
      {icon}
    </span>
    <p className="text-sm font-medium text-foreground/90">{title}</p>
    <p className="max-w-60 text-xs text-muted-foreground">{hint}</p>
  </div>
);
