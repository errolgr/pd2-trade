import type { EquippedItem, SnapshotBuild } from '@/lib/builds-api';

export type DiffItem = Pick<EquippedItem, 'key' | 'name' | 'quality' | 'runeword'>;

export interface SlotChange {
  slot: string;
  merc: boolean;
  /** null: the slot was empty before / is empty now. */
  removed: DiffItem | null;
  added: DiffItem | null;
}

export interface SkillChange {
  name: string;
  /** Hard points before / after. */
  from: number;
  to: number;
}

export interface BuildDiff {
  level: { from: number; to: number } | null;
  /** Per slot, character slots first (in slot order), then the merc's. */
  items: SlotChange[];
  skills: SkillChange[];
  merc: { from: string | null; to: string | null } | null;
  /** Change in gear value (HR); null when either side is unpriced or nothing moved. */
  gearValueDelta: number | null;
  died: boolean;
}

export type DiffBuild = Pick<SnapshotBuild, 'level' | 'skills' | 'gearValueHr' | 'isDead'> & {
  equipped: (DiffItem & { slot: string })[];
  merc: { type: string; equipped: (DiffItem & { slot: string })[] } | null;
};

const SLOT_ORDER = [
  'Helm',
  'Amulet',
  'Armor',
  'Right Hand',
  'Left Hand',
  'Right Hand Switch',
  'Left Hand Switch',
  'Gloves',
  'Belt',
  'Boots',
  'Right Ring',
  'Left Ring',
];
const slotRank = (slot: string) => {
  const i = SLOT_ORDER.indexOf(slot);
  return i < 0 ? SLOT_ORDER.length : i;
};

const pick = ({ key, name, quality, runeword }: DiffItem): DiffItem => ({ key, name, quality, runeword });

function diffSlots(before: DiffBuild['equipped'], after: DiffBuild['equipped'], merc: boolean): SlotChange[] {
  const was = new Map(before.map((item) => [item.slot, item]));
  const now = new Map(after.map((item) => [item.slot, item]));
  const slots = [...new Set([...was.keys(), ...now.keys()])].sort((a, b) => slotRank(a) - slotRank(b));
  const changes: SlotChange[] = [];
  for (const slot of slots) {
    const a = was.get(slot);
    const b = now.get(slot);
    if (a?.key === b?.key) continue;
    changes.push({ slot, merc, removed: a ? pick(a) : null, added: b ? pick(b) : null });
  }
  return changes;
}

/** What changed from `before` to `after` (two snapshots of one character, older first). */
export function diffBuilds(before: DiffBuild, after: DiffBuild): BuildDiff {
  const hardPoints = (build: DiffBuild) => new Map(build.skills.map((s) => [s.name, s.base]));
  const was = hardPoints(before);
  const now = hardPoints(after);
  const skills: SkillChange[] = [];
  for (const name of new Set([...was.keys(), ...now.keys()])) {
    const from = was.get(name) ?? 0;
    const to = now.get(name) ?? 0;
    if (from !== to) skills.push({ name, from, to });
  }
  skills.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from) || a.name.localeCompare(b.name));

  const mercType = (build: DiffBuild) => build.merc?.type ?? null;
  const delta =
    before.gearValueHr != null && after.gearValueHr != null
      ? Math.round((after.gearValueHr - before.gearValueHr) * 100) / 100
      : null;

  return {
    level: before.level !== after.level ? { from: before.level, to: after.level } : null,
    items: [
      ...diffSlots(before.equipped, after.equipped, false),
      ...diffSlots(before.merc?.equipped ?? [], after.merc?.equipped ?? [], true),
    ],
    skills,
    merc: mercType(before) !== mercType(after) ? { from: mercType(before), to: mercType(after) } : null,
    gearValueDelta: delta === 0 ? null : delta,
    died: !before.isDead && after.isDead,
  };
}

export const isEmptyDiff = (diff: BuildDiff) =>
  !diff.level && !diff.items.length && !diff.skills.length && !diff.merc && diff.gearValueDelta == null && !diff.died;
