import { useState, useEffect, useMemo } from 'react';
import {
  fetchEconomyData,
  sortItemsByPrice,
  calculateRuneValues,
  getRuneBreakdown,
  calculateEconomyValues,
} from '../lib/economyService';
import { EconomyData } from '../lib/types';
import { useOptions } from '@/hooks/useOptions';
import { getSeasonDateConfig } from '@/lib/seasons';

export function useEconomyData() {
  const { settings } = useOptions();
  const [economyData, setEconomyData] = useState<EconomyData>({ Runes: {}, Currency: {}, Ubers: {} });
  const [loading, setLoading] = useState(false);
  const [selectedRuneBreakdown, setSelectedRuneBreakdown] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const seasonConfig = getSeasonDateConfig(settings?.selectedSeasonId);
        const data = await fetchEconomyData({
          isLadder: settings?.ladder === 'ladder',
          isHardcore: settings?.mode === 'hardcore',
          ...seasonConfig,
        });
        setEconomyData(data);
      } catch (error) {
        console.error('Failed to fetch economy data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [settings?.selectedSeasonId, settings?.ladder, settings?.mode]);

  const sortedRunes = useMemo(() => {
    return sortItemsByPrice(economyData.Runes);
  }, [economyData.Runes]);

  const calculatedRuneValues = useMemo(() => {
    return calculateRuneValues(sortedRunes);
  }, [sortedRunes]);

  const selectedRuneCombinations = useMemo(() => {
    if (!selectedRuneBreakdown) return [];
    return getRuneBreakdown(selectedRuneBreakdown, calculatedRuneValues);
  }, [selectedRuneBreakdown, calculatedRuneValues]);

  const calculatedEconomyValues = useMemo(() => {
    return calculateEconomyValues(economyData);
  }, [economyData]);

  return {
    economyData,
    loading,
    calculatedRuneValues,
    calculatedEconomyValues,
    selectedRuneBreakdown,
    selectedRuneCombinations,
    setSelectedRuneBreakdown,
  };
}
