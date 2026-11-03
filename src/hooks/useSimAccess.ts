import { useEffect, useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { getSimEnabled } from '@/lib/sim-export-api';

/**
 * How long one answer serves every caller with the same login (cards, the price check, Net Worth); mounted callers
 * ask again on this interval, so an allowlist change (or a failed first check) shows up without a restart.
 */
export const SIM_ACCESS_TTL_MS = 60_000;

interface Answer {
  at: number;
  enabled: Promise<boolean>;
  /** Set once `enabled` settles, so a later mount renders the answer without a loading frame. */
  value?: boolean;
}

/** Per PD2 token (`''` anonymous); module-level so the many market cards share one request. */
const answers = new Map<string, Answer>();

function fresh(token: string | null): Answer | undefined {
  const answer = answers.get(token ?? '');
  return answer && Date.now() - answer.at < SIM_ACCESS_TTL_MS ? answer : undefined;
}

function load(token: string | null): Promise<boolean> {
  const cached = fresh(token);
  if (cached) return cached.enabled;
  // A failed re-check keeps the last answer; a failed first check fails closed until the next try.
  const previous = answers.get(token ?? '')?.value;
  const answer: Answer = { at: Date.now(), enabled: getSimEnabled(token).catch(() => previous ?? false) };
  void answer.enabled.then((value) => (answer.value = value));
  answers.set(token ?? '', answer);
  return answer.enabled;
}

/**
 * Whether Horadric Sim is open to the signed-in user (the website's `sim.enabled` flag, evaluated per PD2 login):
 * `undefined` while unknown, then the answer, re-checked every TTL while mounted (the price check never unmounts).
 * The sim's overlay entry points render only on `true`.
 */
export function useSimAccess(): boolean | undefined {
  const { settings, isLoading } = useOptions();
  const token = isLoading ? undefined : settings?.pd2Token || null;
  const [answer, setAnswer] = useState(() => ({
    token,
    enabled: token === undefined ? undefined : fresh(token)?.value,
  }));

  useEffect(() => {
    if (token === undefined) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () =>
      void load(token).then((enabled) => {
        if (!live) return;
        setAnswer((current) => (current.token === token && current.enabled === enabled ? current : { token, enabled }));
        timer = setTimeout(check, SIM_ACCESS_TTL_MS);
      });
    check();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [token]);

  return answer.token === token ? answer.enabled : undefined;
}
