import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'default';

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'size-3',
  sm: 'size-3.5',
  default: 'size-4',
};

interface SpinnerProps extends React.ComponentPropsWithoutRef<'svg'> {
  /** `xs` = size-3 (chips), `sm` = size-3.5 (inline with text-xs, xs buttons), `default` = size-4. */
  size?: SpinnerSize;
}

/**
 * Busy indicator for an in-button or inline pending state ("Listing…"). Never for content areas: those use
 * Skeleton / SkeletonRows. Announced as a status with the UiLabels `loading` label unless `aria-label` is given.
 */
const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(function Spinner(
  { className, size = 'default', ...props },
  ref,
) {
  const labels = useUiLabels();
  return (
    <Loader2
      data-slot="spinner"
      role="status"
      aria-label={labels.loading}
      className={cn('shrink-0 animate-spin', SIZE_CLASSES[size], className)}
      ref={ref}
      {...props}
    />
  );
});

export { Spinner };
export type { SpinnerProps, SpinnerSize };
