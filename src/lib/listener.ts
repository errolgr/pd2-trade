/**
 * Own a Tauri listener (`listen()`, `getCurrentWindow().onMoved()`, ...) from an effect or disposer.
 *
 * Tauri's unlisten is async and rejects ("listeners[eventId].handlerId") when the listener is already gone:
 * a second unlisten, or one after its window/webview tore the listener down. Called bare from a cleanup,
 * that rejection is unhandled. The returned release is synchronous, idempotent and never throws or rejects;
 * if `listen()` resolves after release, the late listener is released immediately instead of leaking.
 */
export function holdListener(pending: Promise<() => unknown>, label: string): () => void {
  let released = false;
  let off: (() => unknown) | null = null;
  const warn = (error: unknown) => console.warn(`[listener] releasing ${label} failed:`, error);
  const release = (fn: () => unknown) => {
    try {
      Promise.resolve(fn()).catch(warn);
    } catch (error) {
      warn(error);
    }
  };

  pending.then(
    (fn) => {
      if (released) release(fn);
      else off = fn;
    },
    (error) => console.warn(`[listener] listening to ${label} failed:`, error),
  );

  return () => {
    if (released) return;
    released = true;
    const fn = off;
    off = null;
    if (fn) release(fn);
  };
}
