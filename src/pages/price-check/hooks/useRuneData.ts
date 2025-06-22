import { useState, useEffect, useMemo } from "react";
import { fetchRuneData, sortRunesByPrice, calculateRuneValues, getRuneBreakdown } from "../lib/runeService";
import { RuneData, RuneValue, RuneCombination } from "../lib/types";

export function useRuneData() {
  const [runeData, setRuneData] = useState<Record<string, RuneData>>({});
  const [loadingRunes, setLoadingRunes] = useState(false);
  const [selectedRuneBreakdown, setSelectedRuneBreakdown] = useState<string | null>(null);

  // Fetch rune data when component mounts
  useEffect(() => {
    const loadRuneData = async () => {
      setLoadingRunes(true);
      try {
        const data = await fetchRuneData();
        setRuneData(data);
      } catch (error) {
        console.error("Failed to fetch rune data:", error);
      } finally {
        setLoadingRunes(false);
      }
    };

    loadRuneData();
  }, []);

  // Sort runes by price for display
  const sortedRunes = useMemo(() => {
    return sortRunesByPrice(runeData);
  }, [runeData]);

  // Calculate rune values with cascading pricing for low listings
  const calculatedRuneValues = useMemo(() => {
    return calculateRuneValues(sortedRunes);
  }, [sortedRunes]);

  // Calculate breakdown combinations for a selected rune
  const selectedRuneCombinations = useMemo(() => {
    if (!selectedRuneBreakdown) return [];
    return getRuneBreakdown(selectedRuneBreakdown, calculatedRuneValues);
  }, [selectedRuneBreakdown, calculatedRuneValues]);

  return {
    runeData,
    loadingRunes,
    calculatedRuneValues,
    selectedRuneBreakdown,
    selectedRuneCombinations,
    setSelectedRuneBreakdown
  };
} 