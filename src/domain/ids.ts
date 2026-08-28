import { z } from 'zod';

/**
 * Branded ids. A `SoundId` and a `ScheduleId` are both strings at runtime, but
 * the compiler refuses to substitute one for the other — the previous code
 * built schedule ids as `${sound.id}-${Date.now()}` and then looked schedules
 * up by display name, which this makes impossible to express.
 */
export const soundIdSchema = z.string().min(1).brand<'SoundId'>();
export type SoundId = z.infer<typeof soundIdSchema>;

export const scheduleIdSchema = z.string().min(1).brand<'ScheduleId'>();
export type ScheduleId = z.infer<typeof scheduleIdSchema>;

export const queueEntryIdSchema = z.string().min(1).brand<'QueueEntryId'>();
export type QueueEntryId = z.infer<typeof queueEntryIdSchema>;

export const toSoundId = (value: string): SoundId => soundIdSchema.parse(value);

export const newScheduleId = (): ScheduleId =>
  scheduleIdSchema.parse(crypto.randomUUID());

export const newQueueEntryId = (): QueueEntryId =>
  queueEntryIdSchema.parse(crypto.randomUUID());
