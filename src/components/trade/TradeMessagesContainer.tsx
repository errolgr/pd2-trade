import React, { useState, useEffect } from 'react';
import { TradeMessage, TradeMessageData } from './TradeMessage';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';

interface TradeMessagesContainerProps {
  trades: TradeMessageData[];
  onClose: (id: string) => void;
  maxVisible?: number;
}

export const TradeMessagesContainer: React.FC<TradeMessagesContainerProps> = ({
  trades,
  onClose,
  maxVisible = 3,
}) => {
  const [visibleTrades, setVisibleTrades] = useState<TradeMessageData[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const sorted = [...trades].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const visible = sorted.slice(0, maxVisible);
    const hidden = sorted.length - visible.length;

    setVisibleTrades(visible);
    setHiddenCount(hidden);
  }, [trades, maxVisible]);

  if (trades.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 right-4 left-4 top-4 flex flex-col gap-3 items-end justify-end overflow-hidden pointer-events-none">
        <div className="flex flex-col gap-3 items-end pointer-events-auto">
          {visibleTrades.map((trade) => (
            <TradeMessage key={trade.id} trade={trade} onClose={onClose} />
          ))}
          {hiddenCount > 0 && (
            <Card className="w-full max-w-md border-2 border-teal-600 dark:border-teal-500 shadow-lg">
              <CardContent className="p-4">
                <div className="text-center text-sm font-medium">
                  +{hiddenCount} More {hiddenCount === 1 ? 'Message' : 'Messages'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

