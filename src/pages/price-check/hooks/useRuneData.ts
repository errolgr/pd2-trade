import { useState, useEffect, useMemo } from 'react';
import {
  fetchEconomyData,
  sortItemsByPrice,
  calculateRuneValues,
  getRuneBreakdown,
  calculateEconomyValues,
} from '../lib/economyService';
import { ItemData } from '../lib/types';

export type EconomyData = {
  Runes: Record<string, ItemData>;
  Currency: Record<string, ItemData>;
  Ubers: Record<string, ItemData>;
};

export function useRuneData() {
  const [economyData, setEconomyData] = useState<EconomyData>({ Runes: {}, Currency: {}, Ubers: {} });
  const [loadingRunes, setLoadingRunes] = useState(false);
  const [selectedRuneBreakdown, setSelectedRuneBreakdown] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoadingRunes(true);
      try {
        const data = await fetchEconomyData();
        setEconomyData(data);
      } catch (error) {
        console.error('Failed to fetch economy data:', error);
      } finally {
        setLoadingRunes(false);
      }
    };

    loadData();
    console.log('Setting Economy Data as...', economyData);
  }, []);

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
    loadingRunes,
    calculatedRuneValues,
    calculatedEconomyValues,
    selectedRuneBreakdown,
    selectedRuneCombinations,
    setSelectedRuneBreakdown,
  };
}
