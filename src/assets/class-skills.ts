import _ from "lodash";

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