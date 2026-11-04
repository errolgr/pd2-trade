/**
 * Typed text of an integer field: kept as typed while editing, committed when it reads as a number in range.
 */

/** Why a draft is not a valid value: below `min`, above `max`, or not a whole number. */
export type NumberDraftError = 'min' | 'max' | 'integer';

export interface NumberDraft {
  /** The integer the text reads as; null for "", "-", "+" or junk. */
  value: number | null;
  /** `value` is an integer in `[min, max]`. */
  valid: boolean;
  /** Why it is not valid; null when valid or still being typed ("", "-", "+"). */
  error: NumberDraftError | null;
}

/** Reads draft `text` of an integer field in `[min, max]`. */
export function readDraft(text: string, min = -Infinity, max = Infinity): NumberDraft {
  const t = text.trim();
  if (!/^[+-]?\d+$/.test(t)) {
    return { value: null, valid: false, error: t === '' || t === '-' || t === '+' ? null : 'integer' };
  }
  const value = Number(t);
  if (value < min) return { value, valid: false, error: 'min' };
  if (value > max) return { value, valid: false, error: 'max' };
  return { value, valid: true, error: null };
}

/** The integer a draft commits to on blur/Enter: clamped into range, or `fallback` when it reads as no number. */
export function commitDraft(text: string, min: number, max: number, fallback: number): number {
  const { value } = readDraft(text, min, max);
  if (value === null) return fallback;
  return Math.min(max, Math.max(min, value));
}
