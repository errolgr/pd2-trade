import React, { useEffect } from 'react';
import { claimKeyboard } from './keyboard';
import { useRegionSync } from './region';
import { useOverlayInternals } from './OverlayProvider';
import { Panel } from './Panel';
import { ToastLayer } from './toast';
import type { PanelId } from './types';

const isTextInput = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

/** Full-viewport click-through layer hosting every mounted panel plus the toast layer. */
export const OverlayRoot: React.FC = () => {
  const { defs, state } = useOverlayInternals();
  useRegionSync();

  // Typing anywhere (also in keyboard:'never' panels and portalled popovers) needs the OS keyboard focus.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target)) void claimKeyboard();
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden"
        data-overlay-root>
        {(Object.keys(defs) as PanelId[]).map((id) => {
          const panel = state.panels[id];
          if (!panel || !(panel.open || defs[id].keepMounted)) return null;
          return <Panel key={id}
            id={id} />;
        })}
      </div>
      <ToastLayer />
    </>
  );
};
