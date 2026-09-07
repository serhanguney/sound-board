'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp, CornerDownLeft, GripVertical, X } from 'lucide-react';
import type { QueueEntryId } from '@/domain/ids';
import {
  entryOffsets,
  formatOffset,
  formatRemaining,
  ordinal,
  type QueueEntry,
} from '@/domain/queue';
import type { Sound } from '@/domain/sound';
import { SoundIcon } from '@/features/sounds/sound-icon';
import { cn } from '@/lib/utils';
import { describeEntry } from './queue-entry-icon';
import { useReorder } from './use-reorder';

/**
 * Explains where the candidate sits, mirroring the design's subtitle: its
 * position, and what it is spaced against.
 */
function candidateSubtitle(
  entries: readonly QueueEntry[],
  index: number
): string {
  const position = ordinal(index);
  if (index === 0) {
    return entries.length === 1
      ? '1st in the queue · nothing else lined up yet'
      : '1st in the queue · drag or use the arrows';
  }

  const previous = entries.at(index - 1);
  const gap = formatRemaining(entries.at(index)?.gapMs ?? 0);
  return `${position} in the queue · ${gap} after ${previous?.label ?? 'the previous sound'}`;
}

export function QueueEntryList({
  entries,
  sounds,
  candidateId,
  onMove,
  onRemove,
}: {
  entries: readonly QueueEntry[];
  sounds: readonly Sound[];
  /** The most recently added entry, highlighted until the dialog closes. */
  candidateId: QueueEntryId | null;
  onMove: (from: number, to: number) => void;
  onRemove: (id: QueueEntryId) => void;
}) {
  // The dialog is `transform`ed, and a transformed ancestor becomes the
  // containing block for `position: fixed` descendants — the lifted card would
  // be placed relative to the dialog rather than the viewport, landing far to
  // the right. Portalling to the body escapes that.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setPortalTarget(document.body), []);

  // A new entry lands at the end of the queue, which is below the fold as soon
  // as the list scrolls. `nearest` keeps the dialog itself still.
  const candidateRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    candidateRef.current?.scrollIntoView({ block: 'nearest' });
  }, [candidateId]);

  const offsets = entryOffsets(entries);
  const { fromIndex, toIndex, pointer, registerRow, start } = useReorder({
    count: entries.length,
    onCommit: onMove,
  });

  const dragging = fromIndex !== null;

  // While dragging, the list is rendered in its would-be order so the gap the
  // row will occupy is visible in place, rather than only after dropping.
  const ordered =
    dragging && toIndex !== null
      ? (() => {
          const without = entries.filter((_, index) => index !== fromIndex);
          const moved = entries.at(fromIndex);
          return moved
            ? [...without.slice(0, toIndex), moved, ...without.slice(toIndex)]
            : entries;
        })()
      : entries;

  const draggedEntry = fromIndex === null ? null : entries.at(fromIndex);

  return (
    <>
      <ul className="space-y-1.5">
        {ordered.map((entry, index) => {
          const isDragged = draggedEntry?.id === entry.id;
          const isCandidate = entry.id === candidateId;
          const { iconKey, missing } = describeEntry(entry, sounds);
          const sourceIndex = entries.findIndex((e) => e.id === entry.id);

          if (isDragged) {
            return (
              <li key={entry.id}>
                <div className="flex h-11 items-center justify-center gap-2 rounded-[9px] border border-accent bg-accent-soft text-[11.5px] font-semibold text-accent">
                  <CornerDownLeft className="h-3 w-3" aria-hidden />
                  Drop here — plays at {formatOffset(offsets.at(index) ?? 0)}
                </div>
              </li>
            );
          }

          return (
            <li
              key={entry.id}
              ref={(node) => {
                registerRow(index, node);
                if (isCandidate) candidateRef.current = node;
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 transition-colors',
                isCandidate
                  ? 'border border-accent bg-accent-soft'
                  : 'bg-background'
              )}
            >
              <button
                type="button"
                onPointerDown={(event) => start(index, event)}
                aria-label={`Reorder ${entry.label}`}
                className={cn(
                  'cursor-grab touch-none active:cursor-grabbing',
                  isCandidate ? 'text-accent' : 'text-line-strong'
                )}
              >
                <GripVertical className="h-3 w-3" aria-hidden />
              </button>

              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-surface text-ink-muted">
                <SoundIcon iconKey={iconKey} className="h-3.5 w-3.5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'truncate text-[12.5px]',
                      isCandidate ? 'font-semibold' : 'font-medium',
                      missing ? 'text-ink-subtle line-through' : 'text-ink'
                    )}
                  >
                    {entry.label}
                    {missing && ' (unavailable)'}
                  </span>
                  {isCandidate && (
                    <span className="rounded-[4px] bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-foreground">
                      New
                    </span>
                  )}
                </span>
                {isCandidate && (
                  <span className="block truncate text-[10.5px] text-ink-muted">
                    {candidateSubtitle(ordered, index)}
                  </span>
                )}
              </span>

              <span
                className={cn(
                  'font-display text-xs font-semibold tabular-nums',
                  isCandidate ? 'text-accent' : 'text-ink-muted'
                )}
              >
                {formatOffset(offsets.at(index) ?? 0)}
              </span>

              {isCandidate && entries.length > 1 && (
                <span className="flex items-center gap-[3px]">
                  <button
                    type="button"
                    onClick={() => onMove(sourceIndex, sourceIndex - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${entry.label} earlier`}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-surface text-ink-muted transition-opacity hover:text-ink disabled:opacity-40"
                  >
                    <ChevronUp className="h-3 w-3" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(sourceIndex, sourceIndex + 1)}
                    disabled={index === entries.length - 1}
                    aria-label={`Move ${entry.label} later`}
                    className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-surface text-ink-muted transition-opacity hover:text-ink disabled:opacity-40"
                  >
                    <ChevronDown className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                aria-label={`Remove ${entry.label} from the queue`}
                className="text-ink-subtle transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      {/* The lifted card follows the pointer outside the list's flow. */}
      {draggedEntry &&
        pointer &&
        portalTarget &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[60] flex w-[420px] max-w-[80vw] -translate-y-1/2 items-center gap-2.5 rounded-[9px] border border-accent bg-accent-soft px-2.5 py-2 shadow-[0_10px_24px_-4px_hsl(var(--sb-ink)/0.22)]"
            style={{ left: pointer.x + 12, top: pointer.y, rotate: '-1.5deg' }}
            aria-hidden
          >
            <GripVertical className="h-3 w-3 text-accent" />
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-surface text-ink-muted">
              <SoundIcon
                iconKey={describeEntry(draggedEntry, sounds).iconKey}
                className="h-3.5 w-3.5"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold text-ink">
                {draggedEntry.label}
              </span>
              <span className="block text-[10.5px] text-ink-muted">
                dragging · release to drop here
              </span>
            </span>
            <span className="font-display text-xs font-semibold tabular-nums text-accent">
              {formatOffset(offsets.at(toIndex ?? 0) ?? 0)}
            </span>
          </div>,
          portalTarget
        )}
    </>
  );
}
