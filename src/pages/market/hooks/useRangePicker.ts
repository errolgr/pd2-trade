import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { pickIndex, spanOf, type IndexRange } from '../lib/facets';

/**
 * Calendar-style range picking over a row of options (price bars), the same by mouse, touch, pen and
 * keyboard:
 * - click / Enter / Space: `pickIndex` (nothing picked → that one; one picked → the range to it, or clear on itself;
 *   a range picked → that one);
 * - a drag across options picks the range from where it started to where it ends, in one move;
 * - with one option picked, hovering (or arrowing to) another previews the range they would span;
 * - one option is in the tab order (roving tabindex): ←/→ and Home/End move, Esc clears.
 */
export function useRangePicker({
  count,
  selected,
  onPick,
}: {
  count: number;
  /** The picked options (null: none). */
  selected: IndexRange | null;
  onPick: (r: IndexRange | null) => void;
}) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  /** The option arrowed to (keyboard preview), until the group loses focus or the pointer takes over. */
  const [keyIndex, setKeyIndex] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ anchor: number; at: number } | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  /** The click a browser may still fire after a drag ends over another option. */
  const suppressClick = useRef(false);
  const stopDrag = useRef<(() => void) | null>(null);
  /** For a drag's end, which window listeners registered at its start hear. */
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => () => stopDrag.current?.(), []);

  const pick = (i: number) => {
    setKeyIndex(null);
    onPick(pickIndex(selected, i));
  };

  const focusOption = (i: number) => groupRef.current?.querySelector<HTMLElement>(`[data-pick-index="${i}"]`)?.focus();

  /** The option under a point: touch keeps targeting the one the drag started on, so hit-test instead. */
  const indexAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-pick-index]');
    return el && groupRef.current?.contains(el) ? Number(el.dataset.pickIndex) : null;
  };

  const startDrag = (anchor: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    stopDrag.current?.();
    let at = anchor;
    setDrag({ anchor, at });
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      const i = indexAt(ev.clientX, ev.clientY);
      if (i === null || i === at) return;
      at = i;
      setDrag({ anchor, at });
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      stop();
      if (ev.type !== 'pointerup' || at === anchor) return;
      setFocusIndex(at);
      onPickRef.current(spanOf(anchor, at));
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false));
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      stopDrag.current = null;
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    stopDrag.current = stop;
  };

  const roving = Math.min(count - 1, Math.max(0, focusIndex ?? selected?.lo ?? 0));
  const target = hoverIndex ?? keyIndex;
  const preview = drag
    ? spanOf(drag.anchor, drag.at)
    : selected && selected.lo === selected.hi && target !== null && target !== selected.lo
      ? spanOf(selected.lo, target)
      : null;

  return {
    /** The range a drag in progress, or a hover / arrow key from the one picked option, would pick. */
    preview,
    groupProps: {
      ref: groupRef,
      onPointerLeave: () => setHoverIndex(null),
      onBlur: (e: React.FocusEvent) => {
        if (!groupRef.current?.contains(e.relatedTarget as Node | null)) setKeyIndex(null);
      },
      // Horizontal drags pick, vertical swipes still scroll the sidebar
      style: { touchAction: 'pan-y' } as React.CSSProperties,
    },
    optionProps: (i: number) => ({
      'data-pick-index': i,
      tabIndex: i === roving ? 0 : -1,
      onFocus: () => setFocusIndex(i),
      onPointerDown: (e: React.PointerEvent) => startDrag(i, e),
      onPointerEnter: (e: React.PointerEvent) => {
        if (e.pointerType === 'touch') return;
        setKeyIndex(null);
        setHoverIndex(i);
      },
      onClick: () => {
        if (suppressClick.current) return;
        setFocusIndex(i);
        pick(i);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        const moveTo = (j: number) => {
          e.preventDefault();
          setFocusIndex(j);
          setKeyIndex(j);
          focusOption(j);
        };
        switch (e.key) {
          case 'ArrowRight':
            return moveTo(Math.min(count - 1, i + 1));
          case 'ArrowLeft':
            return moveTo(Math.max(0, i - 1));
          case 'Home':
            return moveTo(0);
          case 'End':
            return moveTo(count - 1);
          case 'Enter':
          case ' ':
            e.preventDefault();
            return pick(i);
          case 'Escape':
            // Nothing to clear: the key goes on (it closes the market window)
            if (!selected) return;
            e.preventDefault();
            e.stopPropagation();
            setKeyIndex(null);
            return onPick(null);
        }
      },
      // Space would click on key up as well
      onKeyUp: (e: React.KeyboardEvent) => {
        if (e.key === ' ') e.preventDefault();
      },
    }),
  };
}
