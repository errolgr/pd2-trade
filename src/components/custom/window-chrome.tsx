import * as React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { scaleIn, useReducedMotionSafe } from '@/lib/motion';

interface WindowChromeProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Right-side controls rendered before the close button. */
  actions?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  titleClassName?: string;
  /** Render the title in the DiabloFont face. */
  diabloFont?: boolean;
  /** Marks the bar and title as Tauri drag regions. Default true. */
  dragRegion?: boolean;
  /** Show the grip affordance on the left. Default true when dragRegion. */
  showGrip?: boolean;
  closeLabel?: string;
}

function WindowChrome({
  title,
  icon,
  actions,
  onClose,
  className,
  titleClassName,
  diabloFont = false,
  dragRegion = true,
  showGrip,
  closeLabel = 'Close',
}: WindowChromeProps) {
  const drag = dragRegion ? { 'data-tauri-drag-region': true } : {};
  const grip = showGrip ?? dragRegion;

  return (
    <div
      {...drag}
      data-slot="window-chrome"
      className={cn(
        'flex h-10 shrink-0 select-none items-center gap-2 border-b border-border px-2.5 text-surface-foreground',
        dragRegion && 'cursor-grab active:cursor-grabbing',
        className,
      )}
    >
      {grip && (
        <GripVertical {...drag}
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground" />
      )}
      {icon && <span className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">{icon}</span>}
      <div
        {...drag}
        className={cn('min-w-0 flex-1 truncate text-sm font-semibold tracking-tight', titleClassName)}
        style={diabloFont ? { fontFamily: 'DiabloFont' } : undefined}
      >
        {title}
      </div>
      {actions && <div className="flex shrink-0 cursor-default items-center gap-1">{actions}</div>}
      {onClose && (
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="inline-flex size-7 shrink-0 cursor-default items-center justify-center rounded-md text-muted-foreground outline-none transition-[color,background-color,transform] duration-(--dur-fast) ease-out hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/60 motion-safe:active:scale-90"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

interface WindowPanelProps extends React.ComponentProps<'div'> {
  /** Fade/scale in on mount (respects reduced motion). Default false. */
  animate?: boolean;
}

function WindowPanel({ className, animate = false, children, ...props }: WindowPanelProps) {
  const reduce = useReducedMotionSafe();
  const classes = cn(
    'flex flex-col overflow-hidden rounded-lg border border-border bg-surface text-surface-foreground shadow-panel backdrop-blur-md',
    className,
  );

  if (animate && !reduce) {
    // HTML drag/animation handlers clash with framer's typed ones; the panel never uses them.
    const motionProps = props as unknown as React.ComponentProps<typeof motion.div>;
    return (
      <motion.div data-slot="window-panel"
        className={classes}
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        {...motionProps}>
        {children}
      </motion.div>
    );
  }
  return (
    <div data-slot="window-panel"
      className={classes}
      {...props}>
      {children}
    </div>
  );
}

export { WindowChrome, WindowPanel };
export type { WindowChromeProps, WindowPanelProps };
