import { useReducedMotion, type Transition, type Variants } from 'framer-motion';
import { DURATION_MS, EASING } from '@pd2-trader/ui/tokens';

/**
 * Shared framer-motion presets built from the motion scale in @pd2-trader/ui/tokens (the same values back the
 * CSS tokens --ease-out, --ease-spring, --dur-fast/med/slow).
 *
 * Reduced motion: wrap trees in `<MotionConfig reducedMotion="user">` or gate transforms
 * with `useReducedMotionSafe()`; the global CSS rule does not affect JS-driven animations.
 */

export const EASE_OUT = EASING.out;
export const EASE_SPRING = EASING.spring;

/** Seconds, as framer-motion expects. */
export const DUR = {
  fast: DURATION_MS.fast / 1000,
  med: DURATION_MS.med / 1000,
  slow: DURATION_MS.slow / 1000,
} as const;

export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 };
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 28, mass: 0.9 };

const easeMed: Transition = { duration: DUR.med, ease: EASE_OUT };
const easeFast: Transition = { duration: DUR.fast, ease: EASE_OUT };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeMed },
  exit: { opacity: 0, transition: easeFast },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: easeMed },
  exit: { opacity: 0, y: 4, transition: easeFast },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: easeMed },
  exit: { opacity: 0, scale: 0.98, transition: easeFast },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
  exit: { opacity: 0, x: 16, transition: easeFast },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE_OUT } },
  exit: { opacity: 0, x: -16, transition: easeFast },
};

export const listStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
  exit: {},
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: easeMed },
  exit: { opacity: 0, transition: easeFast },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.95, transition: easeFast },
};

/** True when the user prefers reduced motion (null-safe wrapper around framer's hook). */
export function useReducedMotionSafe(): boolean {
  return useReducedMotion() ?? false;
}
