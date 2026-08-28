import {
  addEntryAtFront,
  advanceQueue,
  clearQueue,
  EMPTY_QUEUE,
  holdQueue,
  moveEntry,
  nextDeadline,
  removeEntry,
  startQueue,
  type Queue,
  type QueueEntry,
} from '@/domain/queue';
import type { QueueEntryId } from '@/domain/ids';
import {
  createEmitter,
  createExternalStore,
  type Emitter,
  type ReadableStore,
  type Unsubscribe,
} from '@/lib/external-store';

export interface QueueRunnerState {
  readonly queue: Queue;
  /** Wall-clock time, truncated to whole seconds. */
  readonly nowMs: number;
}

export interface EntryFired {
  readonly entry: QueueEntry;
}

export interface EntriesSkipped {
  readonly entries: readonly QueueEntry[];
}

/** Countdown refresh rate. Firing accuracy does not depend on this value. */
const TICK_MS = 500;

const truncateToSecond = (ms: number) => Math.floor(ms / 1000) * 1000;

/**
 * Owns the queue and the single clock that drives it.
 *
 * A queue never starts on its own: entries can be added, removed, and reordered
 * indefinitely while idle, and only `start()` anchors them to wall-clock time.
 * From that point deadlines are absolute, so a throttled or fully suspended
 * background tab cannot desynchronise playback — the next tick accounts for all
 * elapsed time in one step.
 */
export class QueueRunner {
  readonly #store = createExternalStore<QueueRunnerState>({
    queue: EMPTY_QUEUE,
    nowMs: truncateToSecond(Date.now()),
  });
  readonly #fired = createEmitter<EntryFired>();
  readonly #skipped = createEmitter<EntriesSkipped>();

  #intervalId: ReturnType<typeof setInterval> | null = null;
  #deadlineTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #disposers: readonly Unsubscribe[] = [];

  get state(): ReadableStore<QueueRunnerState> {
    return this.#store;
  }

  get fired(): Pick<Emitter<EntryFired>, 'on'> {
    return this.#fired;
  }

  /** Entries passed over because the tab was inactive when they came due. */
  get skipped(): Pick<Emitter<EntriesSkipped>, 'on'> {
    return this.#skipped;
  }

  start(): Unsubscribe {
    if (this.#intervalId !== null) return () => this.stopClock();

    this.#intervalId = setInterval(() => this.#tick(), TICK_MS);

    // A suspended tab resumes with a stale clock; resync as soon as it is
    // visible instead of waiting for the next interval callback.
    const resync = () => this.#tick();
    document.addEventListener('visibilitychange', resync);
    window.addEventListener('focus', resync);
    window.addEventListener('pageshow', resync);

    this.#disposers = [
      () => document.removeEventListener('visibilitychange', resync),
      () => window.removeEventListener('focus', resync),
      () => window.removeEventListener('pageshow', resync),
    ];

    this.#tick();
    return () => this.stopClock();
  }

  stopClock(): void {
    if (this.#intervalId !== null) clearInterval(this.#intervalId);
    if (this.#deadlineTimeoutId !== null) clearTimeout(this.#deadlineTimeoutId);

    this.#intervalId = null;
    this.#deadlineTimeoutId = null;
    for (const dispose of this.#disposers) dispose();
    this.#disposers = [];
  }

  /** Replaces the whole queue — used when rehydrating from storage. */
  replaceQueue(queue: Queue): void {
    this.#update(() => queue);
  }

  /** New entries land at the front, at +0:00, ready to be dragged into place. */
  add(entry: QueueEntry): void {
    this.#update((queue) => addEntryAtFront(queue, entry));
  }

  move(from: number, to: number): void {
    this.#update((queue) => moveEntry(queue, from, to));
  }

  remove(id: QueueEntryId): void {
    this.#update((queue) => removeEntry(queue, id));
  }

  clear(): void {
    this.#update(clearQueue);
  }

  /** Anchors the queue to wall-clock time. Nothing fires before this. */
  play(): void {
    this.#update((queue) => startQueue(queue, Date.now()));
  }

  hold(): void {
    this.#update((queue) => holdQueue(queue, Date.now()));
  }

  #update(project: (queue: Queue) => Queue): void {
    this.#store.setState((state) => {
      const queue = project(state.queue);
      return queue === state.queue ? state : { ...state, queue };
    });
    this.#armDeadlineTimer();
  }

  #tick(): void {
    const now = Date.now();
    const { queue } = this.#store.getSnapshot();
    const { queue: next, fired, skipped } = advanceQueue(queue, now);

    if (fired !== null || skipped.length > 0) {
      // Publish the advanced queue before emitting, so no subscriber can
      // observe an entry that has fired but not yet been consumed.
      this.#store.setState(() => ({
        queue: next,
        nowMs: truncateToSecond(now),
      }));

      if (skipped.length > 0) this.#skipped.emit({ entries: skipped });
      if (fired !== null) this.#fired.emit({ entry: fired });
      this.#armDeadlineTimer();
      return;
    }

    this.#store.setState((state) => {
      const nowMs = truncateToSecond(now);
      return state.nowMs === nowMs ? state : { ...state, nowMs };
    });
  }

  /**
   * Fires exactly on the next deadline. Browsers keep timers accurate in tabs
   * that are playing audio, so this preserves sub-second precision without
   * polling faster.
   */
  #armDeadlineTimer(): void {
    if (this.#deadlineTimeoutId !== null) {
      clearTimeout(this.#deadlineTimeoutId);
      this.#deadlineTimeoutId = null;
    }
    if (this.#intervalId === null) return;

    const deadline = nextDeadline(this.#store.getSnapshot().queue, Date.now());
    if (deadline === null) return;

    this.#deadlineTimeoutId = setTimeout(
      () => {
        this.#deadlineTimeoutId = null;
        this.#tick();
      },
      Math.max(0, deadline - Date.now())
    );
  }
}
