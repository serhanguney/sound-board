'use client';

import { useEffect, useRef } from 'react';
import { useAudioEngine } from '@/audio/audio-provider';
import type { QueueEntry } from '@/domain/queue';
import { findSound, pickRandomSound, type Sound } from '@/domain/sound';
import { useQueueRunner } from '@/scheduling/queue-provider';
import { toast } from '@/hooks/use-toast';

const resolve = (
  entry: QueueEntry,
  sounds: readonly Sound[],
  lastPlayed: Sound['id'] | null
): Sound | undefined =>
  entry.target.kind === 'random'
    ? pickRandomSound(sounds, { tag: entry.target.tag, exclude: lastPlayed })
    : findSound(sounds, entry.target.soundId);

/**
 * Bridges the queue runner to the audio engine.
 *
 * Mounted once. The sound list is held in a ref so refetching it does not
 * resubscribe — a resubscribe would risk double-handling a firing.
 */
export function useQueueAudioBridge(sounds: readonly Sound[]): void {
  const runner = useQueueRunner();
  const engine = useAudioEngine();

  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const lastPlayedRef = useRef<Sound['id'] | null>(null);

  useEffect(
    () =>
      runner.fired.on(({ entry }) => {
        const sound = resolve(entry, soundsRef.current, lastPlayedRef.current);

        if (!sound) {
          toast({
            title: 'Queue entry skipped',
            description: `"${entry.label}" fired but no matching sound is available.`,
            variant: 'destructive',
          });
          return;
        }

        lastPlayedRef.current = sound.id;
        void engine.play(sound.id);
      }),
    [runner, engine]
  );

  useEffect(
    () =>
      engine.events.on((event) => {
        if (event.type !== 'failed') return;
        toast({
          title: 'Playback problem',
          description: event.reason,
          variant: 'destructive',
        });
      }),
    [engine]
  );
}
