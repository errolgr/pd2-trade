import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '../lib/utils';

type ThumbProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Thumb>;

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    /**
     * Props for each thumb (one per value: `value={[from, to]}` renders a range slider with two thumbs). A function
     * receives the thumb index, e.g. `(i) => ({ 'aria-label': i ? 'To' : 'From' })`. Put `aria-label` /
     * `aria-valuetext` here, not on the root: the thumb is the focusable slider.
     */
    thumbProps?: ThumbProps | ((index: number) => ThumbProps);
  }
>(({ className, thumbProps, ...props }, ref) => {
  const count = (props.value ?? props.defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => {
        const { className: thumbClassName, ...rest } =
          (typeof thumbProps === 'function' ? thumbProps(i) : thumbProps) ?? {};
        return (
          <SliderPrimitive.Thumb
            key={i}
            className={cn(
              'block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background transition-[box-shadow,transform] duration-(--dur-fast) ease-spring cursor-grab active:cursor-grabbing hover:shadow-glow motion-safe:hover:scale-110 motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50',
              thumbClassName,
            )}
            {...rest}
          />
        );
      })}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
