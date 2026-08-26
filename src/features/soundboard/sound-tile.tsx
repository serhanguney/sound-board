'use client';

import { memo } from 'react';
import { AlertCircle, CalendarClock, Pause, Play, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sound } from '@/domain/sound';
import { SoundIcon } from '@/features/sounds/sound-icon';
import { cn } from '@/lib/utils';

export interface SoundTileProps {
  sound: Sound;
  isPlaying: boolean;
  isLooping: boolean;
  hasFailed: boolean;
  onPlay: (sound: Sound) => void;
  onStop: (sound: Sound) => void;
  onToggleLoop: (sound: Sound) => void;
  onSchedule: (sound: Sound) => void;
}

/**
 * Memoised so that the scheduler's twice-a-second clock tick does not re-render
 * every tile on the board.
 */
export const SoundTile = memo(function SoundTile({
  sound,
  isPlaying,
  isLooping,
  hasFailed,
  onPlay,
  onStop,
  onToggleLoop,
  onSchedule,
}: SoundTileProps) {
  return (
    <div className="group relative">
      <Button
        variant={isPlaying ? 'default' : 'outline'}
        className={cn(
          'flex h-24 w-full flex-col items-center justify-center gap-2 transition-all',
          isLooping && 'ring-2 ring-emerald-500'
        )}
        onClick={() => (isPlaying ? onStop(sound) : onPlay(sound))}
        disabled={hasFailed}
        aria-pressed={isPlaying}
      >
        {hasFailed ? (
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
        ) : (
          <SoundIcon iconKey={sound.iconKey} />
        )}
        <span className="max-w-full truncate text-sm">
          {sound.displayName}
        </span>
      </Button>

      <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-black/50 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          size="icon"
          variant={isPlaying ? 'destructive' : 'default'}
          onClick={() => (isPlaying ? onStop(sound) : onPlay(sound))}
          disabled={hasFailed}
          aria-label={
            isPlaying ? `Stop ${sound.displayName}` : `Play ${sound.displayName}`
          }
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
        </Button>

        <Button
          size="icon"
          variant={isLooping ? 'default' : 'outline'}
          onClick={() => onToggleLoop(sound)}
          disabled={hasFailed}
          aria-pressed={isLooping}
          aria-label={`Loop ${sound.displayName}`}
        >
          <Repeat className="h-4 w-4" aria-hidden />
        </Button>

        <Button
          size="icon"
          variant="outline"
          onClick={() => onSchedule(sound)}
          disabled={hasFailed}
          aria-label={`Schedule ${sound.displayName}`}
        >
          <CalendarClock className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
});
