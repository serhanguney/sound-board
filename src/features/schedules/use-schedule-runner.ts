'use client';

import { useEffect, useRef } from 'react';
import { useAudioEngine } from '@/audio/audio-provider';
import { findSound, pickRandomSound, type Sound } from '@/domain/sound';
import type { Schedule } from '@/domain/schedule';
import { useScheduler } from '@/scheduling/scheduler-provider';
import { toast } from '@/hooks/use-toast';

const resolveTarget = (
  schedule: Schedule,
  sounds: readonly Sound[],
  lastPlayedId: Sound['id'] | null
): Sound | undefined =>
  schedule.target.kind === 'random'
    ? pickRandomSound(sounds, lastPlayedId)
    : findSound(sounds, schedule.target.soundId);

/**
 * Bridges the scheduler to the audio engine.
 *
 * Mounted exactly once. The sound list is held in a ref so that refetching it
 * does not resubscribe — the previous implementation re-created its interval on
 * every dependency change, which is what made schedules fire twice.
 */
export function useScheduleRunner(sounds: readonly Sound[]): void {
  const scheduler = useScheduler();
  const engine = useAudioEngine();

  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const lastPlayedRef = useRef<Sound['id'] | null>(null);

  useEffect(() => {
    return scheduler.fired.on(({ schedule }) => {
      const sound = resolveTarget(
        schedule,
        soundsRef.current,
        lastPlayedRef.current
      );

      if (!sound) {
        toast({
          title: 'Schedule skipped',
          description: `"${schedule.label}" fired but its sound is no longer available.`,
          variant: 'destructive',
        });
        return;
      }

      lastPlayedRef.current = sound.id;
      void engine.play(sound.id);
    });
  }, [scheduler, engine]);

  useEffect(() => {
    return engine.events.on((event) => {
      if (event.type !== 'failed') return;
      toast({
        title: 'Playback problem',
        description: event.reason,
        variant: 'destructive',
      });
    });
  }, [engine]);
}
