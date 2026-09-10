import { describe, expect, it } from 'vitest';
import { toSoundId } from './ids';
import {
  addEntry,
  advanceQueue,
  createEntry,
  deadlineOf,
  elapsedMs,
  EMPTY_QUEUE,
  entryGaps,
  entryOffsets,
  formatOffset,
  formatRemaining,
  holdQueue,
  minutesToMs,
  moveEntry,
  nextDeadline,
  ordinal,
  queueStatus,
  removeEntry,
  remainingMsOf,
  restartQueue,
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
    const { queue, fired, skipped } = advanceQueue(idle, NOW + minutesToMs(600));

    expect(fired).toBeNull();
    expect(skipped).toEqual([]);
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
  it('starts the first entry at zero and accumulates the rest', () => {
    // The first sound is what the queue opens with; it has no predecessor to
    // be spaced from, so its own gap does not delay the start.
    expect(entryOffsets(queueOf(2, 5, 10).entries)).toEqual([
      0,
      minutesToMs(5),
      minutesToMs(15),
    ]);
  });

  it('reports each entry\'s spacing from the one before it', () => {
    // The queue is composed as 2/5/10 minute gaps; the first entry opens the
    // queue, so what it is spaced by is 0:00 and the rest keep their own gap.
    expect(entryGaps(queueOf(2, 5, 10).entries)).toEqual([
      0,
      minutesToMs(5),
      minutesToMs(10),
    ]);
  });

  it('gaps are the differences between consecutive offsets', () => {
    const { entries } = queueOf(3, 7, 1, 4);
    const offsets = entryOffsets(entries);
    expect(entryGaps(entries)).toEqual(
      offsets.map((offset, index) =>
        index === 0 ? 0 : offset - (offsets.at(index - 1) ?? 0)
      )
    );
  });

  it('has no gaps for an empty queue', () => {
    expect(entryGaps([])).toEqual([]);
  });

  it('reports the total as the last offset', () => {
    expect(totalDurationMs(queueOf(2, 5, 10).entries)).toBe(minutesToMs(15));
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
    // The first entry opens the queue; the second is five minutes after it.
    expect(deadlineOf(running, 0, NOW)).toBe(NOW);
    expect(deadlineOf(running, 1, NOW)).toBe(NOW + minutesToMs(5));
  });

  it('counts down in wall-clock time, not by ticks', () => {
    const running = startQueue(queueOf(0, 5), NOW);
    expect(remainingMsOf(running, 1, NOW + minutesToMs(3))).toBe(
      minutesToMs(2)
    );
    expect(remainingMsOf(running, 1, NOW + minutesToMs(99))).toBe(0);
  });
});

describe('restartQueue', () => {
  it('rewinds a finished queue and re-anchors it to now', () => {
    const finished = {
      ...startQueue(queueOf(0, 10), NOW),
      cursor: 2,
      heldElapsedMs: minutesToMs(10),
    };
    expect(queueStatus(finished)).toBe('finished');

    const replayed = restartQueue(finished, NOW + minutesToMs(30));

    expect(queueStatus(replayed)).toBe('running');
    expect(replayed.cursor).toBe(0);
    expect(replayed.startedAt).toBe(NOW + minutesToMs(30));
    // Banked time goes with the cursor, or every deadline would already be in
    // the past and the whole replay would be skipped as stale.
    expect(replayed.heldElapsedMs).toBe(0);
    expect(elapsedMs(replayed, NOW + minutesToMs(30))).toBe(0);
  });

  it('keeps the entries and their spacing', () => {
    const replayed = restartQueue(
      { ...startQueue(queueOf(0, 10), NOW), cursor: 2 },
      NOW
    );
    expect(entryOffsets(replayed.entries)).toEqual([0, minutesToMs(10)]);
    expect(advanceQueue(replayed, NOW).fired?.label).toBe('s0');
  });

  it('has nothing to restart when the queue is empty', () => {
    expect(restartQueue(EMPTY_QUEUE, NOW)).toBe(EMPTY_QUEUE);
  });
});

describe('hold and resume', () => {
  it('banks elapsed time and stops the clock', () => {
    const running = startQueue(queueOf(0, 10), NOW);
    const held = holdQueue(running, NOW + minutesToMs(4));

    expect(held.startedAt).toBeNull();
    expect(held.heldElapsedMs).toBe(minutesToMs(4));
    // Time passing while held must not advance the queue.
    expect(elapsedMs(held, NOW + minutesToMs(90))).toBe(minutesToMs(4));
  });

  it('resumes from where it was held', () => {
    const held = holdQueue(
      startQueue(queueOf(0, 10), NOW),
      NOW + minutesToMs(4)
    );
    const resumedAt = NOW + minutesToMs(50);
    const resumed = startQueue(held, resumedAt);

    expect(remainingMsOf(resumed, 1, resumedAt)).toBe(minutesToMs(6));
  });
});

describe('advanceQueue', () => {
  it('plays the opening entry as soon as the queue starts', () => {
    const running = startQueue(queueOf(0, 1), NOW);
    const { fired } = advanceQueue(running, NOW + 200);

    expect(fired?.label).toBe('s0');
  });

  it('plays each following entry after its gap', () => {
    const running = startQueue(queueOf(0, 1), NOW);
    const opened = advanceQueue(running, NOW + 200);
    const { fired } = advanceQueue(
      opened.queue,
      NOW + minutesToMs(1) + 200
    );

    expect(fired?.label).toBe('s1');
  });

  it('plays only the most recent entry when several came due at once', () => {
    // Waking after a suspension must not fire a burst of overlapping sounds.
    const running = startQueue(queueOf(0, 1, 1), NOW);
    const { fired, skipped } = advanceQueue(
      running,
      NOW + minutesToMs(2) + 200
    );

    expect(fired?.label).toBe('s2');
    expect(skipped.map((e) => e.label)).toEqual(['s0', 's1']);
  });

  it('plays nothing when even the latest entry is stale', () => {
    const running = startQueue(queueOf(1, 1, 1), NOW);
    const { fired, skipped } = advanceQueue(running, NOW + minutesToMs(60));

    expect(fired).toBeNull();
    expect(skipped.map((e) => e.label)).toEqual(['s0', 's1', 's2']);
  });

  it('consumes every due entry exactly once', () => {
    const running = startQueue(queueOf(1, 1, 1), NOW);
    const first = advanceQueue(running, NOW + minutesToMs(60));

    const second = advanceQueue(first.queue, NOW + minutesToMs(120));
    expect(second.fired).toBeNull();
    expect(second.skipped).toEqual([]);
  });

  it('advances the cursor past everything due', () => {
    const running = startQueue(queueOf(1, 1, 30), NOW);
    const { queue } = advanceQueue(running, NOW + minutesToMs(2) + 200);

    expect(queue.cursor).toBe(2);
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
    const { queue } = advanceQueue(running, NOW + minutesToMs(2) + 200);
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

describe('addEntry', () => {
  it('places a newly picked sound at the end, one gap after the last entry', () => {
    const queue = addEntry(queueOf(0, 5), entry('new', 2));

    expect(queue.entries.at(-1)?.label).toBe('new');
    expect(entryOffsets(queue.entries)).toEqual([
      0,
      minutesToMs(5),
      minutesToMs(7),
    ]);
  });

  it('gives the first entry +0:00 whatever gap it carries', () => {
    const queue = addEntry(EMPTY_QUEUE, entry('new', 5));
    expect(entryOffsets(queue.entries)).toEqual([0]);
  });

  it('lands ahead of the cursor of a running queue, so it still fires', () => {
    const running = startQueue(queueOf(1, 30), NOW);
    const { queue } = advanceQueue(running, NOW + minutesToMs(1) + 200);
    expect(queue.cursor).toBe(1);

    const added = addEntry(queue, entry('new', 2));
    expect(added.cursor).toBe(1);
    expect(added.entries.length).toBe(3);
  });
});

describe('moveEntry', () => {
  it('re-spaces a moved entry against its new predecessor', () => {
    // The candidate carries a 2-minute gap, so dropping it third puts it two
    // minutes after the entry above it.
    const queue = {
      ...EMPTY_QUEUE,
      entries: [entry('cand', 2), ...queueOf(0, 8, 9.667).entries],
    };
    const moved = moveEntry(queue, 0, 2);

    expect(moved.entries.map((e) => e.label)).toEqual([
      's0',
      's1',
      'cand',
      's2',
    ]);

    const offsets = entryOffsets(moved.entries);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(minutesToMs(8));
    expect(offsets[2]).toBe(minutesToMs(10));
  });

  it('frees the previous first entry to use its own gap once displaced', () => {
    const queue = queueOf(2, 8);
    expect(entryOffsets(queue.entries)).toEqual([0, minutesToMs(8)]);

    const swapped = moveEntry(queue, 0, 1);
    expect(entryOffsets(swapped.entries)).toEqual([0, minutesToMs(2)]);
  });

  it('clamps an out-of-range target instead of dropping the entry', () => {
    const queue = queueOf(1, 1, 1);
    expect(moveEntry(queue, 0, 99).entries.map((e) => e.label)).toEqual([
      's1',
      's2',
      's0',
    ]);
  });

  it('is a no-op for an unchanged or invalid index', () => {
    const queue = queueOf(1, 1);
    expect(moveEntry(queue, 1, 1)).toBe(queue);
    expect(moveEntry(queue, 5, 0)).toBe(queue);
    expect(moveEntry(queue, -1, 0)).toBe(queue);
  });

  it('does not mutate the input queue', () => {
    const queue = queueOf(1, 2, 3);
    const snapshot = JSON.stringify(queue);
    moveEntry(queue, 0, 2);
    expect(JSON.stringify(queue)).toBe(snapshot);
  });
});

describe('ordinal', () => {
  it.each([
    [0, '1st'],
    [1, '2nd'],
    [2, '3rd'],
    [3, '4th'],
    [10, '11th'],
    [11, '12th'],
    [12, '13th'],
    [20, '21st'],
  ])('index %i -> %s', (index, expected) => {
    expect(ordinal(index)).toBe(expected);
  });
});
