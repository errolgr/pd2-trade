import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

type Tone = 'info' | 'warning' | 'destructive';

const TONE_CLASSES: Record<Tone, { box: string; icon: string }> = {
  info: { box: 'border-info/30 bg-info/10', icon: 'bg-info/15 text-info' },
  warning: { box: 'border-warning/35 bg-warning/10', icon: 'bg-warning/15 text-warning' },
  destructive: { box: 'border-destructive/35 bg-destructive/10', icon: 'bg-destructive/15 text-destructive' },
};

/** Inline status strip (consent prompt, sync error...) that slides in. */
export function Banner({
  tone,
  icon,
  children,
  actions,
  className,
  role,
}: {
  tone: Tone;
  icon: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      role={role}
      className={cn('flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm', classes.box, className)}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md [&_svg]:size-4', classes.icon)}>
          {icon}
        </span>
        <span className="min-w-0">{children}</span>
      </span>
      {actions && <span className="flex shrink-0 items-center gap-2">{actions}</span>}
    </motion.div>
  );
}

/** Centered empty / blocked state: icon tile, title, optional description and action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center text-center',
        compact ? 'gap-2 py-4' : 'gap-3 rounded-xl border border-dashed border-border bg-card/40 px-6 py-8',
        className,
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20',
          compact ? 'size-9 [&_svg]:size-4' : 'size-12 [&_svg]:size-6',
        )}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <div className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">{description}</div>
        )}
      </div>
      {action}
    </motion.div>
  );
}
