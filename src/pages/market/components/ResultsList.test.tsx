// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { MarketListingEntry } from '@/common/types/pd2-website/GetMarketListingsResponse';
import { OnlineDots, PresenceAsOf } from './ResultsList';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SEEN = new Date('2026-10-18T12:00:00.000Z').getTime();
const listing = {
  _id: 'a',
  user_last_online: new Date(SEEN).toISOString(),
  user_last_ingame: new Date(SEEN).toISOString(),
} as MarketListingEntry;

/** [site online, in game] as the dots show them, with presence judged as of `asOf`. */
const dots = (asOf: number | null) => {
  const { container } = render(
    <TooltipProvider>
      <PresenceAsOf.Provider value={asOf}>
        <OnlineDots listing={listing} />
      </PresenceAsOf.Provider>
    </TooltipProvider>,
  );
  const [site, game] = container.querySelectorAll('span > span');
  const shown = [site.classList.contains('bg-info'), game.classList.contains('bg-success')];
  cleanup();
  return shown;
};

describe('OnlineDots', () => {
  it('keeps a seller online as of when the results were shown, however long the list stays open', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SEEN + 30 * 60_000);
    // Shown a minute after the seller was last seen: online until the next refresh moves the time
    expect(dots(SEEN + 60_000)).toEqual([true, true]);
    // A refresh much later (or no shown time: live) judges them against then
    expect(dots(SEEN + 10 * 60_000)).toEqual([false, false]);
    expect(dots(null)).toEqual([false, false]);
  });
});
