import { useState, useEffect, useMemo } from 'react';
import {
  fetchEconomyData,
  sortItemsByPrice,
  calculateRuneValues,
  getRuneBreakdown,
  calculateEconomyValues,
} from '../lib/economyService';
import { EconomyData } from '../lib/types';

export function useEconomyData() {
  const [economyData, setEconomyData] = useState<EconomyData>({ Runes: {}, Currency: {}, Ubers: {} });
  const [loading, setLoading] = useState(false);
  const [selectedRuneBreakdown, setSelectedRuneBreakdown] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchEconomyData();
        setEconomyData(data);
      } catch (error) {
        console.error('Failed to fetch economy data:', error);
      } finally {
        setLoading(false);
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
    loading,
    calculatedRuneValues,
    calculatedEconomyValues,
    selectedRuneBreakdown,
    selectedRuneCombinations,
    setSelectedRuneBreakdown,
  };
}
