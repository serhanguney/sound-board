// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toSoundId } from '@/domain/ids';
import {
  createEntry,
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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
  runner = new QueueRunner();
  fired = [];
  runner.fired.on(({ entry: e }) => fired.push(e.label));
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
    runner.add(entry('a', 1));
    runner.add(entry('b', 1));

    vi.advanceTimersByTime(minutesToMs(120));

    expect(fired).toEqual([]);
    expect(queueStatus(queue())).toBe('idle');
  });

  it('fires entries in order once played', () => {
    runner.add(entry('a', 1));
    runner.add(entry('b', 2));
    runner.play();

    vi.advanceTimersByTime(minutesToMs(1));
    expect(fired).toEqual(['a']);

    vi.advanceTimersByTime(minutesToMs(2));
    expect(fired).toEqual(['a', 'b']);
  });

  it('anchors gaps to the moment play was pressed, not to when entries were added', () => {
    runner.add(entry('a', 5));
    // Ten minutes of preparation time before the meeting starts.
    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual([]);

    runner.play();
    vi.advanceTimersByTime(minutesToMs(5));
    expect(fired).toEqual(['a']);
  });

  it('fires entries whose deadline passed while the tab was suspended', () => {
    runner.add(entry('a', 5));
    runner.play();

    suspendThenResume(minutesToMs(5));

    expect(fired).toEqual(['a']);
  });

  it('reports each missed entry exactly once after a long suspension', () => {
    for (const label of ['a', 'b', 'c']) runner.add(entry(label, 1));
    runner.play();

    suspendThenResume(minutesToMs(60));

    expect(fired).toEqual(['a', 'b', 'c']);
    suspendThenResume(minutesToMs(60));
    expect(fired).toEqual(['a', 'b', 'c']);
  });

  it('stops firing while held and resumes where it left off', () => {
    runner.add(entry('a', 10));
    runner.play();

    vi.advanceTimersByTime(minutesToMs(4));
    runner.hold();
    expect(queueStatus(queue())).toBe('held');

    vi.advanceTimersByTime(minutesToMs(60));
    expect(fired).toEqual([]);

    runner.play();
    vi.advanceTimersByTime(minutesToMs(6));
    expect(fired).toEqual(['a']);
  });

  it('clears everything back to empty', () => {
    runner.add(entry('a', 1));
    runner.play();
    runner.clear();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual([]);
    expect(queueStatus(queue())).toBe('empty');
  });

  it('removing a pending entry prevents it firing', () => {
    runner.add(entry('a', 1));
    runner.add(entry('b', 1));
    const second = queue().entries[1]!;
    runner.remove(second.id);
    runner.play();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual(['a']);
  });

  it('publishes the advanced queue before emitting', () => {
    const cursors: number[] = [];
    runner.fired.on(() => cursors.push(runner.state.getSnapshot().queue.cursor));

    runner.add(entry('a', 1));
    runner.play();
    vi.advanceTimersByTime(minutesToMs(1));

    expect(cursors).toEqual([1]);
  });

  it('stops all timers when the clock is stopped', () => {
    runner.add(entry('a', 1));
    runner.play();
    runner.stopClock();

    vi.advanceTimersByTime(minutesToMs(10));
    expect(fired).toEqual([]);
  });

  it('keeps the same state reference when only sub-second time passes', () => {
    runner.add(entry('a', 5));
    runner.play();
    const before = runner.state.getSnapshot();

    vi.advanceTimersByTime(400);
    // Avoids re-rendering the board twice a second for no visible change.
    expect(runner.state.getSnapshot()).toBe(before);
  });
});
