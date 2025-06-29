import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Search, Loader2, AlertCircle } from "lucide-react";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';

interface LoadingAndErrorStatesProps {
  isLoading: boolean;
  error: string | null;
  matchingItems: any[];
  item: PriceCheckItem;
  onRetry: () => void;
}

const LoadingAndErrorStates: React.FC<LoadingAndErrorStatesProps> = ({
  isLoading,
  error,
  matchingItems,
  item,
  onRetry
}) => {
  if (isLoading) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Searching for items...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={onRetry} className="w-full">
          <Search className="h-4 w-4 mr-2" />
          Retry Search
        </Button>
      </div>
    );
  }

  if (matchingItems.length === 0) {
    return (
      <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
        <div className="flex justify-between mb-2 items-center">
          <span style={{fontFamily: 'DiabloFont'}}>List Item</span>
          <Button className="h-6 w-6" variant='ghost' onClick={() => getCurrentWebviewWindow().hide()}>
            <X className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-gray-500 gap-2">
          <div className="flex items-center gap-2">
            <span>No items found matching "{item.name}"</span>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span>
                  <AlertCircle className="text-yellow-500 w-4 h-4 cursor-pointer" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs text-center">
                An item won't be found unless it is placed in your stash and you have made a new game.<br />
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LoadingAndErrorStates; 