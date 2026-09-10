'use client';

import { useCallback, useMemo, useState } from 'react';
import { ListPlus, Minus, Plus, Shuffle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { QueueEntryId, SoundId } from '@/domain/ids';
import {
  createEntry,
  DEFAULT_GAP_MINUTES,
  formatRemaining,
  GAP_PRESETS_MINUTES,
  MAX_GAP_MINUTES,
  MIN_GAP_MINUTES,
  minutesToMs,
  totalDurationMs,
  type Queue,
  type QueueEntry,
} from '@/domain/queue';
import { countByTag, type Sound } from '@/domain/sound';
import { SOUND_TAGS, type SoundTag } from '@/domain/sound-tag';
import { TagChip } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';
import { QueueEntryList } from './queue-entry-list';
import { SoundCombobox } from './sound-combobox';

type Mode = 'sound' | 'random';

const clampMinutes = (value: number): number =>
  Math.min(MAX_GAP_MINUTES, Math.max(MIN_GAP_MINUTES, value));

/**
 * Composes a queue.
 *
 * Every piece of state here belongs to one open-close session and starts at a
 * known default, so the board mounts this under a `key` that changes with each
 * open rather than re-seeding it from an effect. Nothing has to notice that the
 * dialog opened, and there is no render in between where a handler still closes
 * over the previous session's values — which is what let a card's queue button
 * add its sound with the gap left behind by the last time the dialog was used.
 */
export function AddToQueueDialog({
  open,
  onOpenChange,
  queue,
  sounds,
  durations,
  recentIds,
  initialCandidateId,
  onAdd,
  onMove,
  onRemove,
  onPreview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: Queue;
  sounds: readonly Sound[];
  durations: ReadonlyMap<SoundId, number>;
  /** Most-recently queued first; surfaced above the full list in the picker. */
  recentIds: readonly SoundId[];
  /** Entry a card's queue button already added, highlighted on open. */
  initialCandidateId: QueueEntryId | null;
  onAdd: (entry: QueueEntry) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: QueueEntryId) => void;
  onPreview: (sound: Sound) => void;
}) {
  // Picking a specific sound is the primary path, so the combobox is what the
  // dialog opens on either way.
  const [mode, setMode] = useState<Mode>('sound');
  const [tag, setTag] = useState<SoundTag | null>(null);
  const [gapMinutes, setGapMinutes] = useState(DEFAULT_GAP_MINUTES);
  const [candidateId, setCandidateId] = useState<QueueEntryId | null>(
    initialCandidateId
  );
  // Closed on open: the dialog's first job is to show where the sound landed,
  // and an overlay covering the queue would defeat that.
  const [pickerOpen, setPickerOpen] = useState(false);

  // A random pick from a tag nothing carries resolves to no sound at all, so
  // the entry would sit in the queue and fire silence.
  const counts = useMemo(() => countByTag(sounds), [sounds]);

  const add = useCallback(
    (input: { target: QueueEntry['target']; label: string }) => {
      const entry = createEntry({ ...input, gapMs: minutesToMs(gapMinutes) });
      onAdd(entry);
      setCandidateId(entry.id);
    },
    [gapMinutes, onAdd]
  );

  const pickSound = useCallback(
    (sound: Sound) =>
      add({
        target: { kind: 'sound', soundId: sound.id },
        label: sound.displayName,
      }),
    [add]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-xl flex-col gap-0 border-line bg-surface p-0"
        onEscapeKeyDown={(event) => {
          // Radix claims escape on the document in the capture phase, so the
          // combobox cannot dismiss itself. Escape belongs to the innermost
          // thing on screen, which is the picker's overlay while it is open.
          if (!pickerOpen) return;
          event.preventDefault();
          setPickerOpen(false);
        }}
      >
        <DialogHeader className="shrink-0 space-y-1 p-6 pb-4 text-left">
          <DialogTitle className="font-display text-xl font-semibold text-ink">
            Create a queue
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-subtle">
            Line up sounds to play back-to-back. Nothing fires until you start
            the queue.
          </DialogDescription>
        </DialogHeader>

        {/*
          * Only the queue scrolls. The picker's dropdown overlays the dialog,
          * and a scroll container above it would clip the overlay to its own
          * box. The queue's flex basis is the floor that guarantees there is
          * something for the dropdown to cover even when the queue is empty,
          * and unlike a min-height it still shrinks when the dialog hits its
          * own height cap.
          */}
        <div className="shrink-0 space-y-5 px-6 pb-4">
          <fieldset className="space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
              What to add
            </legend>

            <div className="grid grid-cols-2 gap-1 rounded-sm bg-background p-1">
              {(
                [
                  ['sound', 'Specific sound'],
                  ['random', 'Random from tag'],
                ] as const
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);
                    setPickerOpen(false);
                  }}
                  aria-pressed={mode === value}
                  className={cn(
                    'rounded-sm px-3 py-2 text-[13px] font-medium transition-colors',
                    mode === value
                      ? 'bg-surface text-ink shadow-panel'
                      : 'text-ink-muted hover:text-ink'
                  )}
                >
                  {text}
                </button>
              ))}
            </div>

            {mode === 'sound' ? (
              <SoundCombobox
                sounds={sounds}
                durations={durations}
                recentIds={recentIds}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onPick={pickSound}
                onPreview={onPreview}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {SOUND_TAGS.map((value) => (
                    <TagChip
                      key={value}
                      tag={value}
                      selected={tag === value}
                      disabled={counts[value] === 0}
                      onClick={() => setTag(tag === value ? null : value)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    add({
                      target: { kind: 'random', tag },
                      label: tag ? `Random · ${tag}` : 'Random',
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                >
                  <Shuffle className="h-4 w-4" aria-hidden />
                  Add {tag ? `random ${tag}` : 'random sound'}
                </button>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
              Gap after previous sound
            </legend>
            <p className="text-[11px] text-ink-subtle">
              Ignored by whatever sits first: the queue opens at +0:00.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-sm border border-line bg-surface">
                <button
                  type="button"
                  onClick={() => setGapMinutes((m) => clampMinutes(m - 1))}
                  aria-label="Decrease gap by one minute"
                  className="px-2.5 py-2 text-ink-muted hover:text-ink"
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <span className="min-w-[4.5rem] text-center text-sm font-medium tabular-nums text-ink">
                  {gapMinutes} min
                </span>
                <button
                  type="button"
                  onClick={() => setGapMinutes((m) => clampMinutes(m + 1))}
                  aria-label="Increase gap by one minute"
                  className="px-2.5 py-2 text-ink-muted hover:text-ink"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {GAP_PRESETS_MINUTES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGapMinutes(preset)}
                  aria-pressed={gapMinutes === preset}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    gapMinutes === preset
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong'
                  )}
                >
                  {preset}m
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <section className="flex min-h-0 shrink grow basis-48 flex-col gap-2 px-6 pb-2">
          <div className="flex shrink-0 items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
              In this queue
            </h3>
            <span className="text-xs text-ink-subtle">
              {queue.entries.length}
              {queue.entries.length > 1 && ' · drag to reorder'}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {queue.entries.length === 0 ? (
              <p className="rounded-sm bg-background px-3 py-4 text-center text-[13px] text-ink-subtle">
                Nothing queued yet.
              </p>
            ) : (
              <QueueEntryList
                entries={queue.entries}
                sounds={sounds}
                candidateId={candidateId}
                onMove={onMove}
                onRemove={onRemove}
              />
            )}
          </div>
        </section>

        <footer className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-line px-6 py-4">
          {/* Derived from the entries on every render, so adding or removing a
              sound moves it without anything having to be kept in sync. */}
          <p className="text-[13px] text-ink-subtle">
            Total length{' '}
            <span className="font-display font-semibold tabular-nums text-ink">
              {formatRemaining(totalDurationMs(queue.entries))}
            </span>
          </p>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-2 rounded-sm bg-ink px-4 py-2.5 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            <ListPlus className="h-4 w-4" aria-hidden />
            Done
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
