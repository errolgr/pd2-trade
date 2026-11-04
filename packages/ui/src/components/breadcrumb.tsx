import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

import { useUiLabels } from '../lib/labels';
import { cn } from '../lib/utils';

const Breadcrumb = React.forwardRef<React.ElementRef<'nav'>, React.ComponentPropsWithoutRef<'nav'>>(function Breadcrumb(
  { ...props },
  ref,
) {
  return <nav aria-label="breadcrumb"
    data-slot="breadcrumb"
    ref={ref}
    {...props} />;
});

const BreadcrumbList = React.forwardRef<React.ElementRef<'ol'>, React.ComponentPropsWithoutRef<'ol'>>(
  function BreadcrumbList({ className, ...props }, ref) {
    return (
      <ol
        data-slot="breadcrumb-list"
        className={cn(
          'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

const BreadcrumbItem = React.forwardRef<React.ElementRef<'li'>, React.ComponentPropsWithoutRef<'li'>>(
  function BreadcrumbItem({ className, ...props }, ref) {
    return (
      <li
        data-slot="breadcrumb-item"
        className={cn('inline-flex items-center gap-1.5', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'> & {
    asChild?: boolean;
  }
>(function BreadcrumbLink({ asChild, className, ...props }, ref) {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        'hover:text-foreground rounded-sm outline-none transition-colors duration-(--dur-fast) focus-visible:ring-2 focus-visible:ring-ring/60',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

const BreadcrumbPage = React.forwardRef<React.ElementRef<'span'>, React.ComponentPropsWithoutRef<'span'>>(
  function BreadcrumbPage({ className, ...props }, ref) {
    return (
      <span
        data-slot="breadcrumb-page"
        role="link"
        aria-disabled="true"
        aria-current="page"
        className={cn('text-foreground font-normal', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const BreadcrumbSeparator = React.forwardRef<React.ElementRef<'li'>, React.ComponentPropsWithoutRef<'li'>>(
  function BreadcrumbSeparator({ children, className, ...props }, ref) {
    return (
      <li
        data-slot="breadcrumb-separator"
        role="presentation"
        aria-hidden="true"
        className={cn('[&>svg]:size-3.5', className)}
        ref={ref}
        {...props}
      >
        {children ?? <ChevronRight />}
      </li>
    );
  },
);

const BreadcrumbEllipsis = React.forwardRef<React.ElementRef<'span'>, React.ComponentPropsWithoutRef<'span'>>(
  function BreadcrumbEllipsis({ className, ...props }, ref) {
    const labels = useUiLabels();
    return (
      <span
        data-slot="breadcrumb-ellipsis"
        role="presentation"
        aria-hidden="true"
        className={cn('flex size-9 items-center justify-center', className)}
        ref={ref}
        {...props}
      >
        <MoreHorizontal className="size-4" />
        <span className="sr-only">{labels.more}</span>
      </span>
    );
  },
);

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
