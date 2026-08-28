import { z } from 'zod';
import { newQueueEntryId, queueEntryIdSchema, soundIdSchema } from './ids';
import { soundTagSchema } from './sound-tag';

export const MIN_GAP_MINUTES = 0;
export const MAX_GAP_MINUTES = 120;
export const GAP_PRESETS_MINUTES = [2, 5, 10, 20] as const;

const MS_PER_MINUTE = 60_000;

export const minutesToMs = (minutes: number): number =>
  Math.round(minutes * MS_PER_MINUTE);

/** What an entry plays: a specific sound, or a random pick from one tag. */
export const queueTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sound'), soundId: soundIdSchema }),
  z.object({ kind: z.literal('random'), tag: soundTagSchema.nullable() }),
]);

export type QueueTarget = z.infer<typeof queueTargetSchema>;

export const queueEntrySchema = z
  .object({
    id: queueEntryIdSchema,
    target: queueTargetSchema,
    label: z.string().min(1),
    /**
     * Delay after the *previous* entry fires — the design's "gap after previous
     * sound". Absolute offsets are derived, never stored, so reordering or
     * removing an entry cannot leave stale timings behind.
     */
    gapMs: z
      .number()
      .int()
      .min(minutesToMs(MIN_GAP_MINUTES))
      .max(minutesToMs(MAX_GAP_MINUTES)),
  })
  .readonly();

export type QueueEntry = z.infer<typeof queueEntrySchema>;

/**
 * A queue is composed while idle and does nothing until it is started, so a
 * meeting host can prepare one in advance and press play when the call begins.
 *
 * `startedAt` is the single source of truth for that: `null` means idle. Once
 * set, every entry's deadline is `startedAt + cumulativeOffset`, which keeps
 * the whole queue on absolute wall-clock time and immune to background-tab
 * timer throttling.
 */
export const queueSchema = z
  .object({
    entries: z.array(queueEntrySchema).readonly(),
    startedAt: z.number().int().positive().nullable(),
    /** Index of the next entry to fire; equals `entries.length` when drained. */
    cursor: z.number().int().nonnegative(),
    /** Wall-clock ms already elapsed before the queue was last held. */
    heldElapsedMs: z.number().int().nonnegative(),
  })
  .readonly();

export type Queue = z.infer<typeof queueSchema>;

export const EMPTY_QUEUE: Queue = {
  entries: [],
  startedAt: null,
  cursor: 0,
  heldElapsedMs: 0,
};

export type QueueStatus = 'empty' | 'idle' | 'running' | 'held' | 'finished';

export function queueStatus(queue: Queue): QueueStatus {
  if (queue.entries.length === 0) return 'empty';
  if (queue.cursor >= queue.entries.length) return 'finished';
  if (queue.startedAt !== null) return 'running';
  return queue.heldElapsedMs > 0 ? 'held' : 'idle';
}

export function createEntry(input: {
  target: QueueTarget;
  label: string;
  gapMs: number;
}): QueueEntry {
  return queueEntrySchema.parse({ ...input, id: newQueueEntryId() });
}

/**
 * Cumulative offset from queue start for each entry, in order.
 *
 * The first entry always lands at +0:00 — it is what the queue starts with, so
 * it has no previous sound to be spaced from. Its stored `gapMs` is kept rather
 * than zeroed, so moving it further down the queue restores its spacing.
 */
export function entryOffsets(entries: readonly QueueEntry[]): readonly number[] {
  return entries.reduce<readonly number[]>(
    (offsets, entry, index) => [
      ...offsets,
      index === 0 ? 0 : (offsets.at(-1) ?? 0) + entry.gapMs,
    ],
    []
  );
}

export function totalDurationMs(entries: readonly QueueEntry[]): number {
  return entryOffsets(entries).at(-1) ?? 0;
}

/** Elapsed wall-clock time since the queue started, including held time. */
export function elapsedMs(queue: Queue, now: number): number {
  return queue.startedAt === null
    ? queue.heldElapsedMs
    : queue.heldElapsedMs + Math.max(0, now - queue.startedAt);
}

/** Absolute deadline of one entry, or `null` while the queue is not running. */
export function deadlineOf(
  queue: Queue,
  index: number,
  now: number
): number | null {
  if (queue.startedAt === null) return null;
  const offset = entryOffsets(queue.entries).at(index);
  if (offset === undefined) return null;

  return now + (offset - elapsedMs(queue, now));
}

export function remainingMsOf(
  queue: Queue,
  index: number,
  now: number
): number | null {
  const offset = entryOffsets(queue.entries).at(index);
  if (offset === undefined) return null;

  return Math.max(0, offset - elapsedMs(queue, now));
}

export const addEntry = (queue: Queue, entry: QueueEntry): Queue => ({
  ...queue,
  entries: [...queue.entries, entry],
});

export const removeEntry = (queue: Queue, id: QueueEntry['id']): Queue => {
  const index = queue.entries.findIndex((entry) => entry.id === id);
  if (index === -1) return queue;

  return {
    ...queue,
    entries: queue.entries.filter((entry) => entry.id !== id),
    // Keep the cursor pointing at the same upcoming entry.
    cursor: index < queue.cursor ? Math.max(0, queue.cursor - 1) : queue.cursor,
  };
};

/**
 * Moves an entry to a new index, keeping every other entry's order.
 *
 * Offsets are never stored, only derived, so a move needs no recalculation —
 * the entry simply takes its spacing from whatever now precedes it.
 */
export function moveEntry(queue: Queue, from: number, to: number): Queue {
  const count = queue.entries.length;
  const target = Math.min(count - 1, Math.max(0, to));

  if (from < 0 || from >= count || from === target) return queue;

  const without = queue.entries.filter((_, index) => index !== from);
  const moved = queue.entries.at(from);
  if (!moved) return queue;

  return {
    ...queue,
    entries: [...without.slice(0, target), moved, ...without.slice(target)],
  };
}

/** Where a newly picked sound lands: the front of the queue, at +0:00. */
export const addEntryAtFront = (queue: Queue, entry: QueueEntry): Queue => ({
  ...queue,
  entries: [entry, ...queue.entries],
  cursor: queue.cursor > 0 ? queue.cursor + 1 : queue.cursor,
});

export const clearQueue = (): Queue => EMPTY_QUEUE;

export const startQueue = (queue: Queue, now: number): Queue =>
  queue.startedAt !== null || queue.entries.length === 0
    ? queue
    : { ...queue, startedAt: now };

/** Pauses without losing position: elapsed time is banked, deadlines re-derive. */
export const holdQueue = (queue: Queue, now: number): Queue =>
  queue.startedAt === null
    ? queue
    : { ...queue, startedAt: null, heldElapsedMs: elapsedMs(queue, now) };

/**
 * How late an entry may be and still be worth playing.
 *
 * A tick that lands a few hundred milliseconds after a deadline should play the
 * sound. One that lands twenty minutes late — because the tab was suspended —
 * should not: the moment it was meant to punctuate has passed.
 */
export const STALE_AFTER_MS = 5_000;

export interface QueueAdvance {
  readonly queue: Queue;
  /** The one entry worth playing now, if any. */
  readonly fired: QueueEntry | null;
  /** Entries passed over because their moment is gone. */
  readonly skipped: readonly QueueEntry[];
}

/**
 * Advances past every entry whose deadline has passed.
 *
 * At most one sound is played per advance. When a tab wakes after a long
 * suspension several deadlines may have elapsed at once; playing them all would
 * fire a burst of overlapping sounds where each one cuts off the last. Only the
 * most recent entry is played, and only if it is still fresh — the rest are
 * reported as skipped so the UI can say what was missed.
 */
export function advanceQueue(
  queue: Queue,
  now: number,
  staleAfterMs: number = STALE_AFTER_MS
): QueueAdvance {
  if (queue.startedAt === null) return { queue, fired: null, skipped: [] };

  const offsets = entryOffsets(queue.entries);
  const elapsed = elapsedMs(queue, now);

  const due = queue.entries.filter(
    (_, index) =>
      index >= queue.cursor && (offsets.at(index) ?? Infinity) <= elapsed
  );

  if (due.length === 0) return { queue, fired: null, skipped: [] };

  const lastIndex = queue.cursor + due.length - 1;
  const lateBy = elapsed - (offsets.at(lastIndex) ?? elapsed);
  const fired = lateBy <= staleAfterMs ? (due.at(-1) ?? null) : null;
  const skipped = fired === null ? due : due.slice(0, -1);

  const cursor = queue.cursor + due.length;
  const drained = cursor >= queue.entries.length;

  return {
    queue: drained
      ? { ...queue, cursor, startedAt: null, heldElapsedMs: elapsed }
      : { ...queue, cursor },
    fired,
    skipped,
  };
}

/** Deadline of the next pending entry, or `null` when idle or drained. */
export function nextDeadline(queue: Queue, now: number): number | null {
  return queueStatus(queue) === 'running'
    ? deadlineOf(queue, queue.cursor, now)
    : null;
}

/** `m:ss`, or `h:mm:ss` past an hour. Clamped at zero. */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (value: number) => value.toString().padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** "1st", "2nd", "3rd", "4th"... for the candidate row's subtitle. */
export function ordinal(index: number): string {
  const position = index + 1;
  const lastTwo = position % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${position}th`;

  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[position % 10] ?? 'th';
  return `${position}${suffix}`;
}

/** `+m:ss` label used by the queue list and timeline. */
export const formatOffset = (ms: number): string => `+${formatRemaining(ms)}`;
