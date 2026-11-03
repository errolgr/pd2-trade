import { useEffect, useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { getSimAccess, type SimAccess } from '@/lib/sim-export-api';

/**
 * How long one answer serves every caller with the same login (cards, the price check, Net Worth); mounted callers
 * ask again on this interval, so an allowlist change (or a failed first check) shows up without a restart.
 */
export const SIM_ACCESS_TTL_MS = 60_000;

interface Answer {
  at: number;
  access: Promise<SimAccess | null>;
  /** Set once `access` settles, so a later mount renders the answer without a loading frame. */
  value?: SimAccess | null;
}

/** Per PD2 token (`''` anonymous); module-level so the many market cards share one request. */
const answers = new Map<string, Answer>();

function fresh(token: string | null): Answer | undefined {
  const answer = answers.get(token ?? '');
  return answer && Date.now() - answer.at < SIM_ACCESS_TTL_MS ? answer : undefined;
}

function load(token: string | null): Promise<SimAccess | null> {
  const cached = fresh(token);
  if (cached) return cached.access;
  // A failed re-check keeps the last answer; a failed first check fails closed until the next try.
  const previous = answers.get(token ?? '')?.value;
  const answer: Answer = { at: Date.now(), access: getSimAccess(token).catch(() => previous ?? null) };
  void answer.access.then((value) => (answer.value = value));
  answers.set(token ?? '', answer);
  return answer.access;
}

function same(a: SimAccess | null | undefined, b: SimAccess | null | undefined): boolean {
  if (!a || !b) return a === b;
  return a.canUse === b.canUse && a.waitlistUrl === b.waitlistUrl && a.waitlistPosition === b.waitlistPosition;
}

/**
 * Horadric Sim's closed beta for the signed-in user (anonymous when signed out): `undefined` while unknown, `null`
 * while the sim is off for them, else whether they may use it (`canUse`: allowlisted or open beta) and where the
 * waitlist is. Re-checked every TTL while mounted (the price check never unmounts).
 */
export function useSimAccess(): SimAccess | null | undefined {
  const { settings, isLoading } = useOptions();
  const token = isLoading ? undefined : settings?.pd2Token || null;
  const [answer, setAnswer] = useState(() => ({
    token,
    access: token === undefined ? undefined : fresh(token)?.value,
  }));

  useEffect(() => {
    if (token === undefined) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () =>
      void load(token).then((access) => {
        if (!live) return;
        setAnswer((current) => (current.token === token && same(current.access, access) ? current : { token, access }));
        timer = setTimeout(check, SIM_ACCESS_TTL_MS);
      });
    check();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [token]);

  return answer.token === token ? answer.access : undefined;
}
