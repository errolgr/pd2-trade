import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '../lib/utils';

/** Round user/character picture with a text fallback. Default `size-8`; resize with `className` (`size-6`, `size-10`). */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      ref={ref}
      {...props}
    />
  );
});

/** The picture; hidden until it has loaded, so the fallback shows while loading and on error. */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      ref={ref}
      {...props}
    />
  );
});

/** Initials or an icon shown when there is no image (or it failed to load). */
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(function AvatarFallback({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full select-none items-center justify-center rounded-full bg-muted text-2xs font-medium text-muted-foreground [&_svg]:size-1/2',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

export { Avatar, AvatarImage, AvatarFallback };
