import type React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '@/lib/motion';

/** Ring-only mask: the gradient shows in the 2px padding band, not over the content. */
const RING_MASK: React.CSSProperties = {
  padding: 2,
  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
  WebkitMaskComposite: 'xor',
  mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
};

/**
 * One light in the theme's accent (--glow) running around the window border ("Copy image" feedback).
 * Remount (new `key`) to replay; the parent must be positioned. Nothing under reduced motion.
 */
export function CaptureSweep() {
  const reduce = useReducedMotionSafe();
  if (reduce) return null;
  return (
    <>
      {/* Soft inner glow under the light, so the press reads at a glance. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-50 rounded-[inherit]"
        style={{ boxShadow: 'inset 0 0 28px -10px var(--glow), inset 0 0 0 1px color-mix(in oklab, var(--glow) 45%, transparent)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.9, times: [0, 0.25, 1], ease: 'easeOut' }}
      />
      <motion.div
        aria-hidden
        data-testid="capture-sweep"
        className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-[inherit]"
        style={RING_MASK}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.9, times: [0, 0.08, 0.75, 1], ease: 'easeOut' }}
      >
        <motion.div
          className="absolute top-1/2 left-1/2 aspect-square w-[300%]"
          style={{
            x: '-50%',
            y: '-50%',
            background:
              'conic-gradient(from 0deg, transparent 0deg 200deg, color-mix(in oklab, var(--glow) 35%, transparent) 290deg, var(--glow) 352deg, transparent 360deg)',
          }}
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, ease: [0.45, 0, 0.2, 1] }}
        />
      </motion.div>
    </>
  );
}
