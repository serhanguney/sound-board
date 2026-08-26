// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toSoundId } from '@/domain/ids';
import {
  createSchedule,
  minutesToMs,
  withRepeat,
  type Schedule,
} from '@/domain/schedule';
import { Scheduler } from './scheduler';

const START = new Date('2026-01-01T09:00:00.000Z').getTime();

const makeSchedule = (minutes: number, repeat = false): Schedule =>
  withRepeat(
    createSchedule({
      target: { kind: 'sound', soundId: toSoundId('sounds/bell.mp3') },
      label: 'Bell',
      intervalMs: minutesToMs(minutes),
      now: Date.now(),
    }),
    repeat
  );

let scheduler: Scheduler;
let stop: () => void;
let fired: Schedule[];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  scheduler = new Scheduler();
  fired = [];
  scheduler.fired.on(({ schedule }) => fired.push(schedule));
  stop = scheduler.start();
});

afterEach(() => {
  stop();
  vi.useRealTimers();
});

/**
 * Simulates a suspended background tab: wall-clock time moves forward but no
 * timer callback runs, then the tab regains visibility. This is precisely the
 * scenario the previous countdown-based implementation got wrong.
 */
const suspendThenResume = (ms: number) => {
  vi.setSystemTime(Date.now() + ms);
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('Scheduler', () => {
  it('fires a schedule at its deadline', () => {
    scheduler.add(makeSchedule(5));
    expect(fired).toHaveLength(0);

    vi.advanceTimersByTime(minutesToMs(5));
    expect(fired).toHaveLength(1);
  });

  it('does not fire before the deadline', () => {
    scheduler.add(makeSchedule(5));
    vi.advanceTimersByTime(minutesToMs(5) - 1_000);
    expect(fired).toHaveLength(0);
  });

  it('removes a non-repeating schedule after it fires', () => {
    scheduler.add(makeSchedule(5));
    vi.advanceTimersByTime(minutesToMs(5));

    expect(scheduler.state.getSnapshot().schedules).toHaveLength(0);
  });

  it('re-arms a repeating schedule', () => {
    scheduler.add(makeSchedule(5, true));

    vi.advanceTimersByTime(minutesToMs(5));
    expect(fired).toHaveLength(1);

    vi.advanceTimersByTime(minutesToMs(5));
    expect(fired).toHaveLength(2);
    expect(scheduler.state.getSnapshot().schedules).toHaveLength(1);
  });

  it('fires a schedule whose deadline elapsed while the tab was suspended', () => {
    scheduler.add(makeSchedule(5));

    // No timer callbacks run at all during these 5 minutes.
    suspendThenResume(minutesToMs(5));

    expect(fired).toHaveLength(1);
    expect(scheduler.state.getSnapshot().schedules).toHaveLength(0);
  });

  it('collapses a long suspension into a single firing per schedule', () => {
    scheduler.add(makeSchedule(1, true));

    // An hour backgrounded on a one-minute repeat: sixty deadlines passed.
    suspendThenResume(minutesToMs(60));

    expect(fired).toHaveLength(1);

    const [remaining] = scheduler.state.getSnapshot().schedules;
    expect(remaining).toBeDefined();
    expect(remaining!.firesAt).toBeGreaterThan(Date.now());
  });

  it('fires every due schedule in one pass', () => {
    scheduler.add(makeSchedule(1));
    scheduler.add(makeSchedule(2));
    scheduler.add(makeSchedule(30));

    suspendThenResume(minutesToMs(3));

    expect(fired).toHaveLength(2);
    expect(scheduler.state.getSnapshot().schedules).toHaveLength(1);
  });

  it('publishes advanced state before emitting, so no listener sees a stale deadline', () => {
    const observed: number[] = [];
    scheduler.fired.on(() => {
      const [next] = scheduler.state.getSnapshot().schedules;
      if (next) observed.push(next.firesAt);
    });

    scheduler.add(makeSchedule(5, true));
    vi.advanceTimersByTime(minutesToMs(5));

    expect(observed).toEqual([START + minutesToMs(10)]);
  });

  it('cancels a schedule without firing it', () => {
    scheduler.add(makeSchedule(5));
    const [added] = scheduler.state.getSnapshot().schedules;
    scheduler.remove(added!.id);

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toHaveLength(0);
  });

  it('stops all timers when stopped', () => {
    scheduler.add(makeSchedule(5));
    scheduler.stop();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toHaveLength(0);
  });

  it('keeps the same state reference when only sub-second time passes', () => {
    scheduler.add(makeSchedule(5));
    const before = scheduler.state.getSnapshot();

    vi.advanceTimersByTime(400);
    // Avoids re-rendering the whole board twice a second for no visible change.
    expect(scheduler.state.getSnapshot()).toBe(before);
  });
});
