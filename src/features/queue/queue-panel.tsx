'use client';

import { ListMusic, Pause, Play, X } from 'lucide-react';
import {
  formatRemaining,
  queueStatus,
  remainingMsOf,
  totalDurationMs,
  type Queue,
} from '@/domain/queue';
import type { Sound } from '@/domain/sound';
import { cn } from '@/lib/utils';
import { QueueNextUp, QueueTimeline } from './queue-timeline';

const STATUS_COPY: Readonly<Record<string, string>> = {
  empty: 'Nothing queued yet',
  idle: 'Ready — press play when your meeting starts',
  running: 'Running',
  held: 'On hold',
  finished: 'Finished',
};

export function QueuePanel({
  queue,
  sounds,
  nowMs,
  onPlay,
  onHold,
  onClear,
  onAdd,
}: {
  queue: Queue;
  sounds: readonly Sound[];
  nowMs: number;
  onPlay: () => void;
  onHold: () => void;
  onClear: () => void;
  onAdd: () => void;
}) {
  const status = queueStatus(queue);
  const isRunning = status === 'running';
  const pending = queue.entries.length - queue.cursor;

  const nextRemaining =
    isRunning && pending > 0
      ? (remainingMsOf(queue, queue.cursor, nowMs) ?? 0)
      : null;

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

        <p className="text-[13px] text-ink-subtle">
          {queue.entries.length > 0
            ? `${pending} pending · ${formatRemaining(totalDurationMs(queue.entries))} total`
            : STATUS_COPY.empty}
        </p>

        <span className="flex-1" />

        {nextRemaining !== null && (
          <span className="text-[13px] font-medium tabular-nums text-accent">
            next in {formatRemaining(nextRemaining)}
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={isRunning ? onHold : onPlay}
            disabled={pending === 0}
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
        <div className="mt-5 space-y-5">
          <QueueTimeline queue={queue} sounds={sounds} nowMs={nowMs} />
          <QueueNextUp queue={queue} sounds={sounds} nowMs={nowMs} />
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 text-[13px] font-medium text-accent hover:underline"
      >
        + Add to queue
      </button>
    </section>
  );
}
