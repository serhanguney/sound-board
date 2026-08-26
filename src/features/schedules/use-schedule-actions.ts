'use client';

import { useCallback, useMemo } from 'react';
import type { ScheduleId } from '@/domain/ids';
import {
  createSchedule,
  minutesToMs,
  withRepeat,
  type ScheduleTarget,
} from '@/domain/schedule';
import type { Sound } from '@/domain/sound';
import { useScheduler } from '@/scheduling/scheduler-provider';

export function useScheduleActions() {
  const scheduler = useScheduler();

  const schedule = useCallback(
    (input: { sound: Sound | null; minutes: number; repeat: boolean }) => {
      const target: ScheduleTarget = input.sound
        ? { kind: 'sound', soundId: input.sound.id }
        : { kind: 'random' };

      const created = createSchedule({
        target,
        label: input.sound?.displayName ?? 'Random sound',
        intervalMs: minutesToMs(input.minutes),
        now: Date.now(),
      });

      scheduler.add(withRepeat(created, input.repeat));
    },
    [scheduler]
  );

  const cancel = useCallback(
    (id: ScheduleId) => scheduler.remove(id),
    [scheduler]
  );

  const cancelAll = useCallback(() => scheduler.clear(), [scheduler]);

  return useMemo(
    () => ({ schedule, cancel, cancelAll }),
    [schedule, cancel, cancelAll]
  );
}
