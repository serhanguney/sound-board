'use client';

import type { SoundId } from '@/domain/ids';
import type { Sound } from '@/domain/sound';
import { tagsInUse } from '@/domain/sound';
import type { SoundTagOrUntagged } from '@/domain/sound-tag';
import { SoundCard } from '@/features/sounds/sound-card';
import { TagChip } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';

export function SoundGrid({
  sounds,
  visible,
  durations,
  playingSoundId,
  failedSoundIds,
  activeTag,
  onTagChange,
  onPlay,
  onStop,
  onQueue,
}: {
  /** The whole library, used for the "N in library" count. */
  sounds: readonly Sound[];
  /** What survives the search and tag filters. */
  visible: readonly Sound[];
  durations: ReadonlyMap<SoundId, number>;
  playingSoundId: SoundId | null;
  failedSoundIds: ReadonlySet<SoundId>;
  activeTag: SoundTagOrUntagged | null;
  onTagChange: (tag: SoundTagOrUntagged | null) => void;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
  onQueue: (sound: Sound) => void;
}) {
  return (
    <section aria-label="All sounds" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-[19px] font-semibold tracking-tight text-ink">
          All sounds
        </h2>
        <p className="text-[13px] text-ink-subtle">
          {sounds.length} in library
          {visible.length !== sounds.length && ` · ${visible.length} shown`}
        </p>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onTagChange(null)}
            aria-pressed={activeTag === null}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeTag === null
                ? 'border-ink bg-ink text-surface'
                : 'border-line bg-surface text-ink-muted hover:border-line-strong'
            )}
          >
            All
          </button>
          {tagsInUse(sounds).map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              selected={activeTag === tag}
              onClick={() => onTagChange(activeTag === tag ? null : tag)}
            />
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-line bg-surface px-4 py-12 text-center text-sm text-ink-subtle">
          No sounds match that filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              durationSeconds={durations.get(sound.id)}
              isPlaying={playingSoundId === sound.id}
              hasFailed={failedSoundIds.has(sound.id)}
              onPlay={onPlay}
              onStop={onStop}
              onQueue={onQueue}
            />
          ))}
        </div>
      )}
    </section>
  );
}
