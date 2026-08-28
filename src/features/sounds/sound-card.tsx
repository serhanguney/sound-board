'use client';

import { memo } from 'react';
import { AlertCircle, ListPlus, Pause, Play } from 'lucide-react';
import type { Sound } from '@/domain/sound';
import { formatDuration } from '@/domain/sound';
import { cn } from '@/lib/utils';
import { SoundIcon } from './sound-icon';
import { TagDot } from './tag-badge';

export interface SoundCardProps {
  sound: Sound;
  durationSeconds: number | undefined;
  isPlaying: boolean;
  hasFailed: boolean;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
  onQueue: (sound: Sound) => void;
}

/**
 * Memoised: the queue clock ticks twice a second, and the board can hold the
 * whole library. Only cards whose own props change should re-render.
 */
export const SoundCard = memo(function SoundCard({
  sound,
  durationSeconds,
  isPlaying,
  hasFailed,
  onPlay,
  onStop,
  onQueue,
}: SoundCardProps) {
  // The design inverts the card while playing, and on hover/focus reveals the
  // same controls. One `group` drives both so they cannot diverge.
  const inverted = isPlaying;

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-md border p-4 transition-colors',
        inverted
          ? 'border-ink bg-ink'
          : 'border-transparent bg-surface hover:border-line',
        hasFailed && 'opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-opacity',
            inverted ? 'bg-surface/10 text-surface' : 'bg-background text-ink-muted',
            'group-hover:opacity-0 group-focus-within:opacity-0',
            inverted && 'opacity-0'
          )}
        >
          {hasFailed ? (
            <AlertCircle className="h-[18px] w-[18px] text-destructive" aria-hidden />
          ) : (
            <SoundIcon iconKey={sound.iconKey} />
          )}
        </span>

        <div
          className={cn(
            'absolute left-4 top-4 flex gap-1.5 transition-opacity',
            inverted
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          )}
        >
          <button
            type="button"
            onClick={() => (isPlaying ? onStop(sound) : onPlay(sound))}
            disabled={hasFailed}
            aria-label={
              isPlaying ? `Stop ${sound.displayName}` : `Play ${sound.displayName}`
            }
            className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={() => onQueue(sound)}
            disabled={hasFailed}
            aria-label={`Add ${sound.displayName} to the queue`}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-sm transition-colors disabled:opacity-50',
              inverted
                ? 'bg-surface/10 text-surface hover:bg-surface/20'
                : 'bg-ink/10 text-ink hover:bg-ink/20'
            )}
          >
            <ListPlus className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <p
        className={cn(
          'truncate text-sm font-semibold leading-tight',
          inverted ? 'text-surface' : 'text-ink'
        )}
        title={sound.displayName}
      >
        {sound.displayName}
      </p>

      <div className="flex items-center gap-2">
        <TagDot tag={sound.tag} />
        <span
          className={cn(
            'truncate text-[11px]',
            inverted ? 'text-surface/60' : 'text-ink-subtle'
          )}
        >
          {sound.tag}
        </span>
        <span className="flex-1" />
        <span
          className={cn(
            'text-[11px] tabular-nums',
            inverted ? 'text-surface/60' : 'text-ink-subtle'
          )}
        >
          {formatDuration(durationSeconds)}
        </span>
      </div>
    </div>
  );
});
