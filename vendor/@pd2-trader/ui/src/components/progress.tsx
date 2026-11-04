import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

/** Track + bar colours per `tone`: `default` primary, status tones for health/quota bars. */
const progressVariants = cva('relative h-2 w-full overflow-hidden rounded-full', {
  variants: {
    tone: {
      default: 'bg-primary/20 *:data-[slot=progress-indicator]:bg-primary',
      success: 'bg-success/20 *:data-[slot=progress-indicator]:bg-success',
      warning: 'bg-warning/20 *:data-[slot=progress-indicator]:bg-warning',
      danger: 'bg-destructive/20 *:data-[slot=progress-indicator]:bg-destructive',
    },
  },
  defaultVariants: { tone: 'default' },
});

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & VariantProps<typeof progressVariants>
>(function Progress({ className, value, tone, ...props }, ref) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone ?? 'default'}
      className={cn(progressVariants({ tone }), className)}
      ref={ref}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full transition-transform duration-(--dur-slow) ease-out animate-progress origin-left"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});

export { Progress, progressVariants };
