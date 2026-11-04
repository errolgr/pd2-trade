import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { useUiLabels } from '../lib/labels';
import { buttonVariants } from './button';

const Pagination = React.forwardRef<React.ElementRef<'nav'>, React.ComponentPropsWithoutRef<'nav'>>(function Pagination(
  { className, ...props },
  ref,
) {
  const labels = useUiLabels();
  return (
    <nav
      role="navigation"
      aria-label={labels.pagination}
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      ref={ref}
      {...props}
    />
  );
});

const PaginationContent = React.forwardRef<React.ElementRef<'ul'>, React.ComponentPropsWithoutRef<'ul'>>(
  function PaginationContent({ className, ...props }, ref) {
    return (
      <ul
        data-slot="pagination-content"
        className={cn('flex flex-row items-center gap-1', className)}
        ref={ref}
        {...props}
      />
    );
  },
);

const PaginationItem = React.forwardRef<React.ElementRef<'li'>, React.ComponentPropsWithoutRef<'li'>>(
  function PaginationItem({ ...props }, ref) {
    return <li data-slot="pagination-item"
      ref={ref}
      {...props} />;
  },
);

type PaginationLinkProps = {
  isActive?: boolean;
  size?: 'default' | 'sm' | 'icon' | 'icon-sm';
} & React.ComponentProps<'a'>;

/** A page link styled as a Button: `ghost`, or `outline` for the current page (`aria-current="page"`). */
const PaginationLink = React.forwardRef<React.ElementRef<'a'>, PaginationLinkProps>(function PaginationLink(
  { className, isActive, size = 'icon', ...props },
  ref,
) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }), 'tabular-nums', className)}
      ref={ref}
      {...props}
    />
  );
});

const PaginationPrevious = React.forwardRef<
  React.ElementRef<typeof PaginationLink>,
  React.ComponentPropsWithoutRef<typeof PaginationLink>
>(function PaginationPrevious({ className, children, ...props }, ref) {
  const labels = useUiLabels();
  return (
    <PaginationLink
      aria-label={labels.previousPage}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      ref={ref}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{children ?? labels.previous}</span>
    </PaginationLink>
  );
});

const PaginationNext = React.forwardRef<
  React.ElementRef<typeof PaginationLink>,
  React.ComponentPropsWithoutRef<typeof PaginationLink>
>(function PaginationNext({ className, children, ...props }, ref) {
  const labels = useUiLabels();
  return (
    <PaginationLink
      aria-label={labels.nextPage}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      ref={ref}
      {...props}
    >
      <span className="hidden sm:block">{children ?? labels.next}</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
});

const PaginationEllipsis = React.forwardRef<React.ElementRef<'span'>, React.ComponentPropsWithoutRef<'span'>>(
  function PaginationEllipsis({ className, ...props }, ref) {
    const labels = useUiLabels();
    return (
      <span
        aria-hidden
        data-slot="pagination-ellipsis"
        className={cn('flex size-9 items-center justify-center', className)}
        ref={ref}
        {...props}
      >
        <MoreHorizontalIcon className="size-4" />
        <span className="sr-only">{labels.morePages}</span>
      </span>
    );
  },
);

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
