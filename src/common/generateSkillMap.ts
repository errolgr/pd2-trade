import { writeFileSync } from 'fs';
import {characterSkills} from "@/assets/character-skills";


const header = `export const characterSkillMap: Record<number, CharacterSkill> = {\n`;

// Optional: Save to file

const entries = characterSkills.map(skill =>
  `  ${skill.id}: ${JSON.stringify(skill, null, 2).replace(/\n/g, '\n  ')},`
).join('\n');

const footer = `\n};\n`;

writeFileSync('characterSkillMap.js', header + entries + footer);

console.log('✅ characterSkillMap.ts generated.');