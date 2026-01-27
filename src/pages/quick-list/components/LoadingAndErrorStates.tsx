import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Search, Loader2, GripVertical } from 'lucide-react';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';

interface LoadingAndErrorStatesProps {
  isLoading: boolean;
  error: string | null;
  matchingItems: any[];
  onRetry: () => void;
  embedded?: boolean;
}

const LoadingAndErrorStates: React.FC<LoadingAndErrorStatesProps> = ({
  isLoading,
  error,
  matchingItems,
  onRetry,
  embedded = false,
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Searching for items...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full">
          <div className="text-red-500 mb-4 text-center">{error}</div>
          <Button onClick={onRetry}
            className="w-full">
            <Search className="h-4 w-4 mr-2" />
            Retry Search
          </Button>
        </div>
      );
    }

    return null;
  };

  const content = renderContent();

  if (!content && matchingItems.length === 0) {
    return null; // Let parent handle empty state
  }

  if (embedded) {
    return content;
  }

  return (
    <div className="inline-block p-4 border rounded-lg bg-background shadow w-screen">
      <div className="flex justify-between mb-2 items-center">
        <div className="flex items-center gap-1">
          <GripVertical
            data-tauri-drag-region
            className="h-5 w-5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          />
          <span style={{ fontFamily: 'DiabloFont' }}
            className="mt-1">
            List Item
          </span>
        </div>
        <Button className="h-6 w-6"
          variant="ghost"
          onClick={() => getCurrentWebviewWindow().hide()}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {content}
    </div>
  );
};

export default LoadingAndErrorStates;
