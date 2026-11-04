import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, cn } from '@pd2-trader/ui';
import { useTranslation } from '@/i18n';
import type { Screenshot } from '../../marketplace/api';

/** Next slide index for a key, or null when the key does not navigate (wraps around at both ends). */
export function slideForKey(key: string, index: number, count: number): number | null {
  if (count < 2) return null;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}

/**
 * Listing screenshots: one slide with its caption, previous/next buttons and thumbnails. Arrow keys / Home / End
 * move while the gallery has focus; clicking it takes the keyboard from the game (`data-keep-keyboard`).
 * DS candidate: carousel.
 */
export function ScreenshotGallery({ screenshots, name }: { screenshots: readonly Screenshot[]; name: string }) {
  const { t } = useTranslation('plugins');
  const [index, setIndex] = useState(0);
  if (screenshots.length === 0) return null;
  const current = Math.min(index, screenshots.length - 1);
  const shot = screenshots[current];
  const many = screenshots.length > 1;
  const go = (next: number) => setIndex((next + screenshots.length) % screenshots.length);

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label={t('marketplace.gallery.label', { name })}
      tabIndex={0}
      data-keep-keyboard
      onKeyDown={(e) => {
        const next = slideForKey(e.key, current, screenshots.length);
        if (next === null) return;
        e.preventDefault();
        setIndex(next);
      }}
      className="flex flex-col gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <figure
        role="group"
        aria-roledescription="slide"
        aria-label={t('marketplace.gallery.slide', { index: current + 1, total: screenshots.length })}
        className="relative flex flex-col gap-1"
      >
        <div className="relative overflow-hidden rounded-md border border-border bg-muted">
          <img
            src={shot.url}
            alt={shot.caption ?? t('marketplace.gallery.alt', { name, index: current + 1 })}
            width={shot.width}
            height={shot.height}
            className="h-64 w-full object-contain"
          />
          {many && (
            <>
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute top-1/2 left-1.5 -translate-y-1/2 opacity-90"
                aria-label={t('marketplace.gallery.previous')}
                onClick={() => go(current - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                className="absolute top-1/2 right-1.5 -translate-y-1/2 opacity-90"
                aria-label={t('marketplace.gallery.next')}
                onClick={() => go(current + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          )}
        </div>
        <figcaption className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
          <span className="truncate">{shot.caption}</span>
          {many && (
            <span className="shrink-0 tabular-nums"
              aria-hidden>
              {current + 1} / {screenshots.length}
            </span>
          )}
        </figcaption>
      </figure>
      {many && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {screenshots.map((s, i) => (
            <Button
              key={s.file}
              variant="ghost"
              size="inline"
              aria-label={t('marketplace.gallery.goTo', { index: i + 1 })}
              aria-current={i === current ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                'h-10 w-16 shrink-0 overflow-hidden rounded-sm border p-0',
                i === current ? 'border-ring shadow-glow' : 'border-border opacity-70 hover:opacity-100',
              )}
            >
              <img src={s.url}
                alt=""
                className="size-full object-cover" />
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}
