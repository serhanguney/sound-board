import type { ScheduleId } from '@/domain/ids';
import {
  advance,
  nextDeadline,
  partitionDue,
  type Schedule,
} from '@/domain/schedule';
import {
  createEmitter,
  createExternalStore,
  type Emitter,
  type ReadableStore,
  type Unsubscribe,
} from '@/lib/external-store';

export interface SchedulerState {
  readonly schedules: readonly Schedule[];
  /** Wall-clock time, truncated to whole seconds so ticks only notify when the
   *  displayed countdown would actually change. */
  readonly nowMs: number;
}

export interface ScheduleFired {
  readonly schedule: Schedule;
}

/** Display refresh rate. Firing accuracy does not depend on this value. */
const TICK_MS = 500;

const truncateToSecond = (ms: number) => Math.floor(ms / 1000) * 1000;

/**
 * Owns the running set of schedules and a single clock.
 *
 * Firing is derived from `Date.now()` compared against each schedule's absolute
 * deadline, so a throttled or fully suspended background tab cannot desynchronise
 * it — on the next tick the elapsed wall-clock time is accounted for in one step.
 * The old implementation decremented a per-schedule counter once per interval
 * callback, which silently stopped counting whenever the tab lost focus.
 */
export class Scheduler {
  readonly #store = createExternalStore<SchedulerState>({
    schedules: [],
    nowMs: truncateToSecond(Date.now()),
  });
  readonly #fired = createEmitter<ScheduleFired>();

  #intervalId: ReturnType<typeof setInterval> | null = null;
  #deadlineTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #disposers: readonly Unsubscribe[] = [];

  get state(): ReadableStore<SchedulerState> {
    return this.#store;
  }

  get fired(): Pick<Emitter<ScheduleFired>, 'on'> {
    return this.#fired;
  }

  start(): Unsubscribe {
    if (this.#intervalId !== null) return () => this.stop();

    this.#intervalId = setInterval(() => this.#tick(), TICK_MS);

    // A suspended tab resumes with a stale clock; resynchronise the moment it
    // becomes visible again rather than waiting for the next interval callback.
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
    return () => this.stop();
  }

  stop(): void {
    if (this.#intervalId !== null) clearInterval(this.#intervalId);
    if (this.#deadlineTimeoutId !== null)
      clearTimeout(this.#deadlineTimeoutId);

    this.#intervalId = null;
    this.#deadlineTimeoutId = null;
    for (const dispose of this.#disposers) dispose();
    this.#disposers = [];
  }

  /** Replaces the schedule set — used when rehydrating from storage. */
  replaceAll(schedules: readonly Schedule[]): void {
    this.#store.setState((state) => ({ ...state, schedules }));
    this.#armDeadlineTimer();
  }

  add(schedule: Schedule): void {
    this.#store.setState((state) => ({
      ...state,
      schedules: [...state.schedules, schedule],
    }));
    this.#armDeadlineTimer();
  }

  remove(id: ScheduleId): void {
    this.#store.setState((state) => {
      const schedules = state.schedules.filter(
        (schedule) => schedule.id !== id
      );
      return schedules.length === state.schedules.length
        ? state
        : { ...state, schedules };
    });
    this.#armDeadlineTimer();
  }

  clear(): void {
    this.#store.setState((state) =>
      state.schedules.length === 0 ? state : { ...state, schedules: [] }
    );
    this.#armDeadlineTimer();
  }

  #tick(): void {
    const now = Date.now();
    const { schedules } = this.#store.getSnapshot();
    const { due, pending } = partitionDue(schedules, now);

    if (due.length > 0) {
      // Compute the next state first, publish it, and only then emit — so no
      // subscriber can observe a schedule that has fired but not yet advanced.
      const advanced = due.flatMap((schedule) => {
        const next = advance(schedule, now);
        return next ? [next] : [];
      });

      this.#store.setState(() => ({
        schedules: [...pending, ...advanced],
        nowMs: truncateToSecond(now),
      }));

      for (const schedule of due) this.#fired.emit({ schedule });
      this.#armDeadlineTimer();
      return;
    }

    this.#store.setState((state) => {
      const nowMs = truncateToSecond(now);
      return state.nowMs === nowMs ? state : { ...state, nowMs };
    });
  }

  /**
   * Backstop for the polling interval: fires exactly on the earliest deadline.
   * Browsers keep timers accurate in tabs that are playing audio, so this keeps
   * sub-second precision in the common case without a faster poll.
   */
  #armDeadlineTimer(): void {
    if (this.#deadlineTimeoutId !== null) {
      clearTimeout(this.#deadlineTimeoutId);
      this.#deadlineTimeoutId = null;
    }
    if (this.#intervalId === null) return;

    const deadline = nextDeadline(this.#store.getSnapshot().schedules);
    if (deadline === null) return;

    const delay = Math.max(0, deadline - Date.now());
    this.#deadlineTimeoutId = setTimeout(() => {
      this.#deadlineTimeoutId = null;
      this.#tick();
    }, delay);
  }
}
