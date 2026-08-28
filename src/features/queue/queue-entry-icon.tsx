import type { QueueEntry } from '@/domain/queue';
import { findSound, type Sound } from '@/domain/sound';
import type { SoundIconKey } from '@/domain/sound-icon';
import type { SoundTagOrUntagged } from '@/domain/sound-tag';

/** Resolves how a queue entry should be rendered, given the current library. */
export function describeEntry(
  entry: QueueEntry,
  sounds: readonly Sound[]
): { iconKey: SoundIconKey; tag: SoundTagOrUntagged; missing: boolean } {
  if (entry.target.kind === 'random') {
    return {
      iconKey: 'shuffle',
      tag: entry.target.tag ?? 'untagged',
      missing: false,
    };
  }

  const sound = findSound(sounds, entry.target.soundId);
  return {
    iconKey: sound?.iconKey ?? 'music',
    tag: sound?.tag ?? 'untagged',
    missing: sound === undefined,
  };
}
