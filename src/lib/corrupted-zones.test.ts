import { describe, expect, it } from 'vitest';
import {
  CORRUPTED_ZONE_SLOT_MS,
  CORRUPTED_ZONES,
  corruptedZoneAt,
  corruptedZoneSchedule,
  followedZoneSchedule,
  formatCountdown,
  formatWait,
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

describe('followedZoneSchedule', () => {
  const now = at('2026-10-25T19:51:00Z');

  it('starts with the current slot when it is followed', () => {
    const schedule = followedZoneSchedule(now, new Set(['Chaos Sanctuary', 'Rocky Waste and the Stony Tomb']), 2);
    expect(schedule.map((s) => [new Date(s.start).toISOString(), s.zone])).toEqual([
      ['2026-10-25T19:45:00.000Z', 'Rocky Waste and the Stony Tomb'],
      ['2026-10-25T21:00:00.000Z', 'Chaos Sanctuary'],
    ]);
  });

  it('skips the zones not followed and stops at count', () => {
    const schedule = followedZoneSchedule(now, new Set(['Chaos Sanctuary', 'Durance of Hate']), 2);
    expect(schedule.map((s) => [new Date(s.start).toISOString(), s.zone])).toEqual([
      ['2026-10-25T20:45:00.000Z', 'Durance of Hate'],
      ['2026-10-25T21:00:00.000Z', 'Chaos Sanctuary'],
    ]);
  });

  it('finds any single zone from every slot of 2026 (within its 3-day look-ahead)', () => {
    const from = at('2026-01-01T00:00:00Z');
    const last = new Map<string, number>(CORRUPTED_ZONES.map((zone) => [zone, from]));
    let longestGap = 0;
    for (let start = from; start < from + 368 * 86_400_000; start += CORRUPTED_ZONE_SLOT_MS) {
      const { zone } = corruptedZoneAt(start);
      longestGap = Math.max(longestGap, start - last.get(zone)!);
      last.set(zone, start);
    }
    expect(longestGap).toBeLessThan(3 * 86_400_000);
  });
});

describe('formatCountdown', () => {
  it.each([
    [15 * 60_000, '15:00'],
    [258_000, '4:18'],
    [1, '0:01'], // rounds up: never shows 0:00 before the switch
    [0, '0:00'],
    [-5_000, '0:00'],
    [3_599_001, '1:00:00'],
    [26 * 3_600_000 + 5 * 60_000 + 9_000, '26:05:09'],
  ])('%d ms is %s', (ms, text) => {
    expect(formatCountdown(ms)).toBe(text);
  });
});

describe('formatWait', () => {
  it.each([
    [5 * 60_000, '5m'],
    [59 * 60_000 + 1, '1h 0m'], // rounds up like the countdown
    [80 * 60_000, '1h 20m'],
    [26 * 3_600_000 + 5 * 60_000, '26h 5m'],
  ])('%d ms is %s', (ms, text) => {
    expect(formatWait(ms)).toBe(text);
  });
});
