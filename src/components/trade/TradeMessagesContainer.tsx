import React, { useMemo } from 'react';
import { TradeMessage, TradeMessageData } from './TradeMessage';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradeMessages } from '@/hooks/useTradeMessages';
import { usePd2Website } from '@/hooks/pd2website/usePD2Website';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';

export const TradeMessagesContainer: React.FC = () => {
  const { trades, removeTrade } = useTradeMessages();
  const { incomingOffers, outgoingOffers, revokeOffer, acceptOffer, rejectOffer, unacceptOffer } = usePd2Website();

  const incomingWhispers = useMemo(() => {
    return trades.filter(t => t.isIncoming).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [trades]);

  const outgoingWhispers = useMemo(() => {
    return trades.filter(t => !t.isIncoming).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [trades]);

  const incomingWebsiteOffersSorted = useMemo(() => {
    return [...incomingOffers].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [incomingOffers]);

  const outgoingWebsiteOffersSorted = useMemo(() => {
    return [...outgoingOffers].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [outgoingOffers]);

  return (
    <TooltipProvider>
      <div className="w-full h-full flex flex-col bg-neutral-900 opacity-90 rounded-md overflow-hidden">
        <Tabs defaultValue="whispers"
          className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Drag Handle with Title and Tabs */}
          <div
            data-tauri-drag-region
            className="flex items-center gap-4 px-4 py-1 border-b border-neutral-700 bg-neutral-800 cursor-move flex-shrink-0"
          >
            <GripVertical className="h-4 w-4 text-neutral-400 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-white flex-shrink-0">Offers</h2>
            <TabsList className="flex-shrink-0">
              <TabsTrigger value="whispers">
                Whispers ({incomingWhispers.length + outgoingWhispers.length})
              </TabsTrigger>
              <TabsTrigger value="website">
                Website ({incomingWebsiteOffersSorted.length + outgoingWebsiteOffersSorted.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => getCurrentWebviewWindow().hide()}
              className="h-7 w-7 cursor-pointer flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Whispers Tab */}
          <TabsContent value="whispers"
            className="flex-1 m-0 min-h-0 overflow-hidden flex flex-col">
            <Tabs defaultValue="incoming"
              className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-shrink-0 px-4 pt-2">
                <TabsList>
                  <TabsTrigger value="incoming">
                    Incoming ({incomingWhispers.length})
                  </TabsTrigger>
                  <TabsTrigger value="outgoing">
                    Outgoing ({outgoingWhispers.length})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="incoming"
                className="flex-1 m-0 mt-2 min-h-0 overflow-hidden flex flex-col bg-neutral-900">
                <ScrollArea className="h-full px-4">
                  <div className="flex flex-col gap-2 pb-4">
                    {incomingWhispers.length === 0 ? (
                      <div className="text-center text-neutral-400 py-8">
                        No incoming whispers
                      </div>
                    ) : (
                      incomingWhispers.map((trade) => (
                        <TradeMessage key={trade.id}
                          trade={trade}
                          onClose={removeTrade} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="outgoing"
                className="flex-1 m-0 mt-2 min-h-0 overflow-hidden flex flex-col bg-neutral-900">
                <ScrollArea className="h-full px-4">
                  <div className="flex flex-col gap-2 pb-4">
                    {outgoingWhispers.length === 0 ? (
                      <div className="text-center text-neutral-400 py-8">
                        No outgoing whispers
                      </div>
                    ) : (
                      outgoingWhispers.map((trade) => (
                        <TradeMessage key={trade.id}
                          trade={trade}
                          onClose={removeTrade} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Website Offers Tab */}
          <TabsContent value="website"
            className="flex-1 m-0 min-h-0 overflow-hidden flex flex-col">
            <Tabs defaultValue="incoming"
              className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-shrink-0 px-4 pt-2">
                <TabsList>
                  <TabsTrigger value="incoming">
                    Incoming ({incomingWebsiteOffersSorted.length})
                  </TabsTrigger>
                  <TabsTrigger value="outgoing">
                    Outgoing ({outgoingWebsiteOffersSorted.length})
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="incoming"
                className="flex-1 m-0 min-h-0 overflow-hidden flex flex-col bg-neutral-900">
                <ScrollArea className="h-full px-4">
                  <div className="flex flex-col gap-2 pb-4">
                    {incomingWebsiteOffersSorted.length === 0 ? (
                      <div className="text-center text-neutral-400 py-8">
                        No incoming website offers
                      </div>
                    ) : (
                      incomingWebsiteOffersSorted.map((trade) => (
                        <TradeMessage 
                          key={trade.id} 
                          trade={trade} 
                          onClose={removeTrade}
                          onAccept={acceptOffer}
                          onReject={rejectOffer}
                          onUnaccept={unacceptOffer}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="outgoing"
                className="flex-1 m-0 min-h-0 overflow-hidden flex flex-col bg-neutral-900">
                <ScrollArea className="h-full px-4">
                  <div className="flex flex-col gap-2 pb-4">
                    {outgoingWebsiteOffersSorted.length === 0 ? (
                      <div className="text-center text-neutral-400 py-8">
                        No outgoing website offers
                      </div>
                    ) : (
                      outgoingWebsiteOffersSorted.map((trade) => (
                        <TradeMessage key={trade.id}
                          trade={trade}
                          onClose={removeTrade}
                          onRevoke={revokeOffer} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

