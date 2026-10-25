import { describe, expect, it } from 'vitest';
import {
  CORRUPTED_ZONE_SLOT_MS,
  CORRUPTED_ZONES,
  corruptedZoneAt,
  corruptedZoneSchedule,
  formatCountdown,
} from './corrupted-zones';

const at = (iso: string) => Date.parse(iso);

describe('corruptedZoneAt', () => {
  // Read off pd2.tools/tools/corrupted-zone-tracker and exiledagain's tracker on 2026-10-25
  it.each([
    ['2026-10-25T19:45:00Z', 'Rocky Waste and the Stony Tomb'],
    ['2026-10-25T20:00:00Z', "Canyon of the Magi and Tal Rasha's Tomb"],
    ['2026-10-25T20:15:00Z', 'Spider Forest, Arachnid Lair, and Spider Cavern'],
    ['2026-10-25T21:30:00Z', 'Abaddon, the Pit of Acheron, and the Infernal Pit'],
    ['2026-10-25T22:30:00Z', 'Cow Level'],
    ['2026-10-26T00:15:00Z', 'Blood Moor and Den of Evil'], // first slot after midnight UTC (day term steps)
    ['2026-10-27T00:30:00Z', 'Travincal, the Ruined Fane, and Disused Reliquary'],
  ])('%s is %s', (iso, zone) => {
    expect(corruptedZoneAt(at(iso)).zone).toBe(zone);
  });

  it('keeps the zone for the whole slot and switches exactly on the boundary', () => {
    const slot = corruptedZoneAt(at('2026-10-25T19:59:59.999Z'));
    expect(slot).toEqual({
      zone: 'Rocky Waste and the Stony Tomb',
      start: at('2026-10-25T19:45:00Z'),
      end: at('2026-10-25T20:00:00Z'),
    });
    expect(corruptedZoneAt(slot.end).zone).toBe("Canyon of the Magi and Tal Rasha's Tomb");
  });

  it('matches the 32-bit rand() reference for a year of slots', () => {
    const reference = (start: number) => {
      const seed = BigInt(Math.floor(start / CORRUPTED_ZONE_SLOT_MS) + Math.floor(start / 86_400_000));
      const roll = Number(((seed * 214013n + 2531011n) & 0xffffffffn) >> 16n) & 0x7fff;
      return CORRUPTED_ZONES[roll % CORRUPTED_ZONES.length];
    };
    const from = at('2026-01-01T00:00:00Z');
    for (let start = from; start < from + 365 * 86_400_000; start += CORRUPTED_ZONE_SLOT_MS) {
      if (corruptedZoneAt(start).zone !== reference(start))
        throw new Error(`mismatch at ${new Date(start).toISOString()}`);
    }
  });
});

describe('corruptedZoneSchedule', () => {
  it('starts with the current slot and steps 15 minutes', () => {
    const schedule = corruptedZoneSchedule(at('2026-10-25T19:51:00Z'), 3);
    expect(schedule.map((s) => [new Date(s.start).toISOString(), s.zone])).toEqual([
      ['2026-10-25T19:45:00.000Z', 'Rocky Waste and the Stony Tomb'],
      ['2026-10-25T20:00:00.000Z', "Canyon of the Magi and Tal Rasha's Tomb"],
      ['2026-10-25T20:15:00.000Z', 'Spider Forest, Arachnid Lair, and Spider Cavern'],
    ]);
  });
});

describe('formatCountdown', () => {
  it.each([
    [15 * 60_000, '15:00'],
    [258_000, '4:18'],
    [1, '0:01'], // rounds up: never shows 0:00 before the switch
    [0, '0:00'],
    [-5_000, '0:00'],
  ])('%d ms is %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});
