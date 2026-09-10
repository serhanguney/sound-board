'use client';

import {
  elapsedMs,
  entryGaps,
  entryOffsets,
  formatOffset,
  formatRemaining,
  remainingMsOf,
  totalDurationMs,
  type Queue,
} from '@/domain/queue';
import { type Sound } from '@/domain/sound';
import type { SoundTagOrUntagged } from '@/domain/sound-tag';
import { SoundIcon } from '@/features/sounds/sound-icon';
import { TagDot } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';
import { describeEntry } from './queue-entry-icon';

/**
 * Horizontal track with a marker per entry, positioned by its share of the
 * queue's total length. Percentage positioning keeps the markers aligned with
 * the track at any width, so the timeline stays honest when the window resizes.
 *
 * Only the entry the queue is counting down to shows a live countdown. Every
 * other marker is labelled with its gap from the entry before it — a row of
 * counters all ticking at once says nothing more than the one that is actually
 * next, and what the rest need to say is how far apart they are.
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
  const { entries } = queue;
  const offsets = entryOffsets(entries);
  // Labels are spacings, positions are offsets: a marker says "+2:00 after the
  // one before it" while sitting at its true distance along the queue.
  const gaps = entryGaps(entries);
  const total = totalDurationMs(entries);
  if (entries.length === 0) return null;

  /**
   * Where a marker sits, as a percentage of the track.
   *
   * A queue of one — or one whose every gap is zero — has no length to divide
   * by, so the markers are spread evenly instead. Bailing out on a zero total
   * would leave the panel with nothing at all to show for a one-sound queue.
   */
  const positionOf = (index: number): number =>
    total > 0
      ? ((offsets.at(index) ?? 0) / total) * 100
      : entries.length === 1
        ? 0
        : (index / (entries.length - 1)) * 100;

  // Progress is derived from wall-clock elapsed time, so it stays correct
  // across a suspension instead of drifting with the tick count.
  const elapsed = elapsedMs(queue, nowMs);
  const progress =
    total > 0
      ? Math.min(100, Math.max(0, (elapsed / total) * 100))
      : positionOf(Math.min(queue.cursor, entries.length - 1));

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
        {entries.map((entry, index) => {
          const consumed = index < queue.cursor;
          const { iconKey, tag} = describeEntry(entry, sounds);

          // The one entry the queue is waiting on: pending, and next in line.
          const isNext = !consumed && index === queue.cursor;
          const counting = isNext && queue.startedAt !== null;

          return (
            <li
              key={entry.id}
              className="absolute -translate-x-1/2"
              style={{ left: `${positionOf(index)}%` }}
            >
              <span className="group relative flex">
                <span
                  tabIndex={0}
                  aria-label={`${entry.label}, ${tag}`}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    // A consumed marker stays fully opaque; its filled track and
                    // struck-through label already mark it as past.
                    consumed
                      ? 'border-line bg-background text-ink-muted'
                      : 'border-line bg-surface text-ink-muted'
                  )}
                >
                  <SoundIcon iconKey={iconKey} className="h-4 w-4" />
                </span>

                <EntryTooltip
                  label={entry.label}
                  tag={tag}
                  // A tooltip centred on the first or last marker would hang
                  // off the side of the panel, so the end markers anchor theirs
                  // inward from the marker's centre instead.
                  align={
                    index === 0
                      ? 'start'
                      : index === entries.length - 1
                        ? 'end'
                        : 'center'
                  }
                />
              </span>

              <span
                className={cn(
                  'absolute left-1/2 top-11 -translate-x-1/2 whitespace-nowrap text-[11px] tabular-nums',
                  consumed
                    ? 'text-ink-subtle line-through'
                    : counting
                      ? 'font-medium text-accent'
                      : 'text-ink-muted'
                )}
              >
                {/* A consumed entry may have played or been skipped as
                    stale, so show its spacing rather than claiming either. */}
                {counting
                  ? `in ${formatRemaining(remainingMsOf(queue, index, nowMs) ?? 0)}`
                  : formatOffset(gaps.at(index) ?? 0)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * What a marker stands for, on hover or keyboard focus.
 *
 * Hover state is CSS rather than React state: the timeline re-renders twice a
 * second, and a hovered marker that had to survive that would need state the
 * tick could not disturb. `group-focus-within` gives it to the keyboard too.
 */
function EntryTooltip({
  label,
  tag,
  align,
}: {
  label: string;
  tag: SoundTagOrUntagged;
  align: 'start' | 'center' | 'end';
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full z-30 mb-2 whitespace-nowrap rounded-sm border border-line bg-surface px-2.5 py-1.5 opacity-0 shadow-pop transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
        align === 'start' && 'left-1/2',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-1/2'
      )}
    >
      <span className="flex items-center gap-1.5">
        {/* The dot is the whole of the tag: naming it as well only repeated
            what the colour already says. */}
        <TagDot tag={tag} />
        <span className="text-[12px] font-semibold text-ink">{label}</span>
      </span>
    </span>
  );
}
