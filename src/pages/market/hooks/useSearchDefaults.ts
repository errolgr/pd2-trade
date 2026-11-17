import { useMemo } from 'react';
import { useOptions } from '@/hooks/useOptions';
import { searchDefaults, type SearchDefaults } from '../lib/defaults';

/** Settings → Market's defaults for a fresh market search (first open, Reset, browse seller). */
export function useSearchDefaults(): SearchDefaults {
  const { settings } = useOptions();
  const { marketDefaultSort, marketDefaultSeller, marketDefaultHasBuyout, marketDefaultListedWithinDays } =
    settings ?? {};
  return useMemo(
    () =>
      searchDefaults({ marketDefaultSort, marketDefaultSeller, marketDefaultHasBuyout, marketDefaultListedWithinDays }),
    [marketDefaultSort, marketDefaultSeller, marketDefaultHasBuyout, marketDefaultListedWithinDays],
  );
}
