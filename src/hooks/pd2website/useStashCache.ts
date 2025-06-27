import { useCallback, useRef } from 'react';
import Fuse from 'fuse.js';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { Item as PriceCheckItem } from '@/pages/price-check/lib/interfaces';
import { GameData, Item as GameStashItem } from '@/common/types/pd2-website/GameStashResponse';
import { ItemQuality } from '@/common/types/Item';
import { getTypeFromBaseType } from '@/pages/price-check/lib/utils';
import { statIdToProperty } from '@/pages/price-check/lib/stat-mappings';
import { handleApiResponse } from './usePD2Website';

function buildUrlWithQuery(base: string, query?: Record<string, any>) {
  if (!query) return base;
  const url = new URL(base);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.append(key, String(value));
  });
  return url.toString();
}

export function useStashCache(authData, settings) {
  const stashCache = useRef(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Helper: fetch stash from server and update cache (RESTful)
  const fetchAndCacheStash = useCallback(async () => {
    if (!authData) throw new Error('Not authenticated');
    const is_hardcore = settings.mode === 'hardcore';
    const is_ladder = settings.ladder === 'ladder';
    const account = authData.user.game.accounts[0];
    const params = {
      account,
      softcore: !is_hardcore,
      ladder: is_ladder
    };
    const url = buildUrlWithQuery(`https://api.projectdiablo2.com/game/stash/${account}`, params);
    const response = await tauriFetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.pd2Token}`,
      },
    });
    const stashData = await handleApiResponse(response)
    stashCache.current = { data: stashData, timestamp: Date.now() };
    return stashData;
  }, [settings, authData]);

  // Helper: calculate modifier similarity score between PriceCheckItem and stash item
  function calculateModifierSimilarity(priceCheckItem: PriceCheckItem, stashItem: GameStashItem): number {
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Create a map of stash item modifiers for quick lookup
    const stashModifierMap = new Map<string, number>();
    stashItem.modifiers.forEach(mod => {
      stashModifierMap.set(mod.name, mod.values[0] || 0);
    });

    // Compare each stat from the PriceCheckItem with stash item modifiers
    priceCheckItem.stats.forEach(stat => {
      maxPossibleScore += 1;

      // Handle skill stats
      if ('skill' in stat && stat.skill) {
        // Look for skill-related modifiers
        const skillModifiers = ['item_singleskill', 'item_addclassskills', 'item_addskill_tab'];
        let foundSkillMatch = false;
        
        for (const skillMod of skillModifiers) {
          if (stashModifierMap.has(skillMod)) {
            totalScore += 0.8; // Partial match for skill modifiers
            foundSkillMatch = true;
            break;
          }
        }
        
        if (!foundSkillMatch) {
          // Try fuzzy matching on skill name
          const fuse = new Fuse(stashItem.modifiers, {
            keys: ['label'],
            threshold: 0.3,
          });
          const skillMatches = fuse.search(stat.skill);
          if (skillMatches.length > 0) {
            totalScore += 0.6; // Fuzzy skill match
          }
        }
        return;
      }

      // Handle regular stats
      if (stat.stat_id !== undefined) {
        const propertyName = statIdToProperty[stat.stat_id];
        if (propertyName && stashModifierMap.has(propertyName)) {
          const stashValue = stashModifierMap.get(propertyName)!;
          const priceValue = stat.value || 0;
          
          // Calculate value similarity (closer values get higher scores)
          const valueDiff = Math.abs(stashValue - priceValue);
          const maxValue = Math.max(stashValue, priceValue, 1);
          const valueSimilarity = Math.max(0, 1 - (valueDiff / maxValue));
          
          totalScore += valueSimilarity;
        } else {
          // Try fuzzy matching on stat name
          const fuse = new Fuse(stashItem.modifiers, {
            keys: ['label'],
            threshold: 0.3,
          });
          const statMatches = fuse.search(stat.name);
          if (statMatches.length > 0) {
            totalScore += 0.4; // Fuzzy stat name match
          }
        }
      }
    });

    // Handle sockets
    if (priceCheckItem.sockets !== undefined && stashItem.socket_count !== undefined) {
      maxPossibleScore += 1;
      if (priceCheckItem.sockets === stashItem.socket_count) {
        totalScore += 1;
      } else {
        const socketDiff = Math.abs(priceCheckItem.sockets - stashItem.socket_count);
        totalScore += Math.max(0, 1 - socketDiff);
      }
    }

    // Handle ethereal
    if (priceCheckItem.isEthereal !== undefined && stashItem.is_ethereal !== undefined) {
      maxPossibleScore += 1;
      if (priceCheckItem.isEthereal === stashItem.is_ethereal) {
        totalScore += 1;
      }
    }

    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  }

  // Helper: find items by name or type/base using fuzzy matching
  function findItemsByName(stashItems: GameStashItem[], item: PriceCheckItem): GameStashItem[] {
    let matchingItems: GameStashItem[] = [];

    // For rare, magic, and crafted items, search by type and base instead of name
    if ((item.type !== "Jewel" &&
       !item.type.includes("Charm")) &&
       (item.quality === ItemQuality.Rare || 
        item.quality === ItemQuality.Magic || 
        item.quality === ItemQuality.Crafted)) {
      
      const typeBaseInfo = getTypeFromBaseType(item.type);
      if (typeBaseInfo) {
        const fuse = new Fuse(stashItems, {
          keys: ['base.type_code', 'base_code'],
          threshold: 0.1, // Adjust for strictness (lower = stricter)
        });
        
        // Search for items matching only the base
        matchingItems = fuse.search(typeBaseInfo.base).map(result => result.item);
      }
    } else {
      // For other item qualities, search by name as before
      const fuse = new Fuse(stashItems, {
        keys: ['name'],
        threshold: 0.1, // Adjust for strictness (lower = stricter)
      });
      matchingItems = fuse.search(item.isRuneword ? item.runeword : item.name).map(result => result.item);
    }

    // Filter by quality - only return items with matching quality
    matchingItems = matchingItems.filter(stashItem => 
      stashItem.quality.name === item.quality
    );

    // Sort results by modifier similarity score
    return matchingItems
      .map(stashItem => ({
        item: stashItem,
        similarityScore: calculateModifierSimilarity(item, stashItem)
      }))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .map(result => result.item);
  }

  // Update an item in the stash cache by its hash
  const updateItemByHash = useCallback((hash: string, update) => {
    if (!stashCache.current || !stashCache.current.data) return false;
    const items = stashCache.current.data.items;
    if (!Array.isArray(items)) return false;
    const idx = items.findIndex(item => item.hash === hash);
    if (idx === -1) return false;
    items[idx] = { ...items[idx], ...update };
    return true;
  }, [stashCache]);

  return { fetchAndCacheStash, findItemsByName, stashCache, CACHE_TTL, updateItemByHash };
} 