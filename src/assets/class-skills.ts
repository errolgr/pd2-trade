import _ from "lodash";
import Fuse from 'fuse.js';

export interface ClassSkill {
  id: number;
  kind: string;
  key: string;
  name: string;
}

export interface ClassSubSkill {
  id: number;
  name: string;
  class: string;
}

export function getSkillTabIndex(rawSkillId) {
  const SKILLS_PER_CLASS = 3;
  const FILLER_SLOTS_BETWEEN_CLASSES = 5;

  // Which class block (0 for first 3 IDs, 1 for next 3, etc.)
  const classBlock = Math.floor(rawSkillId / SKILLS_PER_CLASS);

  // Total filler slots to skip before this class
  const totalFillerBefore = classBlock * FILLER_SLOTS_BETWEEN_CLASSES;

  // The final tab index
  return rawSkillId + totalFillerBefore;
}

export const classSkillsMap: Record<number, ClassSkill> = {
  0: { id: 0, kind: "character.class", key: "ama", name: "Amazon Skills" },
  1: { id: 1, kind: "character.class", key: "sor", name: "Sorceress Skills" },
  2: { id: 2, kind: "character.class", key: "nec", name: "Necromancer Skills" },
  3: { id: 3, kind: "character.class", key: "pal", name: "Paladin Skills" },
  4: { id: 4, kind: "character.class", key: "bar", name: "Barbarian Skills" },
  5: { id: 5, kind: "character.class", key: "dru", name: "Druid Skills" },
  6: { id: 6, kind: "character.class", key: "ass", name: "Assassin Skills" },
};

export const classSkillNameToIdMap: Record<string, ClassSkill> = _.keyBy(
  Object.values(classSkillsMap),
  (skill) => skill.name.toLowerCase()
);

export const classSubSkillMap: Record<number, ClassSubSkill> = {
  0:  { id:  0, name: "Bow and Crossbow Skills (Amazon)",     class: "Amazon"      },
  1:  { id:  1, name: "Passive and Magic Skills (Amazon)",     class: "Amazon"      },
  2:  { id:  2, name: "Javelin and Spear Skills (Amazon)",     class: "Amazon"      },
  3:  { id:  3, name: "Fire Skills (Sorceress)",                  class: "Sorceress"   },
  4:  { id:  4, name: "Lightning Skills (Sorceress)",             class: "Sorceress"   },
  5:  { id:  5, name: "Cold Skills (Sorceress)",                  class: "Sorceress"   },
  6:  { id:  6, name: "Curses Skills (Necromancer)",                class: "Necromancer" },
  7:  { id:  7, name: "Poison and Bone Skills (Necromancer)",       class: "Necromancer" },
  8:  { id:  8, name: "Summoning Skills (Necromancer)",             class: "Necromancer" },
  9:  { id:  9, name: "Combat Skills (Paladin)",                class: "Paladin"     },
  10:  { id: 10, name: "Offensive Auras Skills (Paladin)",        class: "Paladin"     },
  11:  { id: 11, name: "Defensive Auras Skills (Paladin)",       class: "Paladin"     },
  12:  { id: 12, name: "Combat Skills (Barbarian)",                class: "Barbarian"   },
  13:  { id: 13, name: "Masteries Skills (Barbarian)",             class: "Barbarian"   },
  14:  { id: 14, name: "Warcries Skills (Barbarian)",              class: "Barbarian"   },
  15:  { id: 15, name: "Summoning Skills (Druid)",             class: "Druid"       },
  16:  { id: 16, name: "Shape Shifting Skills (Druid)",        class: "Druid"       },
  17:  { id: 17, name: "Elemental Skills (Druid)",             class: "Druid"       },
  18:  { id: 18, name: "Traps Skills (Assassin)",                 class: "Assassin"    },
  19:  { id: 19, name: "Shadow Disciplines Skills (Assassin)",    class: "Assassin"    },
  20:  { id: 20, name: "Martial Arts Skills (Assassin)",          class: "Assassin"    },
};

export const classSubSkillNameToIdMap: Record<string, ClassSubSkill> = _.keyBy(
  Object.values(classSubSkillMap),
  (skill) => skill.name.toLowerCase()
);

// Fuzzy search functionality for class sub-skills
export function createClassSubSkillFuse(subSkillList: ClassSubSkill[] = Object.values(classSubSkillMap)) {
  return new Fuse(subSkillList, {
    keys: ['name'],
    threshold: 0.5,
  });
}

export function fuzzyMatchClassSubSkills(
  searchTerm: string, 
  subSkillList: ClassSubSkill[] = Object.values(classSubSkillMap),
): ClassSubSkill | null {
  const fuse = createClassSubSkillFuse(subSkillList);
  const results = fuse.search(searchTerm);
  return results.length > 0 ? results[0].item : null;
}

// Simple convenience function for fuzzy searching by name
export function fuzzyClassSubSkillByName(name: string): ClassSubSkill | null {
  return fuzzyMatchClassSubSkills(name);
}

// Fuzzy search functionality for main class skills
export function createClassSkillFuse(skillList: ClassSkill[] = Object.values(classSkillsMap)) {
  return new Fuse(skillList, {
    keys: ['name'],
    threshold: 0.5,
  });
}

export function fuzzyMatchClassSkills(
  searchTerm: string, 
  skillList: ClassSkill[] = Object.values(classSkillsMap),
): ClassSkill | null {
  const fuse = createClassSkillFuse(skillList);
  const results = fuse.search(searchTerm);
  return results.length > 0 ? results[0].item : null;
}

// Simple convenience function for fuzzy searching main class skills by name
export function fuzzyClassSkillByName(name: string): ClassSkill | null {
  return fuzzyMatchClassSkills(name);
}