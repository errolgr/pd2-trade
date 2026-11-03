import { useEffect, useState } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { getSimEnabled } from '@/lib/sim-export-api';

/** How long one answer serves every caller with the same login (cards, the price check, Net Worth). */
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
  // Fail closed: an unreachable or erroring server hides the sim until the next try.
  const answer: Answer = { at: Date.now(), enabled: getSimEnabled(token).catch(() => false) };
  void answer.enabled.then((value) => (answer.value = value));
  answers.set(token ?? '', answer);
  return answer.enabled;
}

/**
 * Whether Horadric Sim is open to the signed-in user (the website's `sim.enabled` flag, evaluated per PD2 login):
 * `undefined` while unknown, then the answer. The sim's overlay entry points render only on `true`.
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
    void load(token).then(
      (enabled) =>
        live &&
        setAnswer((current) => (current.token === token && current.enabled === enabled ? current : { token, enabled })),
    );
    return () => {
      live = false;
    };
  }, [token]);

  return answer.token === token ? answer.enabled : undefined;
}
