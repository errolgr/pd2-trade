/**
 * Test-only stand-in for `framer-motion`: renders `motion.*` as plain elements and makes
 * `AnimatePresence` drop exiting children immediately. happy-dom's WAAPI rejects cancelled
 * animations as unhandled errors and keeps exiting nodes mounted, which breaks presence assertions.
 *
 * Usage: `vi.mock('framer-motion', () => import('@/pages/quick-list/motion-mock'));`
 */
import React from 'react';

const MOTION_PROPS: Record<string, true> = {
  initial: true,
  animate: true,
  exit: true,
  variants: true,
  transition: true,
  layout: true,
  layoutId: true,
  whileHover: true,
  whileTap: true,
  whileFocus: true,
  whileInView: true,
  custom: true,
  onAnimationComplete: true,
  onAnimationStart: true,
};

const cache = new Map<string, React.ElementType>();

export const motion = new Proxy({} as Record<string, React.ElementType>, {
  get(_target, tag: string) {
    let component = cache.get(tag);
    if (!component) {
      const forwarded = React.forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
        const domProps: Record<string, unknown> = { ref };
        for (const [key, value] of Object.entries(props)) {
          if (!MOTION_PROPS[key]) domProps[key] = value;
        }
        return React.createElement(tag, domProps);
      });
      forwarded.displayName = `motion.${tag}`;
      component = forwarded;
      cache.set(tag, component);
    }
    return component;
  },
});

export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const MotionConfig = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const MotionGlobalConfig = { skipAnimations: true };
export const useReducedMotion = () => true;
export const animate = () => ({ stop() {}, then: (resolve: () => void) => resolve() });
