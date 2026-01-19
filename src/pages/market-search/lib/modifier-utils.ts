import { modifiers } from '@/assets/modifiers';
import { classSkillsMap } from '@/assets/class-skills';
import { classSubSkillMap, getSkillTabIndex } from '@/assets/class-skills';
import { characterSkillMap } from '@/assets/character-skills';

// Permitted modifiers list (combining all allowed modifiers)
export const PERMITTED_MODIFIERS = [
  'all_resist',
  'damageresist',
  'magicresist',
  'maxmagicresist',
  'fireresist',
  'maxfireresist',
  'lightresist',
  'maxlightresist',
  'coldresist',
  'maxcoldresist',
  'poisonresist',
  'maxpoisonresist',
  'item_resist_cold_perlevel',
  'item_resist_fire_perlevel',
  'item_resist_ltng_perlevel',
  'item_resist_pois_perlevel',
  'passive_cold_pierce',
  'passive_fire_pierce',
  'passive_ltng_pierce',
  'passive_pois_pierce',
  'passive_mag_pierce',
  'item_maxdamage_percent_perlevel',
  'lifedrainmindam',
  'manadrainmindam',
  'immune_stat',
  'item_addclassskills',
  'item_addskill_tab',
  'item_singleskill',
  'item_nonclassskill',
  'item_numsockets_textonly',
  'item_pierce_cold',
  'item_pierce_fire',
  'item_pierce_ltng',
  'item_pierce_pois',
  'item_maxdamage_bytime',
  'item_maxdamage_percent_bytime',
  'item_maxdamage_percent',
  'maxdamage',
  'secondary_maxdamage',
  'item_throw_maxdamage',
  'mindamage',
  'secondary_mindamage',
  'item_throw_mindamage',
  'item_find_magic_bytime',
  'maxmagicresist',
];

// Merge mappings: maps multiple modifier names to a single merged modifier
export const MERGED_MODIFIERS: Array<{
  name: string;
  originalNames: string[];
  description: {
    value: number;
    label: {
      positive: string;
    };
  };
}> = [
  {
    name: 'all_attributes',
    originalNames: ['strength', 'energy', 'dexterity', 'vitality'], // These would need to be combined
    description: {
      value: 1,
      label: {
        positive: 'to All Attributes',
      },
    },
  },
  {
    name: 'all_resist',
    originalNames: ['all_resist'],
    description: {
      value: 2,
      label: {
        positive: 'All Resistances',
      },
    },
  },
  {
    name: 'maxdamage_merged',
    originalNames: ['maxdamage', 'secondary_maxdamage', 'item_throw_maxdamage'],
    description: {
      value: 1,
      label: {
        positive: 'to Maximum Damage',
      },
    },
  },
  {
    name: 'mindamage_merged',
    originalNames: ['mindamage', 'secondary_mindamage', 'item_throw_mindamage'],
    description: {
      value: 1,
      label: {
        positive: 'to Minimum Damage',
      },
    },
  },
  {
    name: 'maxdamage_percent',
    originalNames: ['item_maxdamage_percent', 'item_maxdamage_percent_bytime', 'item_maxdamage_percent_perlevel'],
    description: {
      value: 1,
      label: {
        positive: '% Enhanced Damage',
      },
    },
  },
];

// Get all original modifier names that should be included (from permitted list and merged modifiers)
export function getAllIncludedModifierNames(): Set<string> {
  const names = new Set<string>(PERMITTED_MODIFIERS);

  // Add all original names from merged modifiers
  MERGED_MODIFIERS.forEach((merged) => {
    merged.originalNames.forEach((name) => names.add(name));
  });

  return names;
}

// Check if a modifier name is permitted (either directly or as part of a merged modifier)
export function isModifierPermitted(modifierName: string): boolean {
  const includedNames = getAllIncludedModifierNames();
  return includedNames.has(modifierName);
}

// Get the merged modifier for a given original modifier name, or null if not merged
export function getMergedModifierForName(originalName: string): (typeof MERGED_MODIFIERS)[number] | null {
  return MERGED_MODIFIERS.find((merged) => merged.originalNames.includes(originalName)) || null;
}

// Expand a merged modifier name to its original names for query purposes
export function expandMergedModifierName(mergedName: string): string[] {
  const merged = MERGED_MODIFIERS.find((m) => m.name === mergedName);
  if (merged) {
    return merged.originalNames;
  }
  return [mergedName];
}

// Generate skill modifiers dynamically
function generateSkillModifiers(): Array<{
  id: string;
  name: string;
  originalNames: string[];
  description: {
    value: number;
    label: {
      positive: string;
    };
  };
  originalModifiers: Array<(typeof modifiers)[number]>;
}> {
  const result: Array<{
    id: string;
    name: string;
    originalNames: string[];
    description: {
      value: number;
      label: {
        positive: string;
      };
    };
    originalModifiers: Array<(typeof modifiers)[number]>;
  }> = [];

  // Get base modifier templates
  const baseClassSkillsMod = modifiers.find((m) => m.name === 'item_addclassskills');
  const baseSkillTabMod = modifiers.find((m) => m.name === 'item_addskill_tab');
  const baseSingleSkillMod = modifiers.find((m) => m.name === 'item_singleskill');
  const baseNonClassSkillMod = modifiers.find((m) => m.name === 'item_nonclassskill');

  // IDs to exclude (Mm) - these are typically non-character skills like Attack, Kick, etc.
  // We'll exclude skills without a class_code or with empty description
  const excludedIds = new Set<number>();
  Object.values(characterSkillMap).forEach((skill) => {
    if (!skill.class_code && !skill.class) {
      excludedIds.add(skill.id);
    }
  });

  // Generate item_addclassskills modifiers
  Object.values(classSkillsMap).forEach((classSkill) => {
    const modifierName = `item_addclassskills{${classSkill.id}}`;
    result.push({
      id: `skill_class_${classSkill.id}`,
      name: modifierName,
      originalNames: [modifierName],
      description: {
        value: 1,
        label: {
          positive: `to ${classSkill.name}`,
        },
      },
      originalModifiers: baseClassSkillsMod ? [baseClassSkillsMod] : [],
    });
  });

  // Generate item_addskill_tab modifiers
  Object.values(classSubSkillMap).forEach((subSkill) => {
    const tabIndex = getSkillTabIndex(subSkill.id);
    const modifierName = `item_addskill_tab{${tabIndex}}`;
    // Extract skill name without class suffix and "Skills" suffix
    // e.g., "Bow and Crossbow Skills (Amazon)" -> "Bow and Crossbow"
    let skillName = subSkill.name;
    // Remove class suffix in parentheses
    skillName = skillName.replace(new RegExp(` \\(${subSkill.class}\\)`, 'g'), '');
    // Remove " Skills" suffix if present
    skillName = skillName.replace(/\s+Skills$/, '');
    result.push({
      id: `skill_tab_${subSkill.id}`,
      name: modifierName,
      originalNames: [modifierName],
      description: {
        value: 1,
        label: {
          positive: `to ${subSkill.class} ${skillName} Skills`,
        },
      },
      originalModifiers: baseSkillTabMod ? [baseSkillTabMod] : [],
    });
  });

  // Generate item_singleskill modifiers (excluding certain IDs)
  Object.values(characterSkillMap).forEach((skill) => {
    if (excludedIds.has(skill.id)) {
      return;
    }
    const modifierName = `item_singleskill{${skill.id}}`;
    // Get skill name - prefer the name from the skill, or use the skill name
    const skillDisplayName = skill.name;
    const classSuffix = skill.class ? ` (${skill.class})` : '';
    result.push({
      id: `skill_single_${skill.id}`,
      name: modifierName,
      originalNames: [modifierName],
      description: {
        value: 1,
        label: {
          positive: `to ${skillDisplayName}${classSuffix}`,
        },
      },
      originalModifiers: baseSingleSkillMod ? [baseSingleSkillMod] : [],
    });
  });

  // Generate item_nonclassskill modifiers (excluding certain IDs)
  Object.values(characterSkillMap).forEach((skill) => {
    if (excludedIds.has(skill.id)) {
      return;
    }
    const modifierName = `item_nonclassskill{${skill.id}}`;
    const skillDisplayName = skill.name;
    const oskillSuffix = skill.class ? ' (Oskill)' : '';
    result.push({
      id: `skill_nonclass_${skill.id}`,
      name: modifierName,
      originalNames: [modifierName],
      description: {
        value: 1,
        label: {
          positive: `to ${skillDisplayName}${oskillSuffix}`,
        },
      },
      originalModifiers: baseNonClassSkillMod ? [baseNonClassSkillMod] : [],
    });
  });

  return result;
}

// Get all filtered and merged modifiers including skill modifiers
export function getFilteredAndMergedModifiers(): Array<{
  id: string;
  name: string;
  originalNames: string[];
  description: {
    value: number;
    label: {
      positive: string;
    };
  };
  originalModifiers: Array<(typeof modifiers)[number]>;
}> {
  const includedNames = getAllIncludedModifierNames();
  const result: Array<{
    id: string;
    name: string;
    originalNames: string[];
    description: {
      value: number;
      label: {
        positive: string;
      };
    };
    originalModifiers: Array<(typeof modifiers)[number]>;
  }> = [];

  // First, add all merged modifiers
  MERGED_MODIFIERS.forEach((merged) => {
    const originalModifiers = merged.originalNames
      .map((name) => {
        const modifier = modifiers.find((m) => m.name === name);
        if (modifier && (PERMITTED_MODIFIERS.includes(name) || isModifierPermitted(name))) {
          return modifier;
        }
        return null;
      })
      .filter((m): m is (typeof modifiers)[number] => m !== null);

    if (originalModifiers.length > 0) {
      result.push({
        id: `merged_${merged.name}`,
        name: merged.name,
        originalNames: merged.originalNames.filter((name) => originalModifiers.some((m) => m.name === name)),
        description: merged.description,
        originalModifiers,
      });
    }
  });

  // Then, add permitted modifiers that are not part of any merged modifier
  const mergedOriginalNames = new Set<string>();
  MERGED_MODIFIERS.forEach((merged) => {
    merged.originalNames.forEach((name) => mergedOriginalNames.add(name));
  });

  PERMITTED_MODIFIERS.forEach((modifierName) => {
    // Skip if this modifier is part of a merged modifier
    if (mergedOriginalNames.has(modifierName)) {
      return;
    }

    // Skip skill modifiers - they'll be added separately
    if (
      modifierName === 'item_addclassskills' ||
      modifierName === 'item_addskill_tab' ||
      modifierName === 'item_singleskill' ||
      modifierName === 'item_nonclassskill'
    ) {
      return;
    }

    const modifier = modifiers.find((m) => m.name === modifierName);
    if (modifier && modifier.description?.function) {
      const alreadyMerged = result.some((r) => r.originalNames.includes(modifierName));
      if (!alreadyMerged) {
        result.push({
          id: `direct_${modifierName}`,
          name: modifierName,
          originalNames: [modifierName],
          description: {
            value: modifier.description.value || 1,
            label: {
              positive:
                modifier.description.label &&
                typeof modifier.description.label === 'object' &&
                'positive' in modifier.description.label
                  ? modifier.description.label.positive
                  : modifierName,
            },
          },
          originalModifiers: [modifier],
        });
      }
    }
  });

  // Finally, add skill modifiers
  const skillModifiers = generateSkillModifiers();
  result.push(...skillModifiers);

  return result;
}
