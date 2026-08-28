'use client';

import {
  elapsedMs,
  entryOffsets,
  formatRemaining,
  remainingMsOf,
  totalDurationMs,
  type Queue,
} from '@/domain/queue';
import type { Sound } from '@/domain/sound';
import { SoundIcon } from '@/features/sounds/sound-icon';
import { TagDot } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';
import { describeEntry } from './queue-entry-icon';

/**
 * Horizontal track with a marker per entry, positioned by its share of the
 * queue's total length. Percentage positioning keeps the markers aligned with
 * the track at any width, so the timeline stays honest when the window resizes.
 */
export function QueueTimeline({
  queue,
  sounds,
  nowMs,
}: {
  queue: Queue;
  sounds: readonly Sound[];
  nowMs: number;
}) {
  const offsets = entryOffsets(queue.entries);
  const total = totalDurationMs(queue.entries);
  if (total === 0) return null;

  // Progress is derived from wall-clock elapsed time, so it stays correct
  // across a suspension instead of drifting with the tick count.
  const elapsed = elapsedMs(queue, nowMs);
  const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));

  return (
    <div className="relative px-5 pb-8 pt-1">
      <div
        className="absolute left-5 right-5 top-4 h-1.5 overflow-hidden rounded-full bg-line"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div
        role="progressbar"
        aria-label="Queue progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="sr-only"
      />

      <ol className="relative flex h-9 list-none items-center">
        {queue.entries.map((entry, index) => {
          const offset = offsets.at(index) ?? 0;
          const remaining = remainingMsOf(queue, index, nowMs) ?? 0;
          const consumed = index < queue.cursor;

          return (
            <li
              key={entry.id}
              className="absolute -translate-x-1/2"
              style={{ left: `${(offset / total) * 100}%` }}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border transition-opacity',
                  consumed
                    ? 'border-line bg-background text-ink-subtle opacity-50'
                    : 'border-line bg-surface text-ink-muted'
                )}
                title={entry.label}
              >
                <SoundIcon
                  iconKey={describeEntry(entry, sounds).iconKey}
                  className="h-4 w-4"
                />
              </span>

              <span
                className={cn(
                  'absolute left-1/2 top-11 -translate-x-1/2 whitespace-nowrap text-[11px] tabular-nums',
                  consumed ? 'text-ink-subtle line-through' : 'text-ink-muted'
                )}
              >
                {/* A consumed entry may have played or been skipped as
                    stale, so show its scheduled offset rather than claiming
                    either. */}
                {consumed || queue.startedAt === null
                  ? `+${formatRemaining(offset)}`
                  : `in ${formatRemaining(remaining)}`}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Compact "next up" strip beneath the timeline. */
export function QueueNextUp({
  queue,
  sounds,
  nowMs,
  limit = 3,
}: {
  queue: Queue;
  sounds: readonly Sound[];
  nowMs: number;
  limit?: number;
}) {
  const upcoming = queue.entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ index }) => index >= queue.cursor)
    .slice(0, limit);

  if (upcoming.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[9.5px] font-bold tracking-[0.08em] text-ink-subtle">
        NEXT UP
      </span>

      {upcoming.map(({ entry, index }, position) => {
        const { tag } = describeEntry(entry, sounds);
        const remaining = remainingMsOf(queue, index, nowMs) ?? 0;

        return (
          <span key={entry.id} className="flex items-center gap-2.5">
            {position > 0 && <span className="text-line-strong">·</span>}
            <span className="flex items-center gap-1.5">
              <TagDot tag={tag} />
              <span className="text-[13px] font-medium text-ink">
                {entry.label}
              </span>
              <span className="text-[13px] tabular-nums text-ink-subtle">
                {queue.startedAt === null
                  ? 'on play'
                  : `in ${formatRemaining(remaining)}`}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
