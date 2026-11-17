import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DUR, EASE_OUT } from '@/lib/motion';
import { useTranslation } from '@/i18n';

/**
 * The results column's frame: the status strip (what was found on the left, the toolbar on the right, a thin
 * indeterminate bar while a refetch runs over the shown results), an optional banner under it, then the results
 * (dimmed while refetching).
 */
export function ResultsFrame({
  status,
  toolbar,
  refetching,
  banner,
  children,
}: {
  status: React.ReactNode;
  toolbar: React.ReactNode;
  refetching: boolean;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('market');
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex h-8 shrink-0 items-center gap-2 border-b border-border/60 bg-muted/20 px-2.5 text-[11px] text-muted-foreground">
        {status}
        <span className="ml-auto" />
        {toolbar}
        <AnimatePresence>
          {refetching && (
            <motion.div
              key="refetch"
              role="progressbar"
              aria-label={t('results.refreshing')}
              className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast }}
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-primary/70"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 1.1, ease: EASE_OUT, repeat: Infinity }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {banner}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col transition-opacity duration-(--dur-med)',
          refetching && 'opacity-70',
        )}
      >
        {children}
      </div>
    </div>
  );
}
