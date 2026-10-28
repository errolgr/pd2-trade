/**
 * Project Diablo 2 corrupted zones: one zone group per 15-minute slot, the same for everyone. A Hell game made
 * during a slot has that slot's zones corrupted (monster level 85, more density, more Worldstone Shards and
 * T1 maps) for its whole life; the next zone needs a new game. Only characters that killed Baal in Hell.
 *
 * The schedule is deterministic: one MSVC `rand()` step seeded with the slot number plus the day number picks
 * the group. Same algorithm and group order as https://pd2.tools/tools/corrupted-zone-tracker and
 * https://exiledagain.github.io/past-dinosaurs/ (checked against both on 2026-10-25).
 */

export const CORRUPTED_ZONE_SLOT_MS = 15 * 60_000;
const DAY_MS = 86_400_000;

/** The corruptible zone groups, in the order the server indexes them. */
export const CORRUPTED_ZONES = [
  'Blood Moor and Den of Evil',
  'Cold Plains and the Cave',
  'Stony Field and Tristram',
  'Dark Wood and the Underground Passage',
  'Black Marsh and the Hole',
  'Tamoe Highland and the Pit',
  'Burial Ground and Mausoleum',
  'Forgotten Tower',
  'Outer Cloister and Barracks',
  'Jail, Inner Cloister, and Cathedral',
  'Catacombs',
  'Cow Level',
  'Rocky Waste and the Stony Tomb',
  'Dry Hills and the Halls of the Dead',
  'Far Oasis and the Maggot Lair',
  'Lost City, Ancient Tunnels, and Claw Viper Temple',
  "Canyon of the Magi and Tal Rasha's Tomb",
  'Lut Gholein Sewers and the Palace Cellars',
  'Arcane Sanctuary',
  'Spider Forest, Arachnid Lair, and Spider Cavern',
  'Great Marsh and the Swampy Pit',
  'Flayer Jungle and the Flayer Dungeon',
  'Lower Kurast and the Kurast Sewers',
  'Kurast Bazaar, Ruined Temple, and Disused Fane',
  'Upper Kurast, the Forgotten Reliquary, and Forgotten Temple',
  'Travincal, the Ruined Fane, and Disused Reliquary',
  'Durance of Hate',
  'Outer Steppes and the Plains of Despair',
  'City of the Damned and the River of Flame',
  'Chaos Sanctuary',
  'Bloody Foothills and the Frigid Highlands',
  'Arreat Plateau, Crystalline Passage, and Frozen River',
  'Glacial Trail, Drifter Cavern, and Frozen Tundra',
  "Ancients' Way and the Icy Cellar",
  "Nihlathak's Temple",
  'Abaddon, the Pit of Acheron, and the Infernal Pit',
  'Worldstone Keep and Throne of Destruction',
] as const;

export type CorruptedZone = (typeof CORRUPTED_ZONES)[number];

export interface CorruptedZoneSlot {
  zone: CorruptedZone;
  /** Epoch ms the slot starts (inclusive) and ends (exclusive). */
  start: number;
  end: number;
}

/** The slot containing `ts` (epoch ms). */
export function corruptedZoneAt(ts: number): CorruptedZoneSlot {
  const start = Math.floor(ts / CORRUPTED_ZONE_SLOT_MS) * CORRUPTED_ZONE_SLOT_MS;
  const seed = start / CORRUPTED_ZONE_SLOT_MS + Math.floor(start / DAY_MS);
  // rand(): ((seed * 214013 + 2531011) >> 16) & 0x7fff. The product stays exact (far below 2^53), and `>>>`
  // keeps its low 32 bits, which is all the 32-bit original keeps; bits 16-30 are the result.
  const roll = ((seed * 214013 + 2531011) >>> 16) & 0x7fff;
  return { zone: CORRUPTED_ZONES[roll % CORRUPTED_ZONES.length], start, end: start + CORRUPTED_ZONE_SLOT_MS };
}

/** The slot containing `now` followed by the next `count - 1` slots. */
export function corruptedZoneSchedule(now: number, count: number): CorruptedZoneSlot[] {
  const first = corruptedZoneAt(now).start;
  return Array.from({ length: count }, (_, i) => corruptedZoneAt(first + i * CORRUPTED_ZONE_SLOT_MS));
}

/**
 * Look-ahead of followedZoneSchedule. Every zone came up at least every 45 hours over 2026-2028, so a followed
 * zone is always found.
 */
const FOLLOWED_HORIZON_MS = 3 * DAY_MS;

/** The first `count` slots, from the one containing `now` on, whose zone is in `zones` (within 3 days). */
export function followedZoneSchedule(now: number, zones: ReadonlySet<string>, count: number): CorruptedZoneSlot[] {
  const slots: CorruptedZoneSlot[] = [];
  const first = corruptedZoneAt(now).start;
  for (
    let start = first;
    start < first + FOLLOWED_HORIZON_MS && slots.length < count;
    start += CORRUPTED_ZONE_SLOT_MS
  ) {
    const slot = corruptedZoneAt(start);
    if (zones.has(slot.zone)) slots.push(slot);
  }
  return slots;
}

/** `m:ss` (or `h:mm:ss` from an hour) for a countdown of `ms`, never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const ss = String(total % 60).padStart(2, '0');
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}:${ss}`;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${ss}`;
}

/** Rounded-up wait for the schedule list: `5m`, `1h 20m`, `26h 5m`. */
export function formatWait(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
