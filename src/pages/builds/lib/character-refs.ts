import type { BuildCharacterRef } from '@/hooks/useOptions';

export const RECENT_LIMIT = 10;

const same = (a: BuildCharacterRef, b: BuildCharacterRef) =>
  a.mode === b.mode && a.name.toLowerCase() === b.name.toLowerCase();

/** `ref` first, de-duplicated case-insensitively, at most RECENT_LIMIT. Returns `list` itself when unchanged. */
export function pushRecent(list: BuildCharacterRef[], ref: BuildCharacterRef): BuildCharacterRef[] {
  if (list[0] && list[0].name === ref.name && list[0].mode === ref.mode) return list;
  return [ref, ...list.filter((r) => !same(r, ref))].slice(0, RECENT_LIMIT);
}

export const isFollowed = (list: BuildCharacterRef[], ref: BuildCharacterRef) => list.some((r) => same(r, ref));

/** Follow / unfollow. */
export function toggleFollow(list: BuildCharacterRef[], ref: BuildCharacterRef): BuildCharacterRef[] {
  return isFollowed(list, ref) ? list.filter((r) => !same(r, ref)) : [...list, ref];
}
