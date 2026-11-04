import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { TRACKING, TYPE_SCALE, WIDTHS } from '../tokens/scales';

/**
 * tailwind-merge taught the design scale: without this it reads `text-2xs` as a text color and drops it when a
 * `text-muted-foreground` follows (and the reverse), and treats `w-control` / `tracking-caps` as unknown.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: Object.keys(TYPE_SCALE),
      tracking: Object.keys(TRACKING),
      container: Object.keys(WIDTHS),
      shadow: ['panel', 'glow'],
    },
  },
});

/** Joins class names (clsx) and resolves Tailwind conflicts, last one wins (tailwind-merge). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
