/** Toast popup types on by default (Settings → Chat → Toast popup types). */
export const DEFAULT_TOAST_POPUP_TYPES = ['whispers', 'trade', 'joins', 'offers', 'networth', 'sim'];

/**
 * Types added after users already saved a list: on unless turned off, which stores an explicit `!<type>` marker.
 * Saved lists from before the type existed are left untouched and still read as on.
 */
const OPT_OUT_TYPES: Record<string, true> = { sim: true };

export function isToastTypeOn(types: readonly string[] | undefined, type: string): boolean {
  const list = types ?? DEFAULT_TOAST_POPUP_TYPES;
  if (OPT_OUT_TYPES[type]) return !list.includes(`!${type}`);
  return list.includes(type);
}

/** The list with `type` flipped. */
export function toggleToastType(types: readonly string[] | undefined, type: string): string[] {
  const list = types ?? DEFAULT_TOAST_POPUP_TYPES;
  const on = isToastTypeOn(list, type);
  const rest = list.filter((t) => t !== type && t !== `!${type}`);
  if (OPT_OUT_TYPES[type]) return on ? [...rest, `!${type}`] : [...rest, type];
  return on ? rest : [...list, type];
}
