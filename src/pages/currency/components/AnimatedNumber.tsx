import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { EASE_OUT, useReducedMotionSafe } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
  /** Tween length in seconds. */
  duration?: number;
}

/**
 * Renders a number that tweens from its previous value whenever `value` changes (not on mount).
 * Reduced motion: jumps straight to the new value.
 */
export function AnimatedNumber({ value, format, className, duration = 0.6 }: AnimatedNumberProps) {
  const reduce = useReducedMotionSafe();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (reduce || from === value) return;
    const controls = animate(from, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => {
        fromRef.current = latest;
        setDisplay(latest);
      },
      onComplete: () => {
        fromRef.current = value;
      },
    });
    return () => controls.stop();
  }, [value, reduce, duration]);

  return <span className={cn('tabular-nums', className)}>{format(reduce ? value : display)}</span>;
}

/**
 * Briefly reports the direction of the last change of `value` ('up' | 'down'), for a highlight flash.
 * Returns null while idle and on mount.
 */
export function useChangeFlash(value: number | null | undefined, holdMs = 1200): 'up' | 'down' | null {
  const [previous, setPrevious] = useState(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  // Derive the direction while rendering (no effect round-trip); the timer below only clears it
  if (previous !== value) {
    setPrevious(value);
    if (previous !== null && previous !== undefined && value !== null && value !== undefined) {
      setFlash(value > previous ? 'up' : 'down');
    }
  }
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), holdMs);
    return () => window.clearTimeout(id);
  }, [flash, value, holdMs]);
  return flash;
}
