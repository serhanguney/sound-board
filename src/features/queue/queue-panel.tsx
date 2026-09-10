'use client';

import { ListMusic, Pause, Play, RotateCcw, X } from 'lucide-react';
import {
  formatRemaining,
  queueStatus,
  totalDurationMs,
  type Queue,
} from '@/domain/queue';
import type { Sound } from '@/domain/sound';
import { cn } from '@/lib/utils';
import { QueueTimeline } from './queue-timeline';

const EMPTY_COPY = 'Nothing queued yet';

export function QueuePanel({
  queue,
  sounds,
  nowMs,
  onPlay,
  onHold,
  onReplay,
  onClear,
  onAdd,
}: {
  queue: Queue;
  sounds: readonly Sound[];
  nowMs: number;
  onPlay: () => void;
  onHold: () => void;
  /** Runs a drained queue again from its first entry. */
  onReplay: () => void;
  onClear: () => void;
  onAdd: () => void;
}) {
  const status = queueStatus(queue);
  const isRunning = status === 'running';
  const isFinished = status === 'finished';
  const pending = queue.entries.length - queue.cursor;

  return (
    <section
      aria-label="Sound queue"
      className="rounded-lg border border-line bg-surface p-6 shadow-panel"
    >
      <header className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
            isRunning
              ? 'border-live bg-live-soft text-live'
              : 'border-accent bg-accent-soft text-accent'
          )}
        >
          <ListMusic className="h-3 w-3" aria-hidden />
          Queue
        </span>

        <h2 className="font-display text-[19px] font-semibold tracking-tight text-ink">
          Queued sounds
        </h2>

        {/* The countdown lives on the timeline's next marker alone — this is
            where the queue is, not when the next sound lands. */}
        <p className="text-[13px] text-ink-subtle">
          {queue.entries.length === 0
            ? EMPTY_COPY
            : `${isFinished ? 'Finished' : `${pending} pending`} · ${formatRemaining(totalDurationMs(queue.entries))} total`}
        </p>

        <span className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isRunning ? onHold : isFinished ? onReplay : onPlay}
            // A drained queue is still playable: the button replays it rather
            // than going dead and leaving "clear all" as the only way forward.
            disabled={queue.entries.length === 0}
            className={cn(
              'inline-flex items-center gap-2 rounded-sm px-3.5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
              isRunning
                ? 'border border-line-strong bg-surface text-ink hover:bg-background'
                : 'bg-accent text-accent-foreground hover:opacity-90'
            )}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" aria-hidden />
                Hold queue
              </>
            ) : isFinished ? (
              <>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Replay queue
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden />
                {status === 'held' ? 'Resume queue' : 'Play queue'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={queue.entries.length === 0}
            className="inline-flex items-center gap-1.5 rounded-sm border border-line-strong bg-surface px-3 py-2.5 text-[13px] text-ink-muted transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden />
            Clear all
          </button>
        </div>
      </header>

      {queue.entries.length === 0 ? (
        <p className="mt-5 text-sm text-ink-subtle">
          Add sounds from the board below to build a queue. Nothing plays until
          you press play, so you can set one up before your meeting starts.
        </p>
      ) : (
        <div className="mt-5">
          <QueueTimeline
            queue={queue}
            sounds={sounds}
            nowMs={nowMs}
          />
        </div>
      )}

      {/* The same dialog either way — what changes is whether there is
          anything in there yet to edit. */}
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 text-[13px] font-medium text-accent hover:underline"
      >
        {queue.entries.length === 0 ? '+ Add to queue' : 'Edit queue'}
      </button>
    </section>
  );
}
