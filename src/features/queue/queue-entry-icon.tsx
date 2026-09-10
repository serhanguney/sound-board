import type { QueueEntry } from '@/domain/queue';
import { findSound, type Sound } from '@/domain/sound';
import type { SoundIconKey } from '@/domain/sound-icon';
import type { SoundTagOrUntagged } from '@/domain/sound-tag';

/** Resolves how a queue entry should be rendered, given the current library. */
export function describeEntry(
  entry: QueueEntry,
  sounds: readonly Sound[]
): {
  iconKey: SoundIconKey;
  tag: SoundTagOrUntagged;
  missing: boolean;
  /** The library entry behind a specific-sound target; absent for a random one. */
  sound: Sound | undefined;
} {
  if (entry.target.kind === 'random') {
    // A random entry has no sound until it fires, so it keeps the shuffle icon
    // rather than borrowing one from a clip it may not draw.
    return {
      iconKey: 'shuffle',
      tag: entry.target.tag ?? 'untagged',
      missing: false,
      sound: undefined,
    };
  }

  const sound = findSound(sounds, entry.target.soundId);
  return {
    iconKey: sound?.iconKey ?? 'music',
    tag: sound?.tag ?? 'untagged',
    missing: sound === undefined,
    sound,
  };
}
