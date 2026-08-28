import { describe, expect, it } from 'vitest';
import { toSoundId } from './ids';
import {
  addEntry,
  advanceQueue,
  createEntry,
  deadlineOf,
  elapsedMs,
  EMPTY_QUEUE,
  entryOffsets,
  formatOffset,
  formatRemaining,
  holdQueue,
  minutesToMs,
  nextDeadline,
  queueStatus,
  removeEntry,
  remainingMsOf,
  startQueue,
  totalDurationMs,
  type Queue,
  type QueueEntry,
} from './queue';

const NOW = 1_700_000_000_000;

const entry = (label: string, gapMinutes: number): QueueEntry =>
  createEntry({
    target: { kind: 'sound', soundId: toSoundId(`sounds/${label}.mp3`) },
    label,
    gapMs: minutesToMs(gapMinutes),
  });

const queueOf = (...gaps: number[]): Queue =>
  gaps.reduce(
    (queue, gap, index) => addEntry(queue, entry(`s${index}`, gap)),
    EMPTY_QUEUE
  );

describe('queueStatus', () => {
  it('reports empty before anything is added', () => {
    expect(queueStatus(EMPTY_QUEUE)).toBe('empty');
  });

  it('reports idle once entries exist but nothing has started', () => {
    expect(queueStatus(queueOf(5))).toBe('idle');
  });

  it('reports running only after an explicit start', () => {
    expect(queueStatus(startQueue(queueOf(5), NOW))).toBe('running');
  });

  it('reports held after a hold', () => {
    const running = startQueue(queueOf(5), NOW);
    expect(queueStatus(holdQueue(running, NOW + 60_000))).toBe('held');
  });
});

describe('start semantics', () => {
  it('does not fire anything while idle, however much time passes', () => {
    // The core guarantee: a queue prepared before a meeting stays inert.
    const idle = queueOf(1, 1, 1);
    const { queue, due } = advanceQueue(idle, NOW + minutesToMs(600));

    expect(due).toEqual([]);
    expect(queue).toBe(idle);
    expect(queueStatus(queue)).toBe('idle');
  });

  it('refuses to start an empty queue', () => {
    expect(startQueue(EMPTY_QUEUE, NOW).startedAt).toBeNull();
  });

  it('is idempotent — a second start does not re-anchor the clock', () => {
    const running = startQueue(queueOf(5), NOW);
    expect(startQueue(running, NOW + 90_000)).toBe(running);
  });
});

describe('entryOffsets', () => {
  it('accumulates gaps into offsets from the start', () => {
    expect(entryOffsets(queueOf(2, 5, 10).entries)).toEqual([
      minutesToMs(2),
      minutesToMs(7),
      minutesToMs(17),
    ]);
  });

  it('reports the total as the last offset', () => {
    expect(totalDurationMs(queueOf(2, 5, 10).entries)).toBe(minutesToMs(17));
  });

  it('handles an empty queue', () => {
    expect(entryOffsets([])).toEqual([]);
    expect(totalDurationMs([])).toBe(0);
  });
});

describe('deadlines', () => {
  it('has no deadline while idle', () => {
    expect(deadlineOf(queueOf(5), 0, NOW)).toBeNull();
    expect(nextDeadline(queueOf(5), NOW)).toBeNull();
  });

  it('derives absolute deadlines once started', () => {
    const running = startQueue(queueOf(2, 5), NOW);
    expect(deadlineOf(running, 0, NOW)).toBe(NOW + minutesToMs(2));
    expect(deadlineOf(running, 1, NOW)).toBe(NOW + minutesToMs(7));
  });

  it('counts down in wall-clock time, not by ticks', () => {
    const running = startQueue(queueOf(5), NOW);
    expect(remainingMsOf(running, 0, NOW + minutesToMs(3))).toBe(
      minutesToMs(2)
    );
    expect(remainingMsOf(running, 0, NOW + minutesToMs(99))).toBe(0);
  });
});

describe('hold and resume', () => {
  it('banks elapsed time and stops the clock', () => {
    const running = startQueue(queueOf(10), NOW);
    const held = holdQueue(running, NOW + minutesToMs(4));

    expect(held.startedAt).toBeNull();
    expect(held.heldElapsedMs).toBe(minutesToMs(4));
    // Time passing while held must not advance the queue.
    expect(elapsedMs(held, NOW + minutesToMs(90))).toBe(minutesToMs(4));
  });

  it('resumes from where it was held', () => {
    const held = holdQueue(startQueue(queueOf(10), NOW), NOW + minutesToMs(4));
    const resumedAt = NOW + minutesToMs(50);
    const resumed = startQueue(held, resumedAt);

    expect(remainingMsOf(resumed, 0, resumedAt)).toBe(minutesToMs(6));
  });
});

describe('advanceQueue', () => {
  it('yields entries whose deadline has passed, in order', () => {
    const running = startQueue(queueOf(1, 1, 30), NOW);
    const { queue, due } = advanceQueue(running, NOW + minutesToMs(2));

    expect(due.map((e) => e.label)).toEqual(['s0', 's1']);
    expect(queue.cursor).toBe(2);
  });

  it('reports each missed entry exactly once after a long suspension', () => {
    const running = startQueue(queueOf(1, 1, 1), NOW);
    const { queue, due } = advanceQueue(running, NOW + minutesToMs(60));

    expect(due).toHaveLength(3);
    expect(advanceQueue(queue, NOW + minutesToMs(120)).due).toEqual([]);
  });

  it('returns to idle once drained', () => {
    const running = startQueue(queueOf(1), NOW);
    const { queue } = advanceQueue(running, NOW + minutesToMs(2));

    expect(queueStatus(queue)).toBe('finished');
    expect(queue.startedAt).toBeNull();
  });

  it('does not mutate the input queue', () => {
    const running = startQueue(queueOf(1), NOW);
    const snapshot = JSON.stringify(running);
    advanceQueue(running, NOW + minutesToMs(5));
    expect(JSON.stringify(running)).toBe(snapshot);
  });
});

describe('removeEntry', () => {
  it('keeps the cursor pointing at the same upcoming entry', () => {
    const running = startQueue(queueOf(1, 1, 30), NOW);
    const { queue } = advanceQueue(running, NOW + minutesToMs(2));
    expect(queue.cursor).toBe(2);

    const firstId = queue.entries[0]!.id;
    expect(removeEntry(queue, firstId).cursor).toBe(1);
  });

  it('leaves the cursor alone when removing a pending entry', () => {
    const queue = queueOf(1, 1, 30);
    const lastId = queue.entries[2]!.id;
    expect(removeEntry(queue, lastId).cursor).toBe(0);
  });

  it('is a no-op for an unknown id', () => {
    const queue = queueOf(1);
    expect(removeEntry(queue, queueOf(1).entries[0]!.id)).toBe(queue);
  });
});

describe('formatting', () => {
  it.each([
    [0, '0:00'],
    [59_000, '0:59'],
    [60_000, '1:00'],
    [605_000, '10:05'],
    [3_600_000, '1:00:00'],
    [-5_000, '0:00'],
  ])('formats %ims as %s', (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });

  it('prefixes offsets with a plus', () => {
    expect(formatOffset(480_000)).toBe('+8:00');
  });
});
