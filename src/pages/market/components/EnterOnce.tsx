import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DUR, EASE_OUT } from '@/lib/motion';

/** Rows of a fresh result set that rise in (with a short stagger); the rest just appear. */
const INTRO_ROWS = 8;
const INTRO_STAGGER_S = 0.025;
const RISE_PX = 6;

type EnterMode = { delay: number; rise: boolean } | null;

/**
 * Which result rows animate on their first mount, for one result set. Virtualized rows mount and unmount while
 * scrolling: a row animates at most once per result set, and only if it belongs to the intro (first visible
 * rows of a new set: fade + rise, staggered) or to a page appended later (infinite load: fade only).
 */
export interface EnterTracker {
  key: unknown;
  /** Distinct per result set: part of the row keys, so rows of a new set mount (and enter) afresh. */
  generation: number;
  mode: (id: string, index: number) => EnterMode;
  markSeen: (id: string) => void;
}

let generations = 0;

function createTracker(key: unknown, ids: readonly string[]): EnterTracker {
  const intro = new Map(ids.slice(0, INTRO_ROWS).map((id, i) => [id, i]));
  const base = ids.length;
  const seen = new Set<string>();
  return {
    key,
    generation: ++generations,
    mode: (id, index) => {
      if (seen.has(id)) return null;
      const introIndex = intro.get(id);
      if (introIndex !== undefined) return { delay: introIndex * INTRO_STAGGER_S, rise: true };
      return index >= base ? { delay: 0, rise: false } : null;
    },
    markSeen: (id) => {
      seen.add(id);
    },
  };
}

/**
 * A tracker per result set: `resultKey` changes when a new set replaces the rows (a new search, a reload),
 * not when a page is appended. Lives with the page so switching Rows/Cards doesn't replay the intro.
 */
export function useEnterTracker(resultKey: unknown, ids: readonly string[]): EnterTracker {
  const [tracker, setTracker] = useState(() => createTracker(resultKey, ids));
  if (tracker.key !== resultKey) {
    // Adjusted during render: the rows of the new set are the ones on screen now
    const next = createTracker(resultKey, ids);
    setTracker(next);
    return next;
  }
  return tracker;
}

/** Wraps a result row/card: plays its entrance once if the tracker says so (transform/opacity only). */
export function EnterOnce({
  tracker,
  id,
  index,
  className,
  children,
}: {
  tracker: EnterTracker;
  id: string;
  index: number;
  className?: string;
  children: React.ReactNode;
}) {
  // Decided on mount: a remount while scrolling back finds the row already seen
  const [mode] = useState(() => tracker.mode(id, index));
  useEffect(() => tracker.markSeen(id), [tracker, id]);
  if (!mode) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: mode.rise ? RISE_PX : 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.med, ease: EASE_OUT, delay: mode.delay }}
    >
      {children}
    </motion.div>
  );
}
