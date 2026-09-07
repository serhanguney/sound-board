// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toSoundId } from '@/domain/ids';
import {
  createEntry,
  entryOffsets,
  minutesToMs,
  queueStatus,
  type QueueEntry,
} from '@/domain/queue';
import { QueueRunner } from './queue-runner';

const START = new Date('2026-01-01T09:00:00.000Z').getTime();

const entry = (label: string, gapMinutes: number): QueueEntry =>
  createEntry({
    target: { kind: 'sound', soundId: toSoundId(`sounds/${label}.mp3`) },
    label,
    gapMs: minutesToMs(gapMinutes),
  });

let runner: QueueRunner;
let stop: () => void;
let fired: string[];
let skipped: string[];

/** Adds entries in play order — `add` appends, so the order is written as-is. */
const enqueue = (...items: readonly (readonly [string, number])[]) => {
  for (const [label, gap] of items) runner.add(entry(label, gap));
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  runner = new QueueRunner();
  fired = [];
  skipped = [];
  runner.fired.on(({ entry: e }) => fired.push(e.label));
  runner.skipped.on(({ entries }) =>
    skipped.push(...entries.map((e) => e.label))
  );
  stop = runner.start();
});

afterEach(() => {
  stop();
  vi.useRealTimers();
});

/** Wall-clock moves forward with no timer callbacks, then the tab wakes. */
const suspendThenResume = (ms: number) => {
  vi.setSystemTime(Date.now() + ms);
  document.dispatchEvent(new Event('visibilitychange'));
};

const queue = () => runner.state.getSnapshot().queue;

describe('QueueRunner', () => {
  it('never fires until play() is called', () => {
    enqueue(['a', 0], ['b', 1]);

    vi.advanceTimersByTime(minutesToMs(120));

    expect(fired).toEqual([]);
    expect(queueStatus(queue())).toBe('idle');
  });

  it('opens with the first entry and spaces the rest after it', () => {
    enqueue(['a', 0], ['b', 2]);
    runner.play();

    vi.advanceTimersByTime(1_000);
    expect(fired).toEqual(['a']);

    vi.advanceTimersByTime(minutesToMs(2));
    expect(fired).toEqual(['a', 'b']);
  });

  it('anchors gaps to the moment play was pressed, not to when entries were added', () => {
    enqueue(['a', 0], ['b', 5]);
    // Ten minutes of preparation before the meeting starts.
    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual([]);

    runner.play();
    vi.advanceTimersByTime(1_000);
    expect(fired).toEqual(['a']);

    vi.advanceTimersByTime(minutesToMs(5));
    expect(fired).toEqual(['a', 'b']);
  });

  it('fires an entry whose deadline passed moments before the tab woke', () => {
    enqueue(['a', 0], ['b', 5]);
    runner.play();
    vi.advanceTimersByTime(1_000);

    suspendThenResume(minutesToMs(5));

    expect(fired).toEqual(['a', 'b']);
  });

  it('plays nothing and reports every entry as skipped after a long suspension', () => {
    // The bug this covers: waking up fired all of them at once, each cutting
    // off the last, so one apparently random sound played.
    enqueue(['a', 0], ['b', 1], ['c', 1]);
    runner.play();

    suspendThenResume(minutesToMs(60));

    expect(fired).toEqual([]);
    expect(skipped).toEqual(['a', 'b', 'c']);
  });

  it('does not report the same entry twice', () => {
    enqueue(['a', 0], ['b', 1]);
    runner.play();

    suspendThenResume(minutesToMs(60));
    suspendThenResume(minutesToMs(60));

    expect(skipped).toEqual(['a', 'b']);
  });

  it('plays only the latest entry when a few came due during one suspension', () => {
    enqueue(['a', 0], ['b', 1]);
    runner.play();

    // No ticks for a minute; on waking 'a' is long past but 'b' has only just
    // come due, so 'b' is the one still worth playing.
    suspendThenResume(minutesToMs(1) + 1_000);

    expect(fired).toEqual(['b']);
    expect(skipped).toEqual(['a']);
  });

  it('stops firing while held and resumes where it left off', () => {
    enqueue(['a', 0], ['b', 10]);
    runner.play();
    vi.advanceTimersByTime(1_000);
    expect(fired).toEqual(['a']);

    vi.advanceTimersByTime(minutesToMs(4));
    runner.hold();
    expect(queueStatus(queue())).toBe('held');

    vi.advanceTimersByTime(minutesToMs(60));
    expect(fired).toEqual(['a']);

    runner.play();
    vi.advanceTimersByTime(minutesToMs(6));
    expect(fired).toEqual(['a', 'b']);
  });

  it('clears everything back to empty', () => {
    enqueue(['a', 1]);
    runner.play();
    runner.clear();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual([]);
    expect(queueStatus(queue())).toBe('empty');
  });

  it('removing a pending entry prevents it firing', () => {
    enqueue(['a', 0], ['b', 1]);
    const second = queue().entries[1]!;
    runner.remove(second.id);
    runner.play();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual(['a']);
  });

  it('publishes the advanced queue before emitting', () => {
    const cursors: number[] = [];
    runner.fired.on(() => cursors.push(runner.state.getSnapshot().queue.cursor));

    enqueue(['a', 0]);
    runner.play();
    vi.advanceTimersByTime(1_000);

    expect(cursors).toEqual([1]);
  });

  it('stops all timers when the clock is stopped', () => {
    enqueue(['a', 0]);
    runner.play();
    runner.stopClock();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual([]);
  });

  it('keeps the same state reference when only sub-second time passes', () => {
    enqueue(['a', 0], ['b', 5]);
    runner.play();
    vi.advanceTimersByTime(1_000);

    const before = runner.state.getSnapshot();
    vi.advanceTimersByTime(400);

    // Avoids re-rendering the board twice a second for no visible change.
    expect(runner.state.getSnapshot()).toBe(before);
  });
});

describe('QueueRunner reordering', () => {
  it('appends new entries, spacing each one by its own gap', () => {
    runner.add(entry('first', 5));
    runner.add(entry('second', 8));

    expect(queue().entries.map((e) => e.label)).toEqual(['first', 'second']);
    // 'first' opens the queue at +0:00; 'second' picks up the gap chosen for it.
    expect(entryOffsets(queue().entries)).toEqual([0, minutesToMs(8)]);
  });

  it('moves an entry to a new position', () => {
    enqueue(['a', 2], ['b', 2], ['c', 2]);

    runner.move(0, 2);
    expect(queue().entries.map((e) => e.label)).toEqual(['b', 'c', 'a']);
  });

  it('fires reordered entries in their new order, re-spaced', () => {
    // 'a' opens the queue at +0:00, so its own 2-minute gap is unused. Moving
    // it below 'b' brings that gap into play.
    enqueue(['a', 2], ['b', 1]);
    runner.move(0, 1);
    runner.play();

    vi.advanceTimersByTime(1_000);
    expect(fired).toEqual(['b']);

    vi.advanceTimersByTime(minutesToMs(2));
    expect(fired).toEqual(['b', 'a']);
  });
});
