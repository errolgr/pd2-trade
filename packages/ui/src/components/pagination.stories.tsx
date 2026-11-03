import type { Story, StoryDefault } from '@ladle/react';
import { useState, type MouseEvent } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@pd2-trader/ui';

export default { title: 'Primitives / Pagination' } satisfies StoryDefault;

const LAST = 12;

export const Pages: Story = () => {
  const [page, setPage] = useState(3);
  const go = (p: number) => (e: MouseEvent) => {
    e.preventDefault();
    setPage(Math.min(LAST, Math.max(1, p)));
  };
  const nearby = [page - 1, page, page + 1].filter((p) => p > 1 && p < LAST);
  return (
    <div className="w-fit rounded-lg border bg-surface p-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#"
              onClick={go(page - 1)} />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#"
              isActive={page === 1}
              onClick={go(1)}>
              1
            </PaginationLink>
          </PaginationItem>
          {nearby[0] > 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          {nearby.map((p) => (
            <PaginationItem key={p}>
              <PaginationLink href="#"
                isActive={p === page}
                onClick={go(p)}>
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          {nearby[nearby.length - 1] < LAST - 1 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationLink href="#"
              isActive={page === LAST}
              onClick={go(LAST)}>
              {LAST}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#"
              onClick={go(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
