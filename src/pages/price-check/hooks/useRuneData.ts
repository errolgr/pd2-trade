import { useState, useEffect, useMemo } from "react";
import {
  fetchEconomyData,
  sortRunesByPrice,
  calculateRuneValues,
  getRuneBreakdown
} from "../lib/economyService";
import { RuneData, RuneValue, RuneCombination } from "../lib/types";

type EconomyData = {
  Runes: Record<string, RuneData>;
  Currency: Record<string, RuneData>;
  Ubers: Record<string, RuneData>;
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
        console.error("Failed to fetch economy data:", error);
      } finally {
        setLoadingRunes(false);
      }
    };

    loadData();
    console.log('using rune data', economyData)
  }, []);

  const sortedRunes = useMemo(() => {
    return sortRunesByPrice(economyData.Runes);
  }, [economyData.Runes]);

  const calculatedRuneValues = useMemo(() => {
    return calculateRuneValues(sortedRunes);
  }, [sortedRunes]);

  const selectedRuneCombinations = useMemo(() => {
    if (!selectedRuneBreakdown) return [];
    return getRuneBreakdown(selectedRuneBreakdown, calculatedRuneValues);
  }, [selectedRuneBreakdown, calculatedRuneValues]);

  return {
    economyData,
    loadingRunes,
    calculatedRuneValues,
    selectedRuneBreakdown,
    selectedRuneCombinations,
    setSelectedRuneBreakdown
  };
}
