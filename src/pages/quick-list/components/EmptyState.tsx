import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tone?: 'muted' | 'warning' | 'primary';
}

const toneClass = {
  muted: 'bg-muted text-muted-foreground ring-border',
  warning: 'bg-warning/12 text-warning ring-warning/25',
  primary: 'bg-primary/12 text-primary ring-primary/25',
} as const;

/** Centered icon + title + description block for empty, idle and informational states. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, children, className, tone = 'muted' }) => (
  <motion.div
    variants={fadeInUp}
    initial="hidden"
    animate="visible"
    className={cn('flex flex-col items-center justify-center gap-3 p-8 text-center', className)}
  >
    <span
      className={cn('flex size-12 items-center justify-center rounded-full ring-1 [&_svg]:size-6', toneClass[tone])}
    >
      {icon}
    </span>
    <div className="space-y-1.5">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {children && <div className="mx-auto max-w-[280px] text-sm leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  </motion.div>
);

export default EmptyState;
