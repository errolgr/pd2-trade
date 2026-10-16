import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Search, Loader2, AlertTriangle, CircleAlert } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { WindowChrome, WindowPanel } from '@/components/custom/window-chrome';
import { getCurrentWebviewWindow } from '@/lib/browser-webview';
import { fadeIn, fadeInUp } from '@/lib/motion';

interface LoadingAndErrorStatesProps {
  isLoading: boolean;
  error: string | null;
  matchingItems: unknown[];
  onRetry: () => void;
  embedded?: boolean;
  isAccountMismatch?: boolean;
}

const LoadingAndErrorStates: React.FC<LoadingAndErrorStatesProps> = ({
  isLoading,
  error,
  matchingItems,
  onRetry,
  embedded = false,
  isAccountMismatch = false,
}) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div key="loading"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
          aria-busy>
          <div className="flex items-center gap-2 text-sm text-muted-foreground"
            role="status">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span>Searching for items...</span>
          </div>
          {[0, 1].map((i) => (
            <div key={i}
              className="rounded-lg border border-border bg-card/40 p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="mt-3 space-y-1.5 pl-6">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ))}
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div key="error"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="w-full">
          {isAccountMismatch ? (
            <Alert variant="destructive"
              className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Wrong account detected</AlertTitle>
              <AlertDescription className="text-xs mt-1 space-y-2">
                <p>
                  You&apos;re likely signed in with your in-game account instead of your web account. You&apos;ll need
                  to log out and sign in again with the correct account.
                </p>
                <p>
                  <strong>Important:</strong> Before logging in again, clear your browser cookies for{' '}
                  <span className="rounded bg-destructive/10 px-1 font-mono">api.projectdiablo2.com</span> — otherwise
                  you&apos;ll be logged into the same session automatically.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="mb-4 flex flex-col items-center gap-2 py-4 text-center"
              role="alert">
              <span className="flex size-10 items-center justify-center rounded-full bg-destructive/12 text-destructive">
                <CircleAlert className="size-5" />
              </span>
              <div className="text-sm font-semibold">Something went wrong</div>
              <div className="max-w-sm text-xs text-destructive">{error}</div>
            </div>
          )}
          <Button onClick={onRetry}
            className="w-full">
            <Search className="h-4 w-4" />
            Retry Search
          </Button>
        </motion.div>
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
    <WindowPanel animate
      className="w-screen">
      <WindowChrome title="List Item"
        diabloFont
        onClose={() => getCurrentWebviewWindow().hide()} />
      <div className="p-4">{content}</div>
    </WindowPanel>
  );
};

export default LoadingAndErrorStates;
