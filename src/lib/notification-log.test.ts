import { describe, expect, it } from 'vitest';
import {
  addEntry,
  GROUP_WINDOW_MS,
  LOG_MAX,
  markAllSeen,
  markMissed,
  missedSummary,
  type NotificationEntry,
  type NotificationKind,
  parseLog,
} from './notification-log';

const T0 = 1_700_000_000_000;
let seq = 0;

function add(
  log: readonly NotificationEntry[],
  kind: NotificationKind,
  {
    at = T0,
    missed = false,
    groupKey,
    title = kind,
  }: { at?: number; missed?: boolean; groupKey?: string; title?: string } = {},
) {
  return addEntry(log, { id: `e${seq++}`, kind, title, at, missed, groupKey }).log;
}

describe('addEntry', () => {
  it("folds a sender's whispers within the window into the newest entry, keeping it missed if any was", () => {
    let log = add([], 'whisper', { groupKey: 'whisper:bob', missed: true, title: 'first' });
    log = add(log, 'whisper', { groupKey: 'whisper:bob', at: T0 + GROUP_WINDOW_MS, title: 'second' });
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ title: 'second', count: 2, missed: true, at: T0 + GROUP_WINDOW_MS });
  });

  it('starts a new entry after the window, for another key, or when another entry came in between', () => {
    let log = add([], 'whisper', { groupKey: 'whisper:bob' });
    log = add(log, 'whisper', { groupKey: 'whisper:bob', at: T0 + GROUP_WINDOW_MS + 1 });
    log = add(log, 'whisper', { groupKey: 'whisper:carl', at: T0 + GROUP_WINDOW_MS + 2 });
    log = add(log, 'whisper', { groupKey: 'whisper:bob', at: T0 + GROUP_WINDOW_MS + 3 });
    expect(log.map((e) => e.count)).toEqual([1, 1, 1, 1]);
  });

  it('never counts joins as missed', () => {
    const log = add([], 'join', { missed: true });
    expect(log[0].missed).toBe(false);
    expect(markMissed(log, log[0].id)).toBe(log);
  });

  it('keeps the newest LOG_MAX entries', () => {
    let log: readonly NotificationEntry[] = [];
    for (let i = 0; i <= LOG_MAX; i++) log = add(log, 'market', { at: T0 + i, title: `#${i}` });
    expect(log).toHaveLength(LOG_MAX);
    expect(log[0].title).toBe(`#${LOG_MAX}`);
    expect(log[LOG_MAX - 1].title).toBe('#1');
  });
});

describe('missed state', () => {
  it('a timed-out toast marks its entry missed; opening the log marks everything seen', () => {
    let log: readonly NotificationEntry[] = add([], 'market');
    log = add(log, 'chat', { missed: true });
    expect(missedSummary(log)).toMatchObject({ count: 1, urgent: false });

    log = markMissed(log, log[1].id);
    expect(missedSummary(log)).toMatchObject({ count: 2, latest: log[0] });

    log = markAllSeen(log);
    expect(missedSummary(log)).toEqual({ count: 0, urgent: false, latest: null });
  });

  it.each<[NotificationKind, boolean]>([
    ['offer', true],
    ['trade', true],
    ['error', true],
    ['whisper', false],
    ['market', false],
  ])('a missed %s is urgent: %s', (kind, urgent) => {
    expect(missedSummary(add([], kind, { missed: true })).urgent).toBe(urgent);
  });
});

describe('parseLog', () => {
  it('keeps well-formed entries newest first and drops the rest', () => {
    const good = { id: 'a', kind: 'offer', title: 'New Offer', at: T0, count: 2, missed: true };
    const older = { id: 'b', kind: 'sim', title: 'Sim done', at: T0 - 1 };
    const text = JSON.stringify({
      entries: [older, good, { id: 'c', kind: 'nope', title: 'x', at: T0 }, { id: 'd', kind: 'chat', at: T0 }, null],
    });
    expect(parseLog(text)).toEqual([
      { ...good, missed: true },
      { ...older, count: 1, missed: false },
    ]);
  });

  it('reads a broken or foreign file as empty', () => {
    expect(parseLog('{')).toEqual([]);
    expect(parseLog('[]')).toEqual([]);
  });
});
