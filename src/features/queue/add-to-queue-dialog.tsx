'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  GAP_PRESETS_MINUTES,
  MAX_GAP_MINUTES,
  MIN_GAP_MINUTES,
  minutesToMs,
  type Queue,
  type QueueEntry,
} from '@/domain/queue';
import type { Sound } from '@/domain/sound';
import { SOUND_TAGS, type SoundTag } from '@/domain/sound-tag';
import { TagChip } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';
import { QueueEntryList } from './queue-entry-list';
import { SoundCombobox } from './sound-combobox';

type Mode = 'sound' | 'random';

const clampMinutes = (value: number): number =>
  Math.min(MAX_GAP_MINUTES, Math.max(MIN_GAP_MINUTES, value));

export function AddToQueueDialog({
  open,
  onOpenChange,
  queue,
  sounds,
  durations,
  presetSound,
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
  /** Pre-selects a sound when opened from a card. */
  presetSound: Sound | null;
  onAdd: (entry: QueueEntry) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (id: QueueEntryId) => void;
  onPreview: (sound: Sound) => void;
}) {
  const [mode, setMode] = useState<Mode>('sound');
  const [tag, setTag] = useState<SoundTag | null>(null);
  const [gapMinutes, setGapMinutes] = useState(2);
  const [candidateId, setCandidateId] = useState<QueueEntryId | null>(null);
  const [recentIds, setRecentIds] = useState<readonly SoundId[]>([]);

  const add = useCallback(
    (input: { target: QueueEntry['target']; label: string }) => {
      const entry = createEntry({ ...input, gapMs: minutesToMs(gapMinutes) });
      onAdd(entry);
      setCandidateId(entry.id);
    },
    [gapMinutes, onAdd]
  );

  const pickSound = useCallback(
    (sound: Sound) => {
      add({ target: { kind: 'sound', soundId: sound.id }, label: sound.displayName });
      setRecentIds((current) => [
        sound.id,
        ...current.filter((id) => id !== sound.id),
      ]);
    },
    [add]
  );

  // Re-seed each time the dialog opens so it never shows a stale selection.
  useEffect(() => {
    if (!open) return;
    // Picking a specific sound is the primary path, so the combobox is what
    // the dialog opens on either way.
    setMode('sound');
    setTag(null);
    setGapMinutes(2);
    setCandidateId(null);
  }, [open, presetSound]);

  // A card's queue button opens the dialog with that sound already added, so
  // the first thing the user sees is where it landed. The ref guards against
  // re-adding it when an unrelated render re-runs the effect.
  const appliedPresetRef = useRef<SoundId | null>(null);
  useEffect(() => {
    if (!open) {
      appliedPresetRef.current = null;
      return;
    }
    if (!presetSound || appliedPresetRef.current === presetSound.id) return;

    appliedPresetRef.current = presetSound.id;
    pickSound(presetSound);
  }, [open, presetSound, pickSound]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 border-line bg-surface p-0">
        <DialogHeader className="shrink-0 space-y-1 p-6 pb-4 text-left">
          <DialogTitle className="font-display text-xl font-semibold text-ink">
            Create a queue
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-subtle">
            Line up sounds to play back-to-back. Nothing fires until you start
            the queue.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-2">
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
                  onClick={() => setMode(value)}
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
              Applied once the sound is moved below the top of the queue.
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

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
                In this queue
              </h3>
              <span className="text-xs text-ink-subtle">
                {queue.entries.length}
                {queue.entries.length > 1 && ' · drag to reorder'}
              </span>
            </div>

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
          </section>
        </div>

        <footer className="mt-auto flex shrink-0 justify-end border-t border-line px-6 py-4">
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
