import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { useUiLabels } from '../lib/labels';
import { buttonVariants } from './button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  const labels = useUiLabels();
  return (
    <nav
      role="navigation"
      aria-label={labels.pagination}
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="pagination-content"
    className={cn('flex flex-row items-center gap-1', className)}
    {...props} />;
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item"
    {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: 'default' | 'sm' | 'icon' | 'icon-sm';
} & React.ComponentProps<'a'>;

/** A page link styled as a Button: `ghost`, or `outline` for the current page (`aria-current="page"`). */
function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }), 'tabular-nums', className)}
      {...props}
    />
  );
}

function PaginationPrevious({ className, children, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const labels = useUiLabels();
  return (
    <PaginationLink
      aria-label={labels.previousPage}
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">{children ?? labels.previous}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, children, ...props }: React.ComponentProps<typeof PaginationLink>) {
  const labels = useUiLabels();
  return (
    <PaginationLink
      aria-label={labels.nextPage}
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5', className)}
      {...props}
    >
      <span className="hidden sm:block">{children ?? labels.next}</span>
      <ChevronRightIcon />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  const labels = useUiLabels();
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">{labels.morePages}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
