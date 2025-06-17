import {CharacterSkill} from "@/common/types/CharacterSkill";
import _ from "lodash";

export const characterSkillMap: Record<number, CharacterSkill> = {
  0: {
    "id": 0,
    "kind": "character.skill",
    "description": "attack",
    "key": 0,
    "name": "Attack"
  },
  1: {
    "id": 1,
    "kind": "character.skill",
    "description": "kick",
    "key": 1,
    "name": "Kick"
  },
  2: {
    "id": 2,
    "kind": "character.skill",
    "description": "throw",
    "key": 2,
    "name": "Throw"
  },
  3: {
    "id": 3,
    "kind": "character.skill",
    "description": "unsummon",
    "key": 3,
    "name": "Unsummon"
  },
  4: {
    "id": 4,
    "kind": "character.skill",
    "description": "left hand throw",
    "key": 4,
    "name": "Left Hand Throw"
  },
  5: {
    "id": 5,
    "kind": "character.skill",
    "description": "left hand swing",
    "key": 5,
    "name": "Left Hand Swing"
  },
  6: {
    "id": 6,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "magic arrow",
    "key": 6,
    "name": "Magic Arrow",
    "class": "Amazon"
  },
  7: {
    "id": 7,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "fire arrow",
    "key": 7,
    "name": "Fire Arrow",
    "class": "Amazon"
  },
  8: {
    "id": 8,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "inner sight",
    "key": 8,
    "name": "Inner Sight",
    "class": "Amazon"
  },
  9: {
    "id": 9,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "critical strike",
    "key": 9,
    "name": "Critical Strike",
    "class": "Amazon"
  },
  10: {
    "id": 10,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "jab",
    "key": 10,
    "name": "Jab",
    "class": "Amazon"
  },
  11: {
    "id": 11,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "cold arrow",
    "key": 11,
    "name": "Cold Arrow",
    "class": "Amazon"
  },
  12: {
    "id": 12,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "multiple shot",
    "key": 12,
    "name": "Multiple Shot",
    "class": "Amazon"
  },
  13: {
    "id": 13,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "dodge",
    "key": 13,
    "name": "Dodge",
    "class": "Amazon"
  },
  14: {
    "id": 14,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "power strike",
    "key": 14,
    "name": "Power Strike",
    "class": "Amazon"
  },
  15: {
    "id": 15,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "poison javelin",
    "key": 15,
    "name": "Poison Javelin",
    "class": "Amazon"
  },
  16: {
    "id": 16,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "exploding arrow",
    "key": 16,
    "name": "Exploding Arrow",
    "class": "Amazon"
  },
  17: {
    "id": 17,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "slow movement",
    "key": 17,
    "name": "Slow Movement",
    "class": "Amazon"
  },
  18: {
    "id": 18,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "avoid",
    "key": 18,
    "name": "Avoid",
    "class": "Amazon"
  },
  19: {
    "id": 19,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "jav mastery",
    "key": 19,
    "name": "Javelin and Spear Mastery",
    "class": "Amazon"
  },
  20: {
    "id": 20,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "lightning bolt",
    "key": 20,
    "name": "Lightning Bolt",
    "class": "Amazon"
  },
  21: {
    "id": 21,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "ice arrow",
    "key": 21,
    "name": "Ice Arrow",
    "class": "Amazon"
  },
  22: {
    "id": 22,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "guided arrow",
    "key": 22,
    "name": "Guided Arrow",
    "class": "Amazon"
  },
  23: {
    "id": 23,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "penetrate",
    "key": 23,
    "name": "Penetrate",
    "class": "Amazon"
  },
  24: {
    "id": 24,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "charged strike",
    "key": 24,
    "name": "Charged Strike",
    "class": "Amazon"
  },
  25: {
    "id": 25,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "plague javelin",
    "key": 25,
    "name": "Plague Javelin",
    "class": "Amazon"
  },
  26: {
    "id": 26,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "strafe",
    "key": 26,
    "name": "Strafe",
    "class": "Amazon"
  },
  27: {
    "id": 27,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "immolation arrow",
    "key": 27,
    "name": "Immolation Arrow",
    "class": "Amazon"
  },
  28: {
    "id": 28,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "dopplezonnew",
    "key": 28,
    "name": "Dopplezon",
    "class": "Amazon"
  },
  29: {
    "id": 29,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "evade",
    "key": 29,
    "name": "Evade",
    "class": "Amazon"
  },
  30: {
    "id": 30,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "fend",
    "key": 30,
    "name": "Fend",
    "class": "Amazon"
  },
  31: {
    "id": 31,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "freezing arrow",
    "key": 31,
    "name": "Freezing Arrow",
    "class": "Amazon"
  },
  32: {
    "id": 32,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "valkyrie",
    "key": 32,
    "name": "Valkyrie",
    "class": "Amazon"
  },
  33: {
    "id": 33,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "pierce",
    "key": 33,
    "name": "Pierce",
    "class": "Amazon"
  },
  34: {
    "id": 34,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "lightning strike",
    "key": 34,
    "name": "Lightning Strike",
    "class": "Amazon"
  },
  35: {
    "id": 35,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "lightning fury",
    "key": 35,
    "name": "Lightning Fury",
    "class": "Amazon"
  },
  36: {
    "id": 36,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "fire bolt",
    "key": 36,
    "name": "Fire Bolt",
    "class": "Sorceress"
  },
  37: {
    "id": 37,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "warmth",
    "key": 37,
    "name": "Warmth",
    "class": "Sorceress"
  },
  38: {
    "id": 38,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "charged bolt",
    "key": 38,
    "name": "Charged Bolt",
    "class": "Sorceress"
  },
  39: {
    "id": 39,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "ice bolt",
    "key": 39,
    "name": "Ice Bolt",
    "class": "Sorceress"
  },
  40: {
    "id": 40,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "cold enchant",
    "key": 40,
    "name": "Cold Enchant",
    "class": "Sorceress"
  },
  41: {
    "id": 41,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "inferno",
    "key": 41,
    "name": "Inferno",
    "class": "Sorceress"
  },
  42: {
    "id": 42,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "static field",
    "key": 42,
    "name": "Static Field",
    "class": "Sorceress"
  },
  43: {
    "id": 43,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "telekinesis",
    "key": 43,
    "name": "Telekinesis",
    "class": "Sorceress"
  },
  44: {
    "id": 44,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "frost nova",
    "key": 44,
    "name": "Frost Nova",
    "class": "Sorceress"
  },
  45: {
    "id": 45,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "ice blast",
    "key": 45,
    "name": "Ice Blast",
    "class": "Sorceress"
  },
  46: {
    "id": 46,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "blaze",
    "key": 46,
    "name": "Blaze",
    "class": "Sorceress"
  },
  47: {
    "id": 47,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "fire ball",
    "key": 47,
    "name": "Fire Ball",
    "class": "Sorceress"
  },
  48: {
    "id": 48,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "nova",
    "key": 48,
    "name": "Nova",
    "class": "Sorceress"
  },
  49: {
    "id": 49,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "lightning",
    "key": 49,
    "name": "Lightning",
    "class": "Sorceress"
  },
  50: {
    "id": 50,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "shiver armor",
    "key": 50,
    "name": "Shiver Armor",
    "class": "Sorceress"
  },
  51: {
    "id": 51,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "fire wall",
    "key": 51,
    "name": "Fire Wall",
    "class": "Sorceress"
  },
  52: {
    "id": 52,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "enchant",
    "key": 52,
    "name": "Enchant",
    "class": "Sorceress"
  },
  53: {
    "id": 53,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "chain lightning",
    "key": 53,
    "name": "Chain Lightning",
    "class": "Sorceress"
  },
  54: {
    "id": 54,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "teleport",
    "key": 54,
    "name": "Teleport",
    "class": "Sorceress"
  },
  55: {
    "id": 55,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "glacial spike",
    "key": 55,
    "name": "Glacial Spike",
    "class": "Sorceress"
  },
  56: {
    "id": 56,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "meteor",
    "key": 56,
    "name": "Meteor",
    "class": "Sorceress"
  },
  57: {
    "id": 57,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "thunder storm",
    "key": 57,
    "name": "Thunder Storm",
    "class": "Sorceress"
  },
  58: {
    "id": 58,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "energy shield",
    "key": 58,
    "name": "Energy Shield",
    "class": "Sorceress"
  },
  59: {
    "id": 59,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "blizzard",
    "key": 59,
    "name": "Blizzard",
    "class": "Sorceress"
  },
  60: {
    "id": 60,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "chilling armor",
    "key": 60,
    "name": "Chilling Armor",
    "class": "Sorceress"
  },
  61: {
    "id": 61,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "fire mastery",
    "key": 61,
    "name": "Fire Mastery",
    "class": "Sorceress"
  },
  62: {
    "id": 62,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "hydra",
    "key": 62,
    "name": "Hydra",
    "class": "Sorceress"
  },
  63: {
    "id": 63,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "lightning mastery",
    "key": 63,
    "name": "Lightning Mastery",
    "class": "Sorceress"
  },
  64: {
    "id": 64,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "frozen orb",
    "key": 64,
    "name": "Frozen Orb",
    "class": "Sorceress"
  },
  65: {
    "id": 65,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "cold mastery",
    "key": 65,
    "name": "Cold Mastery",
    "class": "Sorceress"
  },
  66: {
    "id": 66,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "amplify damage",
    "key": 66,
    "name": "AmpDmg",
    "class": "Necromancer"
  },
  67: {
    "id": 67,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "teeth",
    "key": 67,
    "name": "Teeth",
    "class": "Necromancer"
  },
  68: {
    "id": 68,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "bone armor",
    "key": 68,
    "name": "Bone Armor",
    "class": "Necromancer"
  },
  69: {
    "id": 69,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "skeleton mastery",
    "key": 69,
    "name": "Skeleton Mastery",
    "class": "Necromancer"
  },
  70: {
    "id": 70,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "raise skeleton",
    "key": 70,
    "name": "Raise Skeleton",
    "class": "Necromancer"
  },
  71: {
    "id": 71,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "dim vision",
    "key": 71,
    "name": "Dim Vision",
    "class": "Necromancer"
  },
  72: {
    "id": 72,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "weaken",
    "key": 72,
    "name": "Weaken",
    "class": "Necromancer"
  },
  73: {
    "id": 73,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "poison dagger",
    "key": 73,
    "name": "Poison Dagger",
    "class": "Necromancer"
  },
  74: {
    "id": 74,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "corpse explosion",
    "key": 74,
    "name": "Corpse Explosion",
    "class": "Necromancer"
  },
  75: {
    "id": 75,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "clay golem",
    "key": 75,
    "name": "Clay Golem",
    "class": "Necromancer"
  },
  76: {
    "id": 76,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "iron maiden",
    "key": 76,
    "name": "Iron Maiden",
    "class": "Necromancer"
  },
  77: {
    "id": 77,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "terror",
    "key": 77,
    "name": "Terror",
    "class": "Necromancer"
  },
  78: {
    "id": 78,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "bone wall",
    "key": 78,
    "name": "Bone Wall",
    "class": "Necromancer"
  },
  79: {
    "id": 79,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "golem mastery",
    "key": 79,
    "name": "Golem Mastery",
    "class": "Necromancer"
  },
  80: {
    "id": 80,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "raise skeletal mage",
    "key": 80,
    "name": "Raise Skeletal Mage",
    "class": "Necromancer"
  },
  81: {
    "id": 81,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "confuse",
    "key": 81,
    "name": "Confuse",
    "class": "Necromancer"
  },
  82: {
    "id": 82,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "life tap",
    "key": 82,
    "name": "Life Tap",
    "class": "Necromancer"
  },
  83: {
    "id": 83,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "desecrate",
    "key": 83,
    "name": "Desecrate",
    "class": "Necromancer"
  },
  84: {
    "id": 84,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "bone spear",
    "key": 84,
    "name": "Bone Spear",
    "class": "Necromancer"
  },
  85: {
    "id": 85,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "bloodgolem",
    "key": 85,
    "name": "BloodGolem",
    "class": "Necromancer"
  },
  86: {
    "id": 86,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "attract",
    "key": 86,
    "name": "Attract",
    "class": "Necromancer"
  },
  87: {
    "id": 87,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "decrepify",
    "key": 87,
    "name": "Decrepify",
    "class": "Necromancer"
  },
  88: {
    "id": 88,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "bone prison",
    "key": 88,
    "name": "Bone Prison",
    "class": "Necromancer"
  },
  89: {
    "id": 89,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "raise skeleton archer",
    "key": 89,
    "name": "Raise Skeleton Archer",
    "class": "Necromancer"
  },
  90: {
    "id": 90,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "irongolem",
    "key": 90,
    "name": "IronGolem",
    "class": "Necromancer"
  },
  91: {
    "id": 91,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "lower resist",
    "key": 91,
    "name": "LowRes",
    "class": "Necromancer"
  },
  92: {
    "id": 92,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "poison nova",
    "key": 92,
    "name": "Poison Nova",
    "class": "Necromancer"
  },
  93: {
    "id": 93,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "bone spirit",
    "key": 93,
    "name": "Bone Spirit",
    "class": "Necromancer"
  },
  94: {
    "id": 94,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "firegolem",
    "key": 94,
    "name": "FireGolem",
    "class": "Necromancer"
  },
  95: {
    "id": 95,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "revive",
    "key": 95,
    "name": "Revive",
    "class": "Necromancer"
  },
  96: {
    "id": 96,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "sacrifice",
    "key": 96,
    "name": "Sacrifice",
    "class": "Paladin"
  },
  97: {
    "id": 97,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "smite",
    "key": 97,
    "name": "Smite",
    "class": "Paladin"
  },
  98: {
    "id": 98,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "might",
    "key": 98,
    "name": "Might",
    "class": "Paladin"
  },
  99: {
    "id": 99,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "prayer",
    "key": 99,
    "name": "Prayer",
    "class": "Paladin"
  },
  100: {
    "id": 100,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "resist fire",
    "key": 100,
    "name": "Resist Fire",
    "class": "Paladin"
  },
  101: {
    "id": 101,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy bolt",
    "key": 101,
    "name": "Holy Bolt",
    "class": "Paladin"
  },
  102: {
    "id": 102,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy fire",
    "key": 102,
    "name": "Holy Fire",
    "class": "Paladin"
  },
  103: {
    "id": 103,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "thorns",
    "key": 103,
    "name": "Thorns",
    "class": "Paladin"
  },
  104: {
    "id": 104,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "defiance",
    "key": 104,
    "name": "Defiance",
    "class": "Paladin"
  },
  105: {
    "id": 105,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "resist cold",
    "key": 105,
    "name": "Resist Cold",
    "class": "Paladin"
  },
  106: {
    "id": 106,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "zeal",
    "key": 106,
    "name": "Zeal",
    "class": "Paladin"
  },
  107: {
    "id": 107,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "charge",
    "key": 107,
    "name": "Charge",
    "class": "Paladin"
  },
  108: {
    "id": 108,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "blessed aim",
    "key": 108,
    "name": "Blessed Aim",
    "class": "Paladin"
  },
  109: {
    "id": 109,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "cleansing",
    "key": 109,
    "name": "Cleansing",
    "class": "Paladin"
  },
  110: {
    "id": 110,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "resist lightning",
    "key": 110,
    "name": "Resist Lightning",
    "class": "Paladin"
  },
  111: {
    "id": 111,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "vengeance",
    "key": 111,
    "name": "Vengeance",
    "class": "Paladin"
  },
  112: {
    "id": 112,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "blessed hammer",
    "key": 112,
    "name": "Blessed Hammer",
    "class": "Paladin"
  },
  113: {
    "id": 113,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "concentration",
    "key": 113,
    "name": "Concentration",
    "class": "Paladin"
  },
  114: {
    "id": 114,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy freeze",
    "key": 114,
    "name": "Holy Freeze",
    "class": "Paladin"
  },
  115: {
    "id": 115,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "vigor",
    "key": 115,
    "name": "Vigor",
    "class": "Paladin"
  },
  116: {
    "id": 116,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy sword",
    "key": 116,
    "name": "Holy Sword",
    "class": "Paladin"
  },
  117: {
    "id": 117,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy shield",
    "key": 117,
    "name": "Holy Shield",
    "class": "Paladin"
  },
  118: {
    "id": 118,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy shock",
    "key": 118,
    "name": "Holy Shock",
    "class": "Paladin"
  },
  119: {
    "id": 119,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "sanctuary",
    "key": 119,
    "name": "Sanctuary",
    "class": "Paladin"
  },
  120: {
    "id": 120,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "meditation",
    "key": 120,
    "name": "Meditation",
    "class": "Paladin"
  },
  121: {
    "id": 121,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "fist of the heavens",
    "key": 121,
    "name": "Fist of the Heavens",
    "class": "Paladin"
  },
  122: {
    "id": 122,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "fanaticism",
    "key": 122,
    "name": "Fanaticism",
    "class": "Paladin"
  },
  123: {
    "id": 123,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "conviction",
    "key": 123,
    "name": "Conviction",
    "class": "Paladin"
  },
  124: {
    "id": 124,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "redemption",
    "key": 124,
    "name": "Redemption",
    "class": "Paladin"
  },
  125: {
    "id": 125,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "salvation",
    "key": 125,
    "name": "Salvation",
    "class": "Paladin"
  },
  126: {
    "id": 126,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "bash",
    "key": 126,
    "name": "Bash",
    "class": "Barbarian"
  },
  127: {
    "id": 127,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "sword mastery",
    "key": 127,
    "name": "Sword Mastery",
    "class": "Barbarian"
  },
  128: {
    "id": 128,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "general mastery",
    "key": 128,
    "name": "General Mastery",
    "class": "Barbarian"
  },
  129: {
    "id": 129,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "mace mastery",
    "key": 129,
    "name": "Mace Mastery",
    "class": "Barbarian"
  },
  130: {
    "id": 130,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "howl",
    "key": 130,
    "name": "Howl",
    "class": "Barbarian"
  },
  131: {
    "id": 131,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "find potion",
    "key": 131,
    "name": "Find Potion",
    "class": "Barbarian"
  },
  132: {
    "id": 132,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "leap",
    "key": 132,
    "name": "Leap",
    "class": "Barbarian"
  },
  133: {
    "id": 133,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "double swing",
    "key": 133,
    "name": "Double Swing",
    "class": "Barbarian"
  },
  134: {
    "id": 134,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "pole arm and spear mastery",
    "key": 134,
    "name": "Pole Arm and Spear Mastery",
    "class": "Barbarian"
  },
  135: {
    "id": 135,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "throwing mastery",
    "key": 135,
    "name": "Throwing Mastery",
    "class": "Barbarian"
  },
  136: {
    "id": 136,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "spear mastery",
    "key": 136,
    "name": "Spear Mastery",
    "class": "Barbarian"
  },
  137: {
    "id": 137,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "taunt",
    "key": 137,
    "name": "Taunt",
    "class": "Barbarian"
  },
  138: {
    "id": 138,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "shout",
    "key": 138,
    "name": "Shout",
    "class": "Barbarian"
  },
  139: {
    "id": 139,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "stun",
    "key": 139,
    "name": "Stun",
    "class": "Barbarian"
  },
  140: {
    "id": 140,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "double throw",
    "key": 140,
    "name": "Double Throw",
    "class": "Barbarian"
  },
  141: {
    "id": 141,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "combat reflexes",
    "key": 141,
    "name": "Combat Reflexes",
    "class": "Barbarian"
  },
  142: {
    "id": 142,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "find item",
    "key": 142,
    "name": "Find Item",
    "class": "Barbarian"
  },
  143: {
    "id": 143,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "leap attack",
    "key": 143,
    "name": "Leap Attack",
    "class": "Barbarian"
  },
  144: {
    "id": 144,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "concentrate",
    "key": 144,
    "name": "Concentrate",
    "class": "Barbarian"
  },
  145: {
    "id": 145,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "iron skin",
    "key": 145,
    "name": "Iron Skin",
    "class": "Barbarian"
  },
  146: {
    "id": 146,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "battle cry",
    "key": 146,
    "name": "Battle Cry",
    "class": "Barbarian"
  },
  147: {
    "id": 147,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "frenzy",
    "key": 147,
    "name": "Frenzy",
    "class": "Barbarian"
  },
  148: {
    "id": 148,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "increased speed",
    "key": 148,
    "name": "Increased Speed",
    "class": "Barbarian"
  },
  149: {
    "id": 149,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "battle orders",
    "key": 149,
    "name": "Battle Orders",
    "class": "Barbarian"
  },
  150: {
    "id": 150,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "grim ward",
    "key": 150,
    "name": "Grim Ward",
    "class": "Barbarian"
  },
  151: {
    "id": 151,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "whirlwind",
    "key": 151,
    "name": "Whirlwind",
    "class": "Barbarian"
  },
  152: {
    "id": 152,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "berserk",
    "key": 152,
    "name": "Berserk",
    "class": "Barbarian"
  },
  153: {
    "id": 153,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "natural resistance",
    "key": 153,
    "name": "Natural Resistance",
    "class": "Barbarian"
  },
  154: {
    "id": 154,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "war cry",
    "key": 154,
    "name": "War Cry",
    "class": "Barbarian"
  },
  155: {
    "id": 155,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "battle command",
    "key": 155,
    "name": "Battle Command",
    "class": "Barbarian"
  },
  156: {
    "id": 156,
    "kind": "character.skill",
    "description": "",
    "key": 156,
    "name": "Fire Hit"
  },
  157: {
    "id": 157,
    "kind": "character.skill",
    "description": "",
    "key": 157,
    "name": "UnHolyBolt"
  },
  158: {
    "id": 158,
    "kind": "character.skill",
    "description": "",
    "key": 158,
    "name": "SkeletonRaise"
  },
  159: {
    "id": 159,
    "kind": "character.skill",
    "description": "",
    "key": 159,
    "name": "MaggotEgg"
  },
  160: {
    "id": 160,
    "kind": "character.skill",
    "description": "",
    "key": 160,
    "name": "ShamanFire"
  },
  161: {
    "id": 161,
    "kind": "character.skill",
    "description": "",
    "key": 161,
    "name": "MagottUp"
  },
  162: {
    "id": 162,
    "kind": "character.skill",
    "description": "",
    "key": 162,
    "name": "MagottDown"
  },
  163: {
    "id": 163,
    "kind": "character.skill",
    "description": "",
    "key": 163,
    "name": "MagottLay"
  },
  164: {
    "id": 164,
    "kind": "character.skill",
    "description": "",
    "key": 164,
    "name": "AndrialSpray"
  },
  165: {
    "id": 165,
    "kind": "character.skill",
    "description": "",
    "key": 165,
    "name": "Jump"
  },
  166: {
    "id": 166,
    "kind": "character.skill",
    "description": "",
    "key": 166,
    "name": "Swarm Move"
  },
  167: {
    "id": 167,
    "kind": "character.skill",
    "description": "",
    "key": 167,
    "name": "Nest"
  },
  168: {
    "id": 168,
    "kind": "character.skill",
    "description": "",
    "key": 168,
    "name": "Quick Strike"
  },
  169: {
    "id": 169,
    "kind": "character.skill",
    "description": "",
    "key": 169,
    "name": "VampireFireball"
  },
  170: {
    "id": 170,
    "kind": "character.skill",
    "description": "",
    "key": 170,
    "name": "VampireFirewall"
  },
  171: {
    "id": 171,
    "kind": "character.skill",
    "description": "meteor",
    "key": 171,
    "name": "VampireMeteor"
  },
  172: {
    "id": 172,
    "kind": "character.skill",
    "description": "",
    "key": 172,
    "name": "GargoyleTrap"
  },
  173: {
    "id": 173,
    "kind": "character.skill",
    "description": "",
    "key": 173,
    "name": "SpiderLay"
  },
  174: {
    "id": 174,
    "kind": "character.skill",
    "description": "",
    "key": 174,
    "name": "VampireHeal"
  },
  175: {
    "id": 175,
    "kind": "character.skill",
    "description": "",
    "key": 175,
    "name": "VampireRaise"
  },
  176: {
    "id": 176,
    "kind": "character.skill",
    "description": "",
    "key": 176,
    "name": "Submerge"
  },
  177: {
    "id": 177,
    "kind": "character.skill",
    "description": "",
    "key": 177,
    "name": "FetishAura"
  },
  178: {
    "id": 178,
    "kind": "character.skill",
    "description": "",
    "key": 178,
    "name": "FetishInferno"
  },
  179: {
    "id": 179,
    "kind": "character.skill",
    "description": "",
    "key": 179,
    "name": "ZakarumHeal"
  },
  180: {
    "id": 180,
    "kind": "character.skill",
    "description": "",
    "key": 180,
    "name": "Emerge"
  },
  181: {
    "id": 181,
    "kind": "character.skill",
    "description": "",
    "key": 181,
    "name": "Resurrect"
  },
  182: {
    "id": 182,
    "kind": "character.skill",
    "description": "",
    "key": 182,
    "name": "Bestow"
  },
  183: {
    "id": 183,
    "kind": "character.skill",
    "description": "",
    "key": 183,
    "name": "MissileSkill1"
  },
  184: {
    "id": 184,
    "kind": "character.skill",
    "description": "",
    "key": 184,
    "name": "MonTeleport"
  },
  185: {
    "id": 185,
    "kind": "character.skill",
    "description": "",
    "key": 185,
    "name": "PrimeLightning"
  },
  186: {
    "id": 186,
    "kind": "character.skill",
    "description": "",
    "key": 186,
    "name": "PrimeBolt"
  },
  187: {
    "id": 187,
    "kind": "character.skill",
    "description": "",
    "key": 187,
    "name": "PrimeBlaze"
  },
  188: {
    "id": 188,
    "kind": "character.skill",
    "description": "",
    "key": 188,
    "name": "PrimeFirewall"
  },
  189: {
    "id": 189,
    "kind": "character.skill",
    "description": "",
    "key": 189,
    "name": "PrimeSpike"
  },
  190: {
    "id": 190,
    "kind": "character.skill",
    "description": "",
    "key": 190,
    "name": "PrimeIceNova"
  },
  191: {
    "id": 191,
    "kind": "character.skill",
    "description": "",
    "key": 191,
    "name": "PrimePoisonball"
  },
  192: {
    "id": 192,
    "kind": "character.skill",
    "description": "",
    "key": 192,
    "name": "PrimePoisonNova"
  },
  193: {
    "id": 193,
    "kind": "character.skill",
    "description": "",
    "key": 193,
    "name": "DiabLight"
  },
  194: {
    "id": 194,
    "kind": "character.skill",
    "description": "",
    "key": 194,
    "name": "DiabCold"
  },
  195: {
    "id": 195,
    "kind": "character.skill",
    "description": "",
    "key": 195,
    "name": "DiabFire"
  },
  196: {
    "id": 196,
    "kind": "character.skill",
    "description": "",
    "key": 196,
    "name": "FingerMageSpider"
  },
  197: {
    "id": 197,
    "kind": "character.skill",
    "description": "",
    "key": 197,
    "name": "DiabWall"
  },
  198: {
    "id": 198,
    "kind": "character.skill",
    "description": "",
    "key": 198,
    "name": "DiabRun"
  },
  199: {
    "id": 199,
    "kind": "character.skill",
    "description": "",
    "key": 199,
    "name": "DiabPrison"
  },
  200: {
    "id": 200,
    "kind": "character.skill",
    "description": "",
    "key": 200,
    "name": "PoisonBallTrap"
  },
  201: {
    "id": 201,
    "kind": "character.skill",
    "description": "",
    "key": 201,
    "name": "AndyPoisonBolt"
  },
  202: {
    "id": 202,
    "kind": "character.skill",
    "description": "",
    "key": 202,
    "name": "HireableMissile"
  },
  203: {
    "id": 203,
    "kind": "character.skill",
    "description": "",
    "key": 203,
    "name": "DesertTurret"
  },
  204: {
    "id": 204,
    "kind": "character.skill",
    "description": "",
    "key": 204,
    "name": "ArcaneTower"
  },
  205: {
    "id": 205,
    "kind": "character.skill",
    "description": "",
    "key": 205,
    "name": "MonBlizzard"
  },
  206: {
    "id": 206,
    "kind": "character.skill",
    "description": "",
    "key": 206,
    "name": "Mosquito"
  },
  207: {
    "id": 207,
    "kind": "character.skill",
    "description": "",
    "key": 207,
    "name": "CursedBallTrapRight"
  },
  208: {
    "id": 208,
    "kind": "character.skill",
    "description": "",
    "key": 208,
    "name": "CursedBallTrapLeft"
  },
  209: {
    "id": 209,
    "kind": "character.skill",
    "description": "",
    "key": 209,
    "name": "MonFrozenArmor"
  },
  210: {
    "id": 210,
    "kind": "character.skill",
    "description": "",
    "key": 210,
    "name": "MonBoneArmor"
  },
  211: {
    "id": 211,
    "kind": "character.skill",
    "description": "",
    "key": 211,
    "name": "MonBoneSpirit"
  },
  212: {
    "id": 212,
    "kind": "character.skill",
    "description": "",
    "key": 212,
    "name": "MonCurseCast"
  },
  213: {
    "id": 213,
    "kind": "character.skill",
    "description": "",
    "key": 213,
    "name": "HellMeteor"
  },
  214: {
    "id": 214,
    "kind": "character.skill",
    "description": "",
    "key": 214,
    "name": "RegurgitatorEat"
  },
  215: {
    "id": 215,
    "kind": "character.skill",
    "description": "",
    "key": 215,
    "name": "MonFrenzy"
  },
  216: {
    "id": 216,
    "kind": "character.skill",
    "description": "",
    "key": 216,
    "name": "QueenDeath"
  },
  217: {
    "id": 217,
    "kind": "character.skill",
    "description": "scroll of identify",
    "key": 217,
    "name": "Scroll of Identify"
  },
  218: {
    "id": 218,
    "kind": "character.skill",
    "description": "book of identify",
    "key": 218,
    "name": "Book of Identify"
  },
  219: {
    "id": 219,
    "kind": "character.skill",
    "description": "scroll of townportal",
    "key": 219,
    "name": "Scroll of Townportal"
  },
  220: {
    "id": 220,
    "kind": "character.skill",
    "description": "book of townportal",
    "key": 220,
    "name": "Book of Townportal"
  },
  221: {
    "id": 221,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "raven",
    "key": 221,
    "name": "Raven",
    "class": "Druid"
  },
  222: {
    "id": 222,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "plague poppy",
    "key": 222,
    "name": "Plague Poppy",
    "class": "Druid"
  },
  223: {
    "id": 223,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "wearwolf",
    "key": 223,
    "name": "Wearwolf",
    "class": "Druid"
  },
  224: {
    "id": 224,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "shape shifting",
    "key": 224,
    "name": "Shape Shifting",
    "class": "Druid"
  },
  225: {
    "id": 225,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "firestorm",
    "key": 225,
    "name": "Firestorm",
    "class": "Druid"
  },
  226: {
    "id": 226,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "oak sage",
    "key": 226,
    "name": "Oak Sage",
    "class": "Druid"
  },
  227: {
    "id": 227,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "summon spirit wolf",
    "key": 227,
    "name": "Summon Spirit Wolf",
    "class": "Druid"
  },
  228: {
    "id": 228,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "wearbear",
    "key": 228,
    "name": "Wearbear",
    "class": "Druid"
  },
  229: {
    "id": 229,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "molten boulder",
    "key": 229,
    "name": "Molten Boulder",
    "class": "Druid"
  },
  230: {
    "id": 230,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "arctic blast",
    "key": 230,
    "name": "Arctic Blast",
    "class": "Druid"
  },
  231: {
    "id": 231,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "cycle of life",
    "key": 231,
    "name": "Cycle of Life",
    "class": "Druid"
  },
  232: {
    "id": 232,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "feral rage",
    "key": 232,
    "name": "Feral Rage",
    "class": "Druid"
  },
  233: {
    "id": 233,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "maul",
    "key": 233,
    "name": "Maul",
    "class": "Druid"
  },
  234: {
    "id": 234,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "eruption",
    "key": 234,
    "name": "Eruption",
    "class": "Druid"
  },
  235: {
    "id": 235,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "cyclone armor",
    "key": 235,
    "name": "Cyclone Armor",
    "class": "Druid"
  },
  236: {
    "id": 236,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "heart of wolverine",
    "key": 236,
    "name": "Heart of Wolverine",
    "class": "Druid"
  },
  237: {
    "id": 237,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "summon fenris",
    "key": 237,
    "name": "Summon Fenris",
    "class": "Druid"
  },
  238: {
    "id": 238,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "rabies",
    "key": 238,
    "name": "Rabies",
    "class": "Druid"
  },
  239: {
    "id": 239,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "fire claws",
    "key": 239,
    "name": "Fire Claws",
    "class": "Druid"
  },
  240: {
    "id": 240,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "twister",
    "key": 240,
    "name": "Twister",
    "class": "Druid"
  },
  241: {
    "id": 241,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "vines",
    "key": 241,
    "name": "Vines",
    "class": "Druid"
  },
  242: {
    "id": 242,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "hunger",
    "key": 242,
    "name": "Hunger",
    "class": "Druid"
  },
  243: {
    "id": 243,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "shock wave",
    "key": 243,
    "name": "Shock Wave",
    "class": "Druid"
  },
  244: {
    "id": 244,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "volcano",
    "key": 244,
    "name": "Volcano",
    "class": "Druid"
  },
  245: {
    "id": 245,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "tornado",
    "key": 245,
    "name": "Tornado",
    "class": "Druid"
  },
  246: {
    "id": 246,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "spirit of barbs",
    "key": 246,
    "name": "Spirit of Barbs",
    "class": "Druid"
  },
  247: {
    "id": 247,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "summon grizzly",
    "key": 247,
    "name": "Summon Grizzly",
    "class": "Druid"
  },
  248: {
    "id": 248,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "fury",
    "key": 248,
    "name": "Fury",
    "class": "Druid"
  },
  249: {
    "id": 249,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "armageddon",
    "key": 249,
    "name": "Armageddon",
    "class": "Druid"
  },
  250: {
    "id": 250,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "hurricane",
    "key": 250,
    "name": "Hurricane",
    "class": "Druid"
  },
  251: {
    "id": 251,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "fire trauma",
    "key": 251,
    "name": "Fire Trauma",
    "class": "Assassin"
  },
  252: {
    "id": 252,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "claw mastery",
    "key": 252,
    "name": "Claw Mastery",
    "class": "Assassin"
  },
  253: {
    "id": 253,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "psychic hammer",
    "key": 253,
    "name": "Psychic Hammer",
    "class": "Assassin"
  },
  254: {
    "id": 254,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "tiger strike",
    "key": 254,
    "name": "Tiger Strike",
    "class": "Assassin"
  },
  255: {
    "id": 255,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "dragon talon",
    "key": 255,
    "name": "Dragon Talon",
    "class": "Assassin"
  },
  256: {
    "id": 256,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "shock field",
    "key": 256,
    "name": "Shock Field",
    "class": "Assassin"
  },
  257: {
    "id": 257,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "blade sentinel",
    "key": 257,
    "name": "Blade Sentinel",
    "class": "Assassin"
  },
  258: {
    "id": 258,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "quickness",
    "key": 258,
    "name": "Quickness",
    "class": "Assassin"
  },
  259: {
    "id": 259,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "fists of fire",
    "key": 259,
    "name": "Fists of Fire",
    "class": "Assassin"
  },
  260: {
    "id": 260,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "dragon claw",
    "key": 260,
    "name": "Dragon Claw",
    "class": "Assassin"
  },
  261: {
    "id": 261,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "charged bolt sentry",
    "key": 261,
    "name": "Charged Bolt Sentry",
    "class": "Assassin"
  },
  262: {
    "id": 262,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "wake of fire sentry",
    "key": 262,
    "name": "Wake of Fire Sentry",
    "class": "Assassin"
  },
  263: {
    "id": 263,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "weapon block",
    "key": 263,
    "name": "Weapon Block",
    "class": "Assassin"
  },
  264: {
    "id": 264,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "cloak of shadows",
    "key": 264,
    "name": "Cloak of Shadows",
    "class": "Assassin"
  },
  265: {
    "id": 265,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "cobra strike",
    "key": 265,
    "name": "Cobra Strike",
    "class": "Assassin"
  },
  266: {
    "id": 266,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "blade fury",
    "key": 266,
    "name": "Blade Fury",
    "class": "Assassin"
  },
  267: {
    "id": 267,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "fade",
    "key": 267,
    "name": "Fade",
    "class": "Assassin"
  },
  268: {
    "id": 268,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "shadow warrior",
    "key": 268,
    "name": "Shadow Warrior",
    "class": "Assassin"
  },
  269: {
    "id": 269,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "claws of thunder",
    "key": 269,
    "name": "Claws of Thunder",
    "class": "Assassin"
  },
  270: {
    "id": 270,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "dragon tail",
    "key": 270,
    "name": "Dragon Tail",
    "class": "Assassin"
  },
  271: {
    "id": 271,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "chain lightning sentry",
    "key": 271,
    "name": "Chain Lightning Sentry",
    "class": "Assassin"
  },
  272: {
    "id": 272,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "inferno sentry",
    "key": 272,
    "name": "Inferno Sentry",
    "class": "Assassin"
  },
  273: {
    "id": 273,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "mind blast",
    "key": 273,
    "name": "Mind Blast",
    "class": "Assassin"
  },
  274: {
    "id": 274,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "blades of ice",
    "key": 274,
    "name": "Blades of Ice",
    "class": "Assassin"
  },
  275: {
    "id": 275,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "dragon flight",
    "key": 275,
    "name": "Dragon Flight",
    "class": "Assassin"
  },
  276: {
    "id": 276,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "death sentry",
    "key": 276,
    "name": "Death Sentry",
    "class": "Assassin"
  },
  277: {
    "id": 277,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "blade shield",
    "key": 277,
    "name": "Blade Shield",
    "class": "Assassin"
  },
  278: {
    "id": 278,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "venom",
    "key": 278,
    "name": "Venom",
    "class": "Assassin"
  },
  279: {
    "id": 279,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "shadow master",
    "key": 279,
    "name": "Shadow Master",
    "class": "Assassin"
  },
  280: {
    "id": 280,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "royal strike",
    "key": 280,
    "name": "Royal Strike",
    "class": "Assassin"
  },
  281: {
    "id": 281,
    "kind": "character.skill",
    "description": "",
    "key": 281,
    "name": "Wake Of Destruction Sentry"
  },
  282: {
    "id": 282,
    "kind": "character.skill",
    "description": "",
    "key": 282,
    "name": "Imp Inferno"
  },
  283: {
    "id": 283,
    "kind": "character.skill",
    "description": "",
    "key": 283,
    "name": "Imp Fireball"
  },
  284: {
    "id": 284,
    "kind": "character.skill",
    "description": "",
    "key": 284,
    "name": "Baal Taunt"
  },
  285: {
    "id": 285,
    "kind": "character.skill",
    "description": "",
    "key": 285,
    "name": "Baal Corpse Explode"
  },
  286: {
    "id": 286,
    "kind": "character.skill",
    "description": "",
    "key": 286,
    "name": "Baal Monster Spawn"
  },
  287: {
    "id": 287,
    "kind": "character.skill",
    "description": "",
    "key": 287,
    "name": "Catapult Charged Ball"
  },
  288: {
    "id": 288,
    "kind": "character.skill",
    "description": "",
    "key": 288,
    "name": "Catapult Spike Ball"
  },
  289: {
    "id": 289,
    "kind": "character.skill",
    "description": "",
    "key": 289,
    "name": "Suck Blood"
  },
  290: {
    "id": 290,
    "kind": "character.skill",
    "description": "",
    "key": 290,
    "name": "Cry Help"
  },
  291: {
    "id": 291,
    "kind": "character.skill",
    "description": "",
    "key": 291,
    "name": "Healing Vortex"
  },
  292: {
    "id": 292,
    "kind": "character.skill",
    "description": "",
    "key": 292,
    "name": "Teleport 2"
  },
  293: {
    "id": 293,
    "kind": "character.skill",
    "description": "",
    "key": 293,
    "name": "Self-resurrect"
  },
  294: {
    "id": 294,
    "kind": "character.skill",
    "description": "",
    "key": 294,
    "name": "Vine Attack"
  },
  295: {
    "id": 295,
    "kind": "character.skill",
    "description": "",
    "key": 295,
    "name": "Overseer Whip"
  },
  296: {
    "id": 296,
    "kind": "character.skill",
    "description": "",
    "key": 296,
    "name": "Barbs Aura"
  },
  297: {
    "id": 297,
    "kind": "character.skill",
    "description": "",
    "key": 297,
    "name": "Wolverine Aura"
  },
  298: {
    "id": 298,
    "kind": "character.skill",
    "description": "",
    "key": 298,
    "name": "Oak Sage Aura"
  },
  299: {
    "id": 299,
    "kind": "character.skill",
    "description": "",
    "key": 299,
    "name": "Imp Fire Missile"
  },
  300: {
    "id": 300,
    "kind": "character.skill",
    "description": "",
    "key": 300,
    "name": "Impregnate"
  },
  301: {
    "id": 301,
    "kind": "character.skill",
    "description": "",
    "key": 301,
    "name": "Siege Beast Stomp"
  },
  302: {
    "id": 302,
    "kind": "character.skill",
    "description": "",
    "key": 302,
    "name": "MinionSpawner"
  },
  303: {
    "id": 303,
    "kind": "character.skill",
    "description": "",
    "key": 303,
    "name": "CatapultBlizzard"
  },
  304: {
    "id": 304,
    "kind": "character.skill",
    "description": "",
    "key": 304,
    "name": "CatapultPlague"
  },
  305: {
    "id": 305,
    "kind": "character.skill",
    "description": "",
    "key": 305,
    "name": "CatapultMeteor"
  },
  306: {
    "id": 306,
    "kind": "character.skill",
    "description": "",
    "key": 306,
    "name": "BoltSentry"
  },
  307: {
    "id": 307,
    "kind": "character.skill",
    "description": "",
    "key": 307,
    "name": "CorpseCycler"
  },
  308: {
    "id": 308,
    "kind": "character.skill",
    "description": "",
    "key": 308,
    "name": "DeathMaul"
  },
  309: {
    "id": 309,
    "kind": "character.skill",
    "description": "",
    "key": 309,
    "name": "Defense Curse"
  },
  310: {
    "id": 310,
    "kind": "character.skill",
    "description": "",
    "key": 310,
    "name": "Blood Mana"
  },
  311: {
    "id": 311,
    "kind": "character.skill",
    "description": "",
    "key": 311,
    "name": "mon inferno sentry"
  },
  312: {
    "id": 312,
    "kind": "character.skill",
    "description": "",
    "key": 312,
    "name": "mon death sentry"
  },
  313: {
    "id": 313,
    "kind": "character.skill",
    "description": "",
    "key": 313,
    "name": "Sentry Chain Lightning"
  },
  314: {
    "id": 314,
    "kind": "character.skill",
    "description": "",
    "key": 314,
    "name": "fenris rage"
  },
  315: {
    "id": 315,
    "kind": "character.skill",
    "description": "",
    "key": 315,
    "name": "Baal Tentacle"
  },
  316: {
    "id": 316,
    "kind": "character.skill",
    "description": "",
    "key": 316,
    "name": "Baal Nova"
  },
  317: {
    "id": 317,
    "kind": "character.skill",
    "description": "",
    "key": 317,
    "name": "Baal Inferno"
  },
  318: {
    "id": 318,
    "kind": "character.skill",
    "description": "",
    "key": 318,
    "name": "Baal Cold Missiles"
  },
  319: {
    "id": 319,
    "kind": "character.skill",
    "description": "",
    "key": 319,
    "name": "MegademonInferno"
  },
  320: {
    "id": 320,
    "kind": "character.skill",
    "description": "",
    "key": 320,
    "name": "EvilHutSpawner"
  },
  321: {
    "id": 321,
    "kind": "character.skill",
    "description": "",
    "key": 321,
    "name": "CountessFirewall"
  },
  322: {
    "id": 322,
    "kind": "character.skill",
    "description": "",
    "key": 322,
    "name": "ImpBolt"
  },
  323: {
    "id": 323,
    "kind": "character.skill",
    "description": "",
    "key": 323,
    "name": "Horror Arctic Blast"
  },
  324: {
    "id": 324,
    "kind": "character.skill",
    "description": "",
    "key": 324,
    "name": "death sentry ltng"
  },
  325: {
    "id": 325,
    "kind": "character.skill",
    "description": "",
    "key": 325,
    "name": "VineCycler"
  },
  326: {
    "id": 326,
    "kind": "character.skill",
    "description": "",
    "key": 326,
    "name": "BearSmite"
  },
  327: {
    "id": 327,
    "kind": "character.skill",
    "description": "",
    "key": 327,
    "name": "Resurrect2"
  },
  328: {
    "id": 328,
    "kind": "character.skill",
    "description": "",
    "key": 328,
    "name": "BloodLordFrenzy"
  },
  329: {
    "id": 329,
    "kind": "character.skill",
    "description": "",
    "key": 329,
    "name": "Baal Teleport"
  },
  330: {
    "id": 330,
    "kind": "character.skill",
    "description": "",
    "key": 330,
    "name": "Imp Teleport"
  },
  331: {
    "id": 331,
    "kind": "character.skill",
    "description": "",
    "key": 331,
    "name": "Baal Clone Teleport"
  },
  332: {
    "id": 332,
    "kind": "character.skill",
    "description": "",
    "key": 332,
    "name": "ZakarumLightning"
  },
  333: {
    "id": 333,
    "kind": "character.skill",
    "description": "",
    "key": 333,
    "name": "VampireMissile"
  },
  334: {
    "id": 334,
    "kind": "character.skill",
    "description": "",
    "key": 334,
    "name": "MephistoMissile"
  },
  335: {
    "id": 335,
    "kind": "character.skill",
    "description": "",
    "key": 335,
    "name": "DoomKnightMissile"
  },
  336: {
    "id": 336,
    "kind": "character.skill",
    "description": "",
    "key": 336,
    "name": "RogueMissile"
  },
  337: {
    "id": 337,
    "kind": "character.skill",
    "description": "",
    "key": 337,
    "name": "HydraMissile"
  },
  338: {
    "id": 338,
    "kind": "character.skill",
    "description": "",
    "key": 338,
    "name": "NecromageMissile"
  },
  339: {
    "id": 339,
    "kind": "character.skill",
    "description": "",
    "key": 339,
    "name": "MonBow"
  },
  340: {
    "id": 340,
    "kind": "character.skill",
    "description": "",
    "key": 340,
    "name": "MonFireArrow"
  },
  341: {
    "id": 341,
    "kind": "character.skill",
    "description": "",
    "key": 341,
    "name": "MonColdArrow"
  },
  342: {
    "id": 342,
    "kind": "character.skill",
    "description": "",
    "key": 342,
    "name": "MonExplodingArrow"
  },
  343: {
    "id": 343,
    "kind": "character.skill",
    "description": "",
    "key": 343,
    "name": "MonFreezingArrow"
  },
  344: {
    "id": 344,
    "kind": "character.skill",
    "description": "",
    "key": 344,
    "name": "MonPowerStrike"
  },
  345: {
    "id": 345,
    "kind": "character.skill",
    "description": "",
    "key": 345,
    "name": "SuccubusBolt"
  },
  346: {
    "id": 346,
    "kind": "character.skill",
    "description": "",
    "key": 346,
    "name": "MephFrostNova"
  },
  347: {
    "id": 347,
    "kind": "character.skill",
    "description": "",
    "key": 347,
    "name": "MonIceSpear"
  },
  348: {
    "id": 348,
    "kind": "character.skill",
    "description": "",
    "key": 348,
    "name": "ShamanIce"
  },
  349: {
    "id": 349,
    "kind": "character.skill",
    "description": "",
    "key": 349,
    "name": "Diablogeddon"
  },
  350: {
    "id": 350,
    "kind": "character.skill",
    "description": "delerium change",
    "key": 350,
    "name": "Delerium Change"
  },
  351: {
    "id": 351,
    "kind": "character.skill",
    "description": "",
    "key": 351,
    "name": "NihlathakCorpseExplosion"
  },
  352: {
    "id": 352,
    "kind": "character.skill",
    "description": "",
    "key": 352,
    "name": "SerpentCharge"
  },
  353: {
    "id": 353,
    "kind": "character.skill",
    "description": "",
    "key": 353,
    "name": "Trap Nova"
  },
  354: {
    "id": 354,
    "kind": "character.skill",
    "description": "",
    "key": 354,
    "name": "UnHolyBoltEx"
  },
  355: {
    "id": 355,
    "kind": "character.skill",
    "description": "",
    "key": 355,
    "name": "ShamanFireEx"
  },
  356: {
    "id": 356,
    "kind": "character.skill",
    "description": "",
    "key": 356,
    "name": "Imp Fire Missile Ex"
  },
  357: {
    "id": 357,
    "kind": "character.skill",
    "description": "blink",
    "key": 357,
    "name": "Blink"
  },
  358: {
    "id": 358,
    "kind": "character.skill",
    "description": "proc skill (special, melee splash)",
    "key": 358,
    "name": "proc_SplashDamage"
  },
  359: {
    "id": 359,
    "kind": "character.skill",
    "description": "",
    "key": 359,
    "name": "RoguePierce"
  },
  360: {
    "id": 360,
    "kind": "character.skill",
    "description": "battle orders",
    "key": 360,
    "name": "BattleOrdersCTA"
  },
  361: {
    "id": 361,
    "kind": "character.skill",
    "description": "",
    "key": 361,
    "name": "ExtraDrop"
  },
  362: {
    "id": 362,
    "kind": "character.skill",
    "description": "immolation arrow",
    "key": 362,
    "name": "BloodRavenImmo"
  },
  363: {
    "id": 363,
    "kind": "character.skill",
    "description": "",
    "key": 363,
    "name": "DollMeteor"
  },
  364: {
    "id": 364,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy nova",
    "key": 364,
    "name": "Holy Nova",
    "class": "Paladin"
  },
  365: {
    "id": 365,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "shattering arrow",
    "key": 365,
    "name": "Shattering Arrow",
    "class": "Amazon"
  },
  366: {
    "id": 366,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "lightning sentry",
    "key": 366,
    "name": "Lightning Sentry",
    "class": "Assassin"
  },
  367: {
    "id": 367,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "blood warp",
    "key": 367,
    "name": "Blood Warp",
    "class": "Necromancer"
  },
  368: {
    "id": 368,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "Deep Wounds",
    "key": 368,
    "name": "Deep Wounds",
    "class": "Barbarian"
  },
  369: {
    "id": 369,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "ice barrage",
    "key": 369,
    "name": "Ice Barrage",
    "class": "Sorceress"
  },
  370: {
    "id": 370,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "gust",
    "key": 370,
    "name": "Gust",
    "class": "Druid"
  },
  371: {
    "id": 371,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "holy light",
    "key": 371,
    "name": "Holy Light",
    "class": "Paladin"
  },
  372: {
    "id": 372,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "attack",
    "key": 372,
    "name": "amatemp2",
    "class": "Amazon"
  },
  373: {
    "id": 373,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "attack",
    "key": 373,
    "name": "asatemp2",
    "class": "Assassin"
  },
  374: {
    "id": 374,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "curse mastery",
    "key": 374,
    "name": "CurMas",
    "class": "Necromancer"
  },
  375: {
    "id": 375,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "attack",
    "key": 375,
    "name": "bartemp2",
    "class": "Barbarian"
  },
  376: {
    "id": 376,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "combustion",
    "key": 376,
    "name": "Combustion",
    "class": "Sorceress"
  },
  377: {
    "id": 377,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "attack",
    "key": 377,
    "name": "drutemp2",
    "class": "Druid"
  },
  378: {
    "id": 378,
    "kind": "character.skill",
    "class_code": "pal",
    "description": "joust",
    "key": 378,
    "name": "Joust",
    "class": "Paladin"
  },
  379: {
    "id": 379,
    "kind": "character.skill",
    "class_code": "ama",
    "description": "attack",
    "key": 379,
    "name": "amatemp3",
    "class": "Amazon"
  },
  380: {
    "id": 380,
    "kind": "character.skill",
    "class_code": "ass",
    "description": "blade dance",
    "key": 380,
    "name": "Blade Dance",
    "class": "Assassin"
  },
  381: {
    "id": 381,
    "kind": "character.skill",
    "class_code": "nec",
    "description": "dark pact",
    "key": 381,
    "name": "Dark Pact",
    "class": "Necromancer"
  },
  382: {
    "id": 382,
    "kind": "character.skill",
    "class_code": "bar",
    "description": "attack",
    "key": 382,
    "name": "bartemp3",
    "class": "Barbarian"
  },
  383: {
    "id": 383,
    "kind": "character.skill",
    "class_code": "sor",
    "description": "lesser hydra",
    "key": 383,
    "name": "Lesser Hydra",
    "class": "Sorceress"
  },
  384: {
    "id": 384,
    "kind": "character.skill",
    "description": "hurricane",
    "key": 384,
    "name": "HurricaneTortureBoss"
  },
  385: {
    "id": 385,
    "kind": "character.skill",
    "description": "fire arrow",
    "key": 385,
    "name": "Merc Fire Arrow"
  },
  386: {
    "id": 386,
    "kind": "character.skill",
    "description": "cold arrow",
    "key": 386,
    "name": "Merc Cold Arrow"
  },
  387: {
    "id": 387,
    "kind": "character.skill",
    "description": "",
    "key": 387,
    "name": "Raven Splash"
  },
  388: {
    "id": 388,
    "kind": "character.skill",
    "description": "Vampire Form",
    "key": 388,
    "name": "Vampire Form"
  },
  389: {
    "id": 389,
    "kind": "character.skill",
    "description": "",
    "key": 389,
    "name": "Golem Splash"
  },
  390: {
    "id": 390,
    "kind": "character.skill",
    "description": "",
    "key": 390,
    "name": "KanemithBossBlaze"
  },
  391: {
    "id": 391,
    "kind": "character.skill",
    "description": "lesser fade",
    "key": 391,
    "name": "Lesser Fade"
  },
  392: {
    "id": 392,
    "kind": "character.skill",
    "description": "",
    "key": 392,
    "name": "Sentry Lightning"
  },
  393: {
    "id": 393,
    "kind": "character.skill",
    "description": "proc skill (special, melee splash)",
    "key": 393,
    "name": "Skeleton Splash"
  },
  394: {
    "id": 394,
    "kind": "character.skill",
    "description": "force move",
    "key": 394,
    "name": "Force Move"
  },
  395: {
    "id": 395,
    "kind": "character.skill",
    "description": "",
    "key": 395,
    "name": "Immune Aura"
  },
  396: {
    "id": 396,
    "kind": "character.skill",
    "description": "",
    "key": 396,
    "name": "Immune Passive"
  },
  397: {
    "id": 397,
    "kind": "character.skill",
    "description": "",
    "key": 397,
    "name": "MegademonInfernoBoss"
  },
  398: {
    "id": 398,
    "kind": "character.skill",
    "description": "",
    "key": 398,
    "name": "MegademonBlazeBoss"
  },
  399: {
    "id": 399,
    "kind": "character.skill",
    "description": "",
    "key": 399,
    "name": "MegademonArmaBoss"
  },
  400: {
    "id": 400,
    "kind": "character.skill",
    "description": "FingermageBossNova",
    "key": 400,
    "name": "FingermageBossNova"
  },
  401: {
    "id": 401,
    "kind": "character.skill",
    "description": "",
    "key": 401,
    "name": "FingermageBossDiabWall"
  },
  402: {
    "id": 402,
    "kind": "character.skill",
    "description": "",
    "key": 402,
    "name": "FingermageBossShockWave"
  },
  403: {
    "id": 403,
    "kind": "character.skill",
    "description": "",
    "key": 403,
    "name": "CantorBossEruption"
  },
  404: {
    "id": 404,
    "kind": "character.skill",
    "description": "",
    "key": 404,
    "name": "CantorBossTornado"
  },
  405: {
    "id": 405,
    "kind": "character.skill",
    "description": "",
    "key": 405,
    "name": "UnravelerBossMultiShot"
  },
  406: {
    "id": 406,
    "kind": "character.skill",
    "description": "",
    "key": 406,
    "name": "UnravelerBossBuff"
  },
  407: {
    "id": 407,
    "kind": "character.skill",
    "description": "",
    "key": 407,
    "name": "UnravelerMinionBuff"
  },
  408: {
    "id": 408,
    "kind": "character.skill",
    "description": "",
    "key": 408,
    "name": "BaalMinionBossBerserk"
  },
  409: {
    "id": 409,
    "kind": "character.skill",
    "description": "",
    "key": 409,
    "name": "BaalMinionBossRabies"
  },
  410: {
    "id": 410,
    "kind": "character.skill",
    "description": "",
    "key": 410,
    "name": "BaalMinionBossCharge"
  },
  411: {
    "id": 411,
    "kind": "character.skill",
    "description": "",
    "key": 411,
    "name": "BaalMinionBossNova"
  },
  412: {
    "id": 412,
    "kind": "character.skill",
    "description": "leap",
    "key": 412,
    "name": "MonLeap"
  },
  413: {
    "id": 413,
    "kind": "character.skill",
    "description": "jab",
    "key": 413,
    "name": "MonJab"
  },
  414: {
    "id": 414,
    "kind": "character.skill",
    "description": "smite",
    "key": 414,
    "name": "MonSmite"
  },
  415: {
    "id": 415,
    "kind": "character.skill",
    "description": "charge",
    "key": 415,
    "name": "MonCharge"
  },
  416: {
    "id": 416,
    "kind": "character.skill",
    "description": "holy freeze",
    "key": 416,
    "name": "MonHolyFreeze"
  },
  417: {
    "id": 417,
    "kind": "character.skill",
    "description": "glacial spike",
    "key": 417,
    "name": "MonGlacialSpike"
  },
  418: {
    "id": 418,
    "kind": "character.skill",
    "description": "frost nova",
    "key": 418,
    "name": "MonFrostNova"
  },
  419: {
    "id": 419,
    "kind": "character.skill",
    "description": "fire ball",
    "key": 419,
    "name": "MonFireBall"
  },
  420: {
    "id": 420,
    "kind": "character.skill",
    "description": "weaken",
    "key": 420,
    "name": "MonWeaken"
  },
  421: {
    "id": 421,
    "kind": "character.skill",
    "description": "hydra",
    "key": 421,
    "name": "MonHydra"
  },
  422: {
    "id": 422,
    "kind": "character.skill",
    "description": "lightning",
    "key": 422,
    "name": "MonLightning"
  },
  423: {
    "id": 423,
    "kind": "character.skill",
    "description": "",
    "key": 423,
    "name": "Fixed Siege Beast Stomp"
  },
  424: {
    "id": 424,
    "kind": "character.skill",
    "description": "",
    "key": 424,
    "name": "MonAmplifyDamage"
  },
  425: {
    "id": 425,
    "kind": "character.skill",
    "description": "whirlwind",
    "key": 425,
    "name": "MonWhirlwind"
  },
  426: {
    "id": 426,
    "kind": "character.skill",
    "description": "shout",
    "key": 426,
    "name": "MonShout"
  },
  427: {
    "id": 427,
    "kind": "character.skill",
    "description": "decrepify",
    "key": 427,
    "name": "MonDecrepify"
  },
  428: {
    "id": 428,
    "kind": "character.skill",
    "description": "chain lightning",
    "key": 428,
    "name": "MonChainLightning"
  },
  429: {
    "id": 429,
    "kind": "character.skill",
    "description": "chilling armor",
    "key": 429,
    "name": "MonChillingArmor"
  },
  430: {
    "id": 430,
    "kind": "character.skill",
    "description": "meteor",
    "key": 430,
    "name": "UberDiabloMeteor"
  },
  431: {
    "id": 431,
    "kind": "character.skill",
    "description": "immolation arrow",
    "key": 431,
    "name": "UberDiabloBoulder"
  },
  432: {
    "id": 432,
    "kind": "character.skill",
    "description": "",
    "key": 432,
    "name": "UberDiabWall"
  },
  433: {
    "id": 433,
    "kind": "character.skill",
    "description": "",
    "key": 433,
    "name": "UberDiabLight"
  },
  434: {
    "id": 434,
    "kind": "character.skill",
    "description": "",
    "key": 434,
    "name": "UberDiabCold"
  },
  435: {
    "id": 435,
    "kind": "character.skill",
    "description": "",
    "key": 435,
    "name": "UberDiabFire"
  },
  436: {
    "id": 436,
    "kind": "character.skill",
    "description": "",
    "key": 436,
    "name": "UberDiabSuperFire"
  },
  437: {
    "id": 437,
    "kind": "character.skill",
    "description": "chain lightning",
    "key": 437,
    "name": "WispBossChainLightning"
  },
  438: {
    "id": 438,
    "kind": "character.skill",
    "description": "lightning",
    "key": 438,
    "name": "WispMinionLightning"
  },
  439: {
    "id": 439,
    "kind": "character.skill",
    "description": "conviction",
    "key": 439,
    "name": "WispTotemConviction"
  },
  440: {
    "id": 440,
    "kind": "character.skill",
    "description": "leap attack",
    "key": 440,
    "name": "MonLeapAttack"
  },
  441: {
    "id": 441,
    "kind": "character.skill",
    "description": "",
    "key": 441,
    "name": "FingerMageBossSpider"
  },
  442: {
    "id": 442,
    "kind": "character.skill",
    "description": "amplify damage proc",
    "key": 442,
    "name": "AmpDmg Proc"
  },
  443: {
    "id": 443,
    "kind": "character.skill",
    "description": "weaken proc",
    "key": 443,
    "name": "Weaken Proc"
  },
  444: {
    "id": 444,
    "kind": "character.skill",
    "description": "iron maiden proc",
    "key": 444,
    "name": "Iron Maiden Proc"
  },
  445: {
    "id": 445,
    "kind": "character.skill",
    "description": "life tap proc",
    "key": 445,
    "name": "Life Tap Proc"
  },
  446: {
    "id": 446,
    "kind": "character.skill",
    "description": "decrepify proc",
    "key": 446,
    "name": "Decrepify Proc"
  },
  447: {
    "id": 447,
    "kind": "character.skill",
    "description": "lower resist proc",
    "key": 447,
    "name": "LowRes Proc"
  },
  448: {
    "id": 448,
    "kind": "character.skill",
    "description": "freezing arrow",
    "key": 448,
    "name": "Iceboss Freezing Arrow"
  },
  449: {
    "id": 449,
    "kind": "character.skill",
    "description": "blizzard",
    "key": 449,
    "name": "Iceboss Blizzard"
  },
  450: {
    "id": 450,
    "kind": "character.skill",
    "description": "lightning strike",
    "key": 450,
    "name": "Lightning Strike Cowboss"
  },
  451: {
    "id": 451,
    "kind": "character.skill",
    "description": "poison nova",
    "key": 451,
    "name": "Poison Nova Tomb Boss"
  },
  452: {
    "id": 452,
    "kind": "character.skill",
    "description": "power strike",
    "key": 452,
    "name": "Power Strike Tomb Boss"
  },
  453: {
    "id": 453,
    "kind": "character.skill",
    "description": "",
    "key": 453,
    "name": "PoisonEggSpawn"
  },
  454: {
    "id": 454,
    "kind": "character.skill",
    "description": "hydra",
    "key": 454,
    "name": "Hydra Throne Boss"
  },
  455: {
    "id": 455,
    "kind": "character.skill",
    "description": "",
    "key": 455,
    "name": "UberDiabSummon"
  },
  456: {
    "id": 456,
    "kind": "character.skill",
    "description": "",
    "key": 456,
    "name": "A3 Mastery Fire"
  },
  457: {
    "id": 457,
    "kind": "character.skill",
    "description": "",
    "key": 457,
    "name": "A3 Mastery Cold"
  },
  458: {
    "id": 458,
    "kind": "character.skill",
    "description": "",
    "key": 458,
    "name": "A3 Mastery Ltng"
  },
  459: {
    "id": 459,
    "kind": "character.skill",
    "description": "static field",
    "key": 459,
    "name": "Merc Static Field"
  },
  460: {
    "id": 460,
    "kind": "character.skill",
    "description": "lightning",
    "key": 460,
    "name": "A3 Merc Lightning"
  },
  461: {
    "id": 461,
    "kind": "character.skill",
    "description": "meteor",
    "key": 461,
    "name": "A3 Merc Meteor"
  },
  462: {
    "id": 462,
    "kind": "character.skill",
    "description": "fire ball",
    "key": 462,
    "name": "A3 Merc Fire Ball"
  },
  463: {
    "id": 463,
    "kind": "character.skill",
    "description": "blizzard",
    "key": 463,
    "name": "A3 Merc Blizzard"
  },
  464: {
    "id": 464,
    "kind": "character.skill",
    "description": "ice blast",
    "key": 464,
    "name": "A3 Merc Ice Blast"
  },
  465: {
    "id": 465,
    "kind": "character.skill",
    "description": "blessed aim",
    "key": 465,
    "name": "TraitorBossBlessedAim"
  },
  466: {
    "id": 466,
    "kind": "character.skill",
    "description": "vigor",
    "key": 466,
    "name": "TraitorBossVigor"
  },
  467: {
    "id": 467,
    "kind": "character.skill",
    "description": "teeth",
    "key": 467,
    "name": "TraitorBossConeJab"
  },
  468: {
    "id": 468,
    "kind": "character.skill",
    "description": "bone spear",
    "key": 468,
    "name": "TraitorBossStunSpear"
  },
  469: {
    "id": 469,
    "kind": "character.skill",
    "description": "blizzard",
    "key": 469,
    "name": "ArcherBossArrowRain"
  },
  470: {
    "id": 470,
    "kind": "character.skill",
    "description": "multiple shot",
    "key": 470,
    "name": "ArcherBossBoomerShot"
  },
  471: {
    "id": 471,
    "kind": "character.skill",
    "description": "multiple shot",
    "key": 471,
    "name": "ArcherBossCageShot"
  },
  472: {
    "id": 472,
    "kind": "character.skill",
    "description": "conviction",
    "key": 472,
    "name": "Mon Conviction"
  },
  473: {
    "id": 473,
    "kind": "character.skill",
    "description": "fanaticism",
    "key": 473,
    "name": "Mon Fanaticism"
  },
  474: {
    "id": 474,
    "kind": "character.skill",
    "description": "holy shock",
    "key": 474,
    "name": "Mon Holy Shock"
  },
  475: {
    "id": 475,
    "kind": "character.skill",
    "description": "holy freeze",
    "key": 475,
    "name": "Mon Holy Freeze"
  },
  476: {
    "id": 476,
    "kind": "character.skill",
    "description": "holy fire",
    "key": 476,
    "name": "Mon Holy Fire"
  },
  477: {
    "id": 477,
    "kind": "character.skill",
    "description": "might",
    "key": 477,
    "name": "Mon Might"
  },
  478: {
    "id": 478,
    "kind": "character.skill",
    "description": "concentration",
    "key": 478,
    "name": "Mon Concentration"
  },
  479: {
    "id": 479,
    "kind": "character.skill",
    "description": "vigor",
    "key": 479,
    "name": "Mon Vigor"
  },
  480: {
    "id": 480,
    "kind": "character.skill",
    "description": "lower resist",
    "key": 480,
    "name": "Baal Lowres"
  },
  481: {
    "id": 481,
    "kind": "character.skill",
    "description": "poison dagger",
    "key": 481,
    "name": "Poison Dagger Spider Boss"
  },
  482: {
    "id": 482,
    "kind": "character.skill",
    "description": "",
    "key": 482,
    "name": "AndyPoisonBolt Spider Boss"
  },
  483: {
    "id": 483,
    "kind": "character.skill",
    "description": "tornado",
    "key": 483,
    "name": "Tornado Arcane Boss"
  },
  484: {
    "id": 484,
    "kind": "character.skill",
    "description": "",
    "key": 484,
    "name": "Skeleton Archer Bow"
  },
  485: {
    "id": 485,
    "kind": "character.skill",
    "description": "",
    "key": 485,
    "name": "RathmaDeath"
  },
  486: {
    "id": 486,
    "kind": "character.skill",
    "description": "",
    "key": 486,
    "name": "NihlathakMapMobSpawn"
  },
  487: {
    "id": 487,
    "kind": "character.skill",
    "description": "",
    "key": 487,
    "name": "NihlathakMapDeath"
  },
  488: {
    "id": 488,
    "kind": "character.skill",
    "description": "",
    "key": 488,
    "name": "DoppleZonStrafe"
  },
  489: {
    "id": 489,
    "kind": "character.skill",
    "description": "power strike",
    "key": 489,
    "name": "Valk Power Strike"
  },
  490: {
    "id": 490,
    "kind": "character.skill",
    "description": "",
    "key": 490,
    "name": "RathmaSummon"
  },
  491: {
    "id": 491,
    "kind": "character.skill",
    "description": "bone spear",
    "key": 491,
    "name": "RathmaBoneSpear"
  },
  492: {
    "id": 492,
    "kind": "character.skill",
    "description": "teeth",
    "key": 492,
    "name": "RathmaTeethNova"
  },
  493: {
    "id": 493,
    "kind": "character.skill",
    "description": "",
    "key": 493,
    "name": "VoidBolt"
  },
  494: {
    "id": 494,
    "kind": "character.skill",
    "description": "",
    "key": 494,
    "name": "SummonVoidling"
  },
  495: {
    "id": 495,
    "kind": "character.skill",
    "description": "hurricane",
    "key": 495,
    "name": "IskatuHurricane"
  },
  496: {
    "id": 496,
    "kind": "character.skill",
    "description": "",
    "key": 496,
    "name": "RathmaPoisonOrb"
  },
  497: {
    "id": 497,
    "kind": "character.skill",
    "description": "eruption",
    "key": 497,
    "name": "RathmaFissure"
  },
  498: {
    "id": 498,
    "kind": "character.skill",
    "description": "poison nova",
    "key": 498,
    "name": "RathmaOuterNova"
  },
  499: {
    "id": 499,
    "kind": "character.skill",
    "description": "",
    "key": 499,
    "name": "Horror Arctic Blast Boss"
  },
  500: {
    "id": 500,
    "kind": "character.skill",
    "description": "frost nova",
    "key": 500,
    "name": "Frost Nova Horror Boss"
  },
  501: {
    "id": 501,
    "kind": "character.skill",
    "description": "holy freeze",
    "key": 501,
    "name": "Mon Holy Freeze Wide"
  },
  502: {
    "id": 502,
    "kind": "character.skill",
    "description": "poison nova",
    "key": 502,
    "name": "RathmaPacman"
  },
  503: {
    "id": 503,
    "kind": "character.skill",
    "description": "shock wave",
    "key": 503,
    "name": "Shock Wave Boss"
  },
  504: {
    "id": 504,
    "kind": "character.skill",
    "description": "",
    "key": 504,
    "name": "RathmaPrison"
  },
  505: {
    "id": 505,
    "kind": "character.skill",
    "description": "",
    "key": 505,
    "name": "RathmaColdMissiles"
  },
  506: {
    "id": 506,
    "kind": "character.skill",
    "description": "glacial spike",
    "key": 506,
    "name": "Glacial Spike Spire"
  },
  507: {
    "id": 507,
    "kind": "character.skill",
    "description": "poison nova",
    "key": 507,
    "name": "Poison Nova Rathma"
  },
  508: {
    "id": 508,
    "kind": "character.skill",
    "description": "teeth",
    "key": 508,
    "name": "Teeth Rathma"
  },
  509: {
    "id": 509,
    "kind": "character.skill",
    "description": "blaze",
    "key": 509,
    "name": "UberTalicBlaze"
  },
  510: {
    "id": 510,
    "kind": "character.skill",
    "description": "whirlwind",
    "key": 510,
    "name": "UberTalicWhirlwind"
  },
  511: {
    "id": 511,
    "kind": "character.skill",
    "description": "bash",
    "key": 511,
    "name": "UberTalicBash"
  },
  512: {
    "id": 512,
    "kind": "character.skill",
    "description": "meteor",
    "key": 512,
    "name": "UberTalicMeteor"
  },
  513: {
    "id": 513,
    "kind": "character.skill",
    "description": "book of unlimited identify",
    "key": 513,
    "name": "Book of Unlimited Identify"
  },
  514: {
    "id": 514,
    "kind": "character.skill",
    "description": "book of unlimited townportal",
    "key": 514,
    "name": "Book of Unlimited Townportal"
  },
  515: {
    "id": 515,
    "kind": "character.skill",
    "description": "meteor",
    "key": 515,
    "name": "BruteFireSlam"
  },
  516: {
    "id": 516,
    "kind": "character.skill",
    "description": "molten boulder",
    "key": 516,
    "name": "BruteMoltenBoulder"
  },
  517: {
    "id": 517,
    "kind": "character.skill",
    "description": "shock wave",
    "key": 517,
    "name": "BruteShockWave"
  },
  518: {
    "id": 518,
    "kind": "character.skill",
    "description": "vigor",
    "key": 518,
    "name": "BruteVigor"
  },
  519: {
    "id": 519,
    "kind": "character.skill",
    "description": "",
    "key": 519,
    "name": "UberMadawcDoubleThrow"
  },
  520: {
    "id": 520,
    "kind": "character.skill",
    "description": "",
    "key": 520,
    "name": "UberMadawcCursedAxe"
  },
  521: {
    "id": 521,
    "kind": "character.skill",
    "description": "",
    "key": 521,
    "name": "UberMadawcOWAxe"
  },
  522: {
    "id": 522,
    "kind": "character.skill",
    "description": "smite",
    "key": 522,
    "name": "UberTalicSmite"
  },
  523: {
    "id": 523,
    "kind": "character.skill",
    "description": "battle orders",
    "key": 523,
    "name": "UberMadawcFakeBO"
  },
  524: {
    "id": 524,
    "kind": "character.skill",
    "description": "blizzard",
    "key": 524,
    "name": "UberMadawcLightningStorm"
  },
  525: {
    "id": 525,
    "kind": "character.skill",
    "description": "cyclone armor",
    "key": 525,
    "name": "Cyclone ArmorMon"
  },
  526: {
    "id": 526,
    "kind": "character.skill",
    "description": "",
    "key": 526,
    "name": "LeoricSummonNova"
  },
  527: {
    "id": 527,
    "kind": "character.skill",
    "description": "volcano",
    "key": 527,
    "name": "SiegeBeastClusterbomb"
  },
  528: {
    "id": 528,
    "kind": "character.skill",
    "description": "nova",
    "key": 528,
    "name": "SiegeBeastFireNova"
  },
  529: {
    "id": 529,
    "kind": "character.skill",
    "description": "",
    "key": 529,
    "name": "SiegeBeastBuffNova"
  },
  530: {
    "id": 530,
    "kind": "character.skill",
    "description": "frozen orb",
    "key": 530,
    "name": "SiegeBeastOrb"
  },
  531: {
    "id": 531,
    "kind": "character.skill",
    "description": "holy fire",
    "key": 531,
    "name": "Holy Fire Fire Golem"
  },
  532: {
    "id": 532,
    "kind": "character.skill",
    "description": "holy freeze",
    "key": 532,
    "name": "Holy Freeze Korlic"
  },
  533: {
    "id": 533,
    "kind": "character.skill",
    "description": "leap attack",
    "key": 533,
    "name": "Leap Attack Korlic"
  },
  534: {
    "id": 534,
    "kind": "character.skill",
    "description": "holy fire",
    "key": 534,
    "name": "Holy Fire Sanctuaryboss"
  },
  535: {
    "id": 535,
    "kind": "character.skill",
    "description": "howl",
    "key": 535,
    "name": "Howl Monster"
  },
  536: {
    "id": 536,
    "kind": "character.skill",
    "description": "bone spear",
    "key": 536,
    "name": "Bone Spear Serpent"
  },
  537: {
    "id": 537,
    "kind": "character.skill",
    "description": "fire ball",
    "key": 537,
    "name": "Fire Ball Ashen Boss"
  },
  538: {
    "id": 538,
    "kind": "character.skill",
    "description": "frost nova",
    "key": 538,
    "name": "Fire Nova"
  },
  539: {
    "id": 539,
    "kind": "character.skill",
    "description": "ice barrage",
    "key": 539,
    "name": "ZharBarrage"
  },
  540: {
    "id": 540,
    "kind": "character.skill",
    "description": "",
    "key": 540,
    "name": "ZharStrike"
  },
  541: {
    "id": 541,
    "kind": "character.skill",
    "description": "armageddon",
    "key": 541,
    "name": "ZharArmageddon"
  },
  542: {
    "id": 542,
    "kind": "character.skill",
    "description": "",
    "key": 542,
    "name": "ZharNovaOrb"
  },
  543: {
    "id": 543,
    "kind": "character.skill",
    "description": "cloak of shadows",
    "key": 543,
    "name": "ZharCloak"
  },
  544: {
    "id": 544,
    "kind": "character.skill",
    "description": "",
    "key": 544,
    "name": "DemonPillar Fireball"
  },
  545: {
    "id": 545,
    "kind": "character.skill",
    "description": "magic arrow",
    "key": 545,
    "name": "Merc Magic Arrow"
  },
  546: {
    "id": 546,
    "kind": "character.skill",
    "description": "",
    "key": 546,
    "name": "UberDiabRun"
  },
  547: {
    "id": 547,
    "kind": "character.skill",
    "description": "",
    "key": 547,
    "name": "ZharMiniBossMeteorBlizzard"
  },
  548: {
    "id": 548,
    "kind": "character.skill",
    "description": "",
    "key": 548,
    "name": "ZharMiniBossCombustion"
  },
  549: {
    "id": 549,
    "kind": "character.skill",
    "description": "",
    "key": 549,
    "name": "DemonPillar Lightning"
  },
  550: {
    "id": 550,
    "kind": "character.skill",
    "description": "",
    "key": 550,
    "name": "GuardianOfFateSummon"
  },
  551: {
    "id": 551,
    "kind": "character.skill",
    "description": "",
    "key": 551,
    "name": "A4 Mastery"
  },
  552: {
    "id": 552,
    "kind": "character.skill",
    "description": "amplify damage",
    "key": 552,
    "name": "A4 AmpDmg"
  },
  553: {
    "id": 553,
    "kind": "character.skill",
    "description": "",
    "key": 553,
    "name": "WarlordMiniBoss1BaalFire"
  },
  554: {
    "id": 554,
    "kind": "character.skill",
    "description": "energy shield",
    "key": 554,
    "name": "Energy Shield SelfAura"
  },
  555: {
    "id": 555,
    "kind": "character.skill",
    "description": "chilling armor",
    "key": 555,
    "name": "Chilling Armor SelfAura"
  },
  556: {
    "id": 556,
    "kind": "character.skill",
    "description": "quickness",
    "key": 556,
    "name": "Quickness SelfAura"
  },
  557: {
    "id": 557,
    "kind": "character.skill",
    "description": "blade shield",
    "key": 557,
    "name": "Blade Shield SelfAura"
  },
  558: {
    "id": 558,
    "kind": "character.skill",
    "description": "",
    "key": 558,
    "name": "IskatuBlizzard"
  },
  559: {
    "id": 559,
    "kind": "character.skill",
    "description": "",
    "key": 559,
    "name": "ButcherAura"
  },
  560: {
    "id": 560,
    "kind": "character.skill",
    "description": "",
    "key": 560,
    "name": "IskatuMagicOrb"
  },
  561: {
    "id": 561,
    "kind": "character.skill",
    "description": "cobra strike",
    "key": 561,
    "name": "RakanothStrike"
  },
  562: {
    "id": 562,
    "kind": "character.skill",
    "description": "",
    "key": 562,
    "name": "TorajanBossNest"
  },
  563: {
    "id": 563,
    "kind": "character.skill",
    "description": "firestorm",
    "key": 563,
    "name": "KanemithFirestorm"
  },
  564: {
    "id": 564,
    "kind": "character.skill",
    "description": "shock field",
    "key": 564,
    "name": "KanemithShockWeb"
  },
  565: {
    "id": 565,
    "kind": "character.skill",
    "description": "frozen orb",
    "key": 565,
    "name": "SharptoothUnholyOrb"
  },
  566: {
    "id": 566,
    "kind": "character.skill",
    "description": "chain lightning",
    "key": 566,
    "name": "SharptoothChainPoison"
  },
  567: {
    "id": 567,
    "kind": "character.skill",
    "description": "",
    "key": 567,
    "name": "SharptoothArmageddon"
  },
  568: {
    "id": 568,
    "kind": "character.skill",
    "description": "",
    "key": 568,
    "name": "RadamentBossRoyalFire"
  },
  569: {
    "id": 569,
    "kind": "character.skill",
    "description": "nova",
    "key": 569,
    "name": "WispBossNova"
  },
  570: {
    "id": 570,
    "kind": "character.skill",
    "description": "meteor",
    "key": 570,
    "name": "RadamentBossMeteor"
  },
  571: {
    "id": 571,
    "kind": "character.skill",
    "description": "",
    "key": 571,
    "name": "LucionNova"
  },
  572: {
    "id": 572,
    "kind": "character.skill",
    "description": "",
    "key": 572,
    "name": "LucionBoneWave"
  },
  573: {
    "id": 573,
    "kind": "character.skill",
    "description": "",
    "key": 573,
    "name": "LucionBlink"
  },
  574: {
    "id": 574,
    "kind": "character.skill",
    "description": "",
    "key": 574,
    "name": "LucionRoyalFire"
  },
  575: {
    "id": 575,
    "kind": "character.skill",
    "description": "charge",
    "key": 575,
    "name": "LucionDash"
  },
  576: {
    "id": 576,
    "kind": "character.skill",
    "description": "",
    "key": 576,
    "name": "LucionPunish"
  },
  577: {
    "id": 577,
    "kind": "character.skill",
    "description": "eruption",
    "key": 577,
    "name": "EruptionDemonRoadBoss"
  },
  578: {
    "id": 578,
    "kind": "character.skill",
    "description": "hydra",
    "key": 578,
    "name": "Tentacle"
  },
  579: {
    "id": 579,
    "kind": "character.skill",
    "description": "charge",
    "key": 579,
    "name": "LucionCharge"
  },
  580: {
    "id": 580,
    "kind": "character.skill",
    "description": "",
    "key": 580,
    "name": "LucionDeath1"
  },
  581: {
    "id": 581,
    "kind": "character.skill",
    "description": "",
    "key": 581,
    "name": "LucionDeath2"
  },
  582: {
    "id": 582,
    "kind": "character.skill",
    "description": "",
    "key": 582,
    "name": "LucionDeath3"
  },
  583: {
    "id": 583,
    "kind": "character.skill",
    "description": "",
    "key": 583,
    "name": "LucionDeath4"
  },
  584: {
    "id": 584,
    "kind": "character.skill",
    "description": "smite",
    "key": 584,
    "name": "MonSmiteLucion"
  },
  585: {
    "id": 585,
    "kind": "character.skill",
    "description": "lower resist",
    "key": 585,
    "name": "MonLowerRes"
  },
  586: {
    "id": 586,
    "kind": "character.skill",
    "description": "",
    "key": 586,
    "name": "HydraFireball"
  },
  587: {
    "id": 587,
    "kind": "character.skill",
    "description": "",
    "key": 587,
    "name": "SummonVoidlingUniqueMap"
  },
  588: {
    "id": 588,
    "kind": "character.skill",
    "description": "bone spear",
    "key": 588,
    "name": "Bone Spear Putrid Defiler"
  },
  589: {
    "id": 589,
    "kind": "character.skill",
    "description": "",
    "key": 589,
    "name": "SummonViperUniqueMap"
  },
  590: {
    "id": 590,
    "kind": "character.skill",
    "description": "charged bolt",
    "key": 590,
    "name": "ChargedBoltImperialMiniBoss"
  },
  591: {
    "id": 591,
    "kind": "character.skill",
    "description": "",
    "key": 591,
    "name": "ImperialMiniBossBlast"
  },
  592: {
    "id": 592,
    "kind": "character.skill",
    "class_code": "dru",
    "description": "attack",
    "key": 592,
    "name": "drutemp3",
    "class": "Druid"
  },
  593: {
    "id": 593,
    "kind": "character.skill",
    "description": "armageddon",
    "key": 593,
    "name": "Armageddon SelfAura"
  },
};

export const skillNameToIdMap: Record<string, CharacterSkill> = _.keyBy(
  Object.values(characterSkillMap),
  (skill) => skill.name.toLowerCase()
);