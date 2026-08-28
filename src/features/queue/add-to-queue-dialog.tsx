'use client';

import { useEffect, useMemo, useState } from 'react';
import { ListPlus, Minus, Plus, Shuffle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createEntry,
  entryOffsets,
  formatOffset,
  GAP_PRESETS_MINUTES,
  MAX_GAP_MINUTES,
  MIN_GAP_MINUTES,
  minutesToMs,
  totalDurationMs,
  type Queue,
  type QueueEntry,
  type QueueTarget,
} from '@/domain/queue';
import type { Sound } from '@/domain/sound';
import { SOUND_TAGS, type SoundTag } from '@/domain/sound-tag';
import { SoundIcon } from '@/features/sounds/sound-icon';
import { TagChip, TagDot } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';
import { describeEntry } from './queue-entry-icon';

type Mode = 'sound' | 'random';

const clampMinutes = (value: number): number =>
  Math.min(MAX_GAP_MINUTES, Math.max(MIN_GAP_MINUTES, value));

export function AddToQueueDialog({
  open,
  onOpenChange,
  queue,
  sounds,
  presetSound,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: Queue;
  sounds: readonly Sound[];
  /** Pre-selects a sound when opened from a card. */
  presetSound: Sound | null;
  onAdd: (entry: QueueEntry) => void;
  onRemove: (id: QueueEntry['id']) => void;
}) {
  const [mode, setMode] = useState<Mode>('sound');
  const [soundId, setSoundId] = useState<Sound['id'] | null>(null);
  const [tag, setTag] = useState<SoundTag | null>(null);
  const [gapMinutes, setGapMinutes] = useState(5);

  // Re-seed each time the dialog opens so it never shows a stale selection.
  useEffect(() => {
    if (!open) return;
    setMode(presetSound ? 'sound' : 'random');
    setSoundId(presetSound?.id ?? null);
    setTag(null);
    setGapMinutes(5);
  }, [open, presetSound]);

  const selectedSound = useMemo(
    () => sounds.find((sound) => sound.id === soundId) ?? null,
    [sounds, soundId]
  );

  const target: QueueTarget | null =
    mode === 'sound'
      ? selectedSound
        ? { kind: 'sound', soundId: selectedSound.id }
        : null
      : { kind: 'random', tag };

  const label =
    mode === 'sound'
      ? (selectedSound?.displayName ?? '')
      : tag
        ? `Random · ${tag}`
        : 'Random';

  const landsAt = totalDurationMs(queue.entries) + minutesToMs(gapMinutes);
  const offsets = entryOffsets(queue.entries);

  const submit = () => {
    if (!target) return;
    onAdd(createEntry({ target, label, gapMs: minutesToMs(gapMinutes) }));
    // Keep the dialog open so several entries can be queued in one sitting.
    setGapMinutes(5);
    if (mode === 'sound') setSoundId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 border-line bg-surface p-0">
        <DialogHeader className="space-y-1 p-6 pb-4 text-left">
          <DialogTitle className="font-display text-xl font-semibold text-ink">
            Create a queue
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-subtle">
            Line up sounds to play back-to-back. Nothing fires until you start
            the queue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6">
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
              <label className="block">
                <span className="sr-only">Sound</span>
                <select
                  value={soundId ?? ''}
                  onChange={(event) =>
                    setSoundId(
                      event.target.value === ''
                        ? null
                        : (event.target.value as Sound['id'])
                    )
                  }
                  className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choose a sound…</option>
                  {sounds.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.displayName} · {sound.tag}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="flex flex-wrap gap-2">
                <TagChip
                  tag="untagged"
                  selected={tag === null}
                  onClick={() => setTag(null)}
                  className={cn(tag === null && 'border-ink bg-ink text-surface')}
                />
                {SOUND_TAGS.map((value) => (
                  <TagChip
                    key={value}
                    tag={value}
                    selected={tag === value}
                    onClick={() => setTag(value)}
                  />
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
              Gap after previous sound
            </legend>

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

              <span className="flex-1" />
              <span className="text-[13px] tabular-nums text-ink-subtle">
                at {formatOffset(landsAt)}
              </span>
            </div>
          </fieldset>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
                In this queue
              </h3>
              <span className="text-xs tabular-nums text-ink-subtle">
                {queue.entries.length}
              </span>
            </div>

            {queue.entries.length === 0 ? (
              <p className="rounded-sm bg-background px-3 py-4 text-center text-[13px] text-ink-subtle">
                Nothing queued yet.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                {queue.entries.map((entry, index) => {
                  const { iconKey, tag: entryTag, missing } = describeEntry(
                    entry,
                    sounds
                  );

                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-sm bg-background px-3 py-2.5"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-ink-muted">
                        <SoundIcon iconKey={iconKey} className="h-3.5 w-3.5" />
                      </span>

                      <TagDot tag={entryTag} />
                      <span
                        className={cn(
                          'flex-1 truncate text-[13px] font-medium',
                          missing ? 'text-ink-subtle line-through' : 'text-ink'
                        )}
                      >
                        {entry.label}
                        {missing && ' (unavailable)'}
                      </span>

                      <span className="text-[13px] tabular-nums text-ink-subtle">
                        {formatOffset(offsets.at(index) ?? 0)}
                      </span>

                      <button
                        type="button"
                        onClick={() => onRemove(entry.id)}
                        aria-label={`Remove ${entry.label} from the queue`}
                        className="text-ink-subtle transition-colors hover:text-ink"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <footer className="mt-6 flex justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-background"
          >
            Done
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={target === null}
            className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === 'random' ? (
              <Shuffle className="h-4 w-4" aria-hidden />
            ) : (
              <ListPlus className="h-4 w-4" aria-hidden />
            )}
            Add to queue
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
