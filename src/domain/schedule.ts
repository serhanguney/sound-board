import { z } from 'zod';
import { newScheduleId, scheduleIdSchema, soundIdSchema } from './ids';

export const MIN_INTERVAL_MINUTES = 0.5;
export const MAX_INTERVAL_MINUTES = 120;

const MS_PER_MINUTE = 60_000;

export const minutesToMs = (minutes: number): number =>
  Math.round(minutes * MS_PER_MINUTE);

/**
 * What a schedule plays when it fires. A discriminated union rather than an
 * `isRandom` boolean, so "random" cannot carry a dangling `soundId` and a
 * targeted schedule cannot lose one.
 */
export const scheduleTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sound'), soundId: soundIdSchema }),
  z.object({ kind: z.literal('random') }),
]);

export type ScheduleTarget = z.infer<typeof scheduleTargetSchema>;

export const scheduleSchema = z
  .object({
    id: scheduleIdSchema,
    target: scheduleTargetSchema,
    label: z.string().min(1),
    /** Delay between firings, and the initial delay. */
    intervalMs: z
      .number()
      .int()
      .min(minutesToMs(MIN_INTERVAL_MINUTES))
      .max(minutesToMs(MAX_INTERVAL_MINUTES)),
    /**
     * Absolute wall-clock deadline (epoch ms).
     *
     * This is the core of the model: remaining time is *derived* from
     * `Date.now()` rather than decremented by a `setInterval`. Background-tab
     * timer throttling therefore affects only how often the countdown
     * re-renders, never when a sound actually fires.
     */
    firesAt: z.number().int().positive(),
    repeat: z.boolean(),
  })
  .readonly();

export type Schedule = z.infer<typeof scheduleSchema>;

export function createSchedule(input: {
  target: ScheduleTarget;
  label: string;
  intervalMs: number;
  now: number;
}): Schedule {
  return scheduleSchema.parse({
    id: newScheduleId(),
    target: input.target,
    label: input.label,
    intervalMs: input.intervalMs,
    firesAt: input.now + input.intervalMs,
    repeat: false,
  });
}

export const withRepeat = (schedule: Schedule, repeat: boolean): Schedule => ({
  ...schedule,
  repeat,
});

export const remainingMs = (schedule: Schedule, now: number): number =>
  Math.max(0, schedule.firesAt - now);

export const isDue = (schedule: Schedule, now: number): boolean =>
  schedule.firesAt <= now;

/**
 * Advances a fired schedule to its next deadline, or removes it (`null`) when
 * it does not repeat.
 *
 * Deadlines missed while the tab was suspended are collapsed into a single
 * firing: a 1-minute repeat that was backgrounded for an hour re-anchors to the
 * next future boundary instead of firing sixty times in a row.
 */
export function advance(schedule: Schedule, now: number): Schedule | null {
  if (!schedule.repeat) return null;

  const elapsed = now - schedule.firesAt;
  const missedIntervals = Math.floor(elapsed / schedule.intervalMs) + 1;

  return {
    ...schedule,
    firesAt: schedule.firesAt + missedIntervals * schedule.intervalMs,
  };
}

/** Splits schedules into those due at `now` and those still pending. */
export function partitionDue(
  schedules: readonly Schedule[],
  now: number
): { due: readonly Schedule[]; pending: readonly Schedule[] } {
  return {
    due: schedules.filter((schedule) => isDue(schedule, now)),
    pending: schedules.filter((schedule) => !isDue(schedule, now)),
  };
}

/** Earliest upcoming deadline, or `null` when nothing is scheduled. */
export function nextDeadline(schedules: readonly Schedule[]): number | null {
  return schedules.reduce<number | null>(
    (earliest, schedule) =>
      earliest === null || schedule.firesAt < earliest
        ? schedule.firesAt
        : earliest,
    null
  );
}

export function byRemainingTime(a: Schedule, b: Schedule): number {
  return a.firesAt - b.firesAt;
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
