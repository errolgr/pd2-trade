import * as React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

/** Keeps its child at a fixed width/height ratio (`ratio`, e.g. `16 / 9`); the child fills it (`size-full object-cover`). */
const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root>
>(function AspectRatio(props, ref) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio"
    ref={ref}
    {...props} />;
});

export { AspectRatio };
