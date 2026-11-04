import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@pd2-trader/ui';
import { useState, type MouseEvent } from 'react';

export const meta = {
  title: 'Previous / next only',
  description: 'Dense panel footer: previous/next links around a page count. Disable an end with `aria-disabled` and `pointer-events-none`.',
  order: 1,
};

const LAST = 8;

export default function PaginationCompactExample() {
  const [page, setPage] = useState(1);
  const go = (p: number) => (e: MouseEvent) => {
    e.preventDefault();
    setPage(Math.min(LAST, Math.max(1, p)));
  };
  return (
    <div className="w-sidebar rounded-lg border bg-surface p-2">
      <Pagination>
        <PaginationContent className="w-full justify-between">
          <PaginationItem>
            <PaginationPrevious href="#"
              aria-disabled={page === 1}
              className={page === 1 ? 'pointer-events-none opacity-50' : undefined}
              onClick={go(page - 1)} />
          </PaginationItem>
          <PaginationItem className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {LAST}
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#"
              aria-disabled={page === LAST}
              className={page === LAST ? 'pointer-events-none opacity-50' : undefined}
              onClick={go(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
