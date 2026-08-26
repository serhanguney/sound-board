import { describe, expect, it } from 'vitest';
import { toSoundId } from './ids';
import {
  advance,
  createSchedule,
  formatRemaining,
  isDue,
  minutesToMs,
  nextDeadline,
  partitionDue,
  remainingMs,
  withRepeat,
  type Schedule,
} from './schedule';

const NOW = 1_700_000_000_000;

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  ...createSchedule({
    target: { kind: 'sound', soundId: toSoundId('sounds/bell.mp3') },
    label: 'Bell',
    intervalMs: minutesToMs(5),
    now: NOW,
  }),
  ...overrides,
});

describe('createSchedule', () => {
  it('anchors the deadline to an absolute time', () => {
    const schedule = makeSchedule();
    expect(schedule.firesAt).toBe(NOW + minutesToMs(5));
  });

  it('rejects an interval below the minimum', () => {
    expect(() =>
      createSchedule({
        target: { kind: 'random' },
        label: 'Random',
        intervalMs: 1_000,
        now: NOW,
      })
    ).toThrow();
  });
});

describe('remainingMs', () => {
  it('derives remaining time from wall-clock, not from a counter', () => {
    const schedule = makeSchedule();
    expect(remainingMs(schedule, NOW)).toBe(minutesToMs(5));
    expect(remainingMs(schedule, NOW + minutesToMs(2))).toBe(minutesToMs(3));
  });

  it('never reports a negative remainder', () => {
    const schedule = makeSchedule();
    expect(remainingMs(schedule, NOW + minutesToMs(99))).toBe(0);
  });

  it('is unaffected by how long the tab was suspended', () => {
    // The regression this replaces: a countdown that stops decrementing while
    // the tab is throttled reports the wrong time once it resumes.
    const schedule = makeSchedule();
    const suspendedFor = minutesToMs(3);
    expect(remainingMs(schedule, NOW + suspendedFor)).toBe(minutesToMs(2));
    expect(isDue(schedule, NOW + minutesToMs(5))).toBe(true);
  });
});

describe('advance', () => {
  it('removes a non-repeating schedule once it fires', () => {
    const schedule = makeSchedule();
    expect(advance(schedule, schedule.firesAt)).toBeNull();
  });

  it('moves a repeating schedule to the next interval', () => {
    const schedule = withRepeat(makeSchedule(), true);
    const next = advance(schedule, schedule.firesAt);
    expect(next?.firesAt).toBe(schedule.firesAt + minutesToMs(5));
  });

  it('collapses deadlines missed while suspended into one firing', () => {
    const schedule = withRepeat(makeSchedule(), true);
    // Backgrounded for an hour on a 5-minute repeat.
    const wokeUpAt = schedule.firesAt + minutesToMs(60);
    const next = advance(schedule, wokeUpAt);

    expect(next).not.toBeNull();
    expect(next!.firesAt).toBeGreaterThan(wokeUpAt);
    expect(next!.firesAt - wokeUpAt).toBeLessThanOrEqual(minutesToMs(5));
  });

  it('does not mutate the input schedule', () => {
    const schedule = withRepeat(makeSchedule(), true);
    const before = { ...schedule };
    advance(schedule, schedule.firesAt);
    expect(schedule).toEqual(before);
  });
});

describe('partitionDue', () => {
  it('separates due from pending without reordering either group', () => {
    const early = makeSchedule({ firesAt: NOW - 1 });
    const late = makeSchedule({ firesAt: NOW + minutesToMs(10) });

    const { due, pending } = partitionDue([early, late], NOW);
    expect(due).toEqual([early]);
    expect(pending).toEqual([late]);
  });
});

describe('nextDeadline', () => {
  it('returns null when nothing is scheduled', () => {
    expect(nextDeadline([])).toBeNull();
  });

  it('returns the earliest deadline', () => {
    const soon = makeSchedule({ firesAt: NOW + 1_000 });
    const later = makeSchedule({ firesAt: NOW + 90_000 });
    expect(nextDeadline([later, soon])).toBe(NOW + 1_000);
  });
});

describe('formatRemaining', () => {
  it.each([
    [0, '0:00'],
    [1_000, '0:01'],
    [59_000, '0:59'],
    [60_000, '1:00'],
    [605_000, '10:05'],
    [3_600_000, '1:00:00'],
    [-5_000, '0:00'],
  ])('formats %ims as %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });
});
