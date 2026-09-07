'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Play, RotateCcw, Search, SearchX, X } from 'lucide-react';
import { formatDuration, searchSounds, tagOptions, type Sound } from '@/domain/sound';
import type { SoundId } from '@/domain/ids';
import type { SoundTagOrUntagged } from '@/domain/sound-tag';
import { SoundIcon } from '@/features/sounds/sound-icon';
import { TagChip, TagDot } from '@/features/sounds/tag-badge';
import { cn } from '@/lib/utils';

interface Group {
  readonly label: string;
  readonly sounds: readonly Sound[];
}

/**
 * Searchable sound picker.
 *
 * The list is flattened into a single index for keyboard navigation so that
 * arrow keys move across group boundaries the way the eye does, rather than
 * getting stuck inside "Recent".
 *
 * The results overlay the dialog instead of sitting in its flow: the list is
 * taller than everything below it put together, so in-flow it pushed the queue
 * — the thing the user is building — off the bottom of the dialog. It opens on
 * focus and closes again as soon as a sound is picked, which is also what makes
 * the new entry landing at the end of the queue visible.
 *
 * Whether it is open is the caller's state, not this component's: Radix claims
 * the escape key on the document in the capture phase, so only the dialog can
 * decide that escape dismisses the dropdown rather than the whole dialog.
 */
export function SoundCombobox({
  sounds,
  durations,
  recentIds,
  open,
  onOpenChange,
  onPick,
  onPreview,
}: {
  sounds: readonly Sound[];
  durations: ReadonlyMap<SoundId, number>;
  /** Most-recently picked first; surfaced above the full list. */
  recentIds: readonly SoundId[];
  /** Whether the results overlay is showing. Owned by the dialog. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (sound: Sound) => void;
  onPreview: (sound: Sound) => void;
}) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<SoundTagOrUntagged | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const byTag = tag === null ? sounds : sounds.filter((s) => s.tag === tag);
    return searchSounds(byTag, query);
  }, [sounds, tag, query]);

  const groups = useMemo<readonly Group[]>(() => {
    if (query.trim()) {
      return [{ label: `${filtered.length} matches for "${query.trim()}"`, sounds: filtered }];
    }

    const recent = recentIds
      .flatMap((id) => filtered.find((sound) => sound.id === id) ?? [])
      .slice(0, 3);
    const recentSet = new Set(recent.map((sound) => sound.id));
    const rest = filtered.filter((sound) => !recentSet.has(sound.id));

    return [
      ...(recent.length > 0 ? [{ label: 'Recent', sounds: recent }] : []),
      { label: `All sounds · ${rest.length}`, sounds: rest },
    ];
  }, [query, filtered, recentIds]);

  const flat = useMemo(() => groups.flatMap((group) => group.sounds), [groups]);

  // Any change to the result set invalidates the highlighted row.
  useEffect(() => setActiveIndex(0), [query, tag]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const pick = (sound: Sound) => {
    onPick(sound);
    // Closing is the confirmation: it uncovers the queue the sound just
    // joined. The query goes too, so the next search starts clean.
    setQuery('');
    onOpenChange(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return onOpenChange(true);

      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) =>
        flat.length === 0
          ? 0
          : (current + delta + flat.length) % flat.length
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) return onOpenChange(true);

      const sound = flat.at(activeIndex);
      if (sound) pick(sound);
      return;
    }

    // Escape is not handled here: the dialog sees it first (Radix listens on
    // the document in the capture phase) and closes the dropdown from there.
  };

  let flatIndex = -1;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onOpenChange(false);
      }}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="sound-listbox"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onOpenChange(true);
          }}
          onFocus={() => onOpenChange(true)}
          onClick={() => onOpenChange(true)}
          onKeyDown={handleKeyDown}
          placeholder={`Search ${sounds.length} sounds…`}
          className={cn(
            'w-full rounded-sm border bg-surface py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-none',
            open ? 'border-accent' : 'border-line'
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <div
          // Keeps focus in the input so picking a row never blurs the
          // combobox shut before the click lands.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-50 mt-1.5"
        >
          {flat.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-sm border border-line bg-surface px-4 py-10 text-center shadow-pop">
              <SearchX className="h-5 w-5 text-ink-subtle" aria-hidden />
              <p className="text-sm font-semibold text-ink">
                No sounds match {query ? `"${query.trim()}"` : 'that filter'}
              </p>
              <p className="text-[13px] text-ink-subtle">
                Try another word, or a different tag.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTag(null);
                }}
                className="mt-1 inline-flex items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 py-2 text-[13px] font-medium text-ink hover:bg-background"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-sm border border-line bg-surface shadow-pop">
              {!query.trim() && (
                <div className="flex flex-wrap gap-1.5 border-b border-line p-2.5">
                  <button
                    type="button"
                    onClick={() => setTag(null)}
                    aria-pressed={tag === null}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      tag === null
                        ? 'border-ink bg-ink text-surface'
                        : 'border-line bg-surface text-ink-muted hover:border-line-strong'
                    )}
                  >
                    All
                  </button>
                  {tagOptions(sounds).map(({ tag: value, count }) => (
                    <TagChip
                      key={value}
                      tag={value}
                      selected={tag === value}
                      disabled={count === 0}
                      onClick={() => setTag(tag === value ? null : value)}
                    />
                  ))}
                </div>
              )}

              <div
                ref={listRef}
                id="sound-listbox"
                role="listbox"
                // Short enough that the panel still clears the bottom of the
                // dialog's scroll container, which would otherwise clip it.
                className="max-h-48 overflow-y-auto p-1.5"
              >
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="px-2 pb-1 pt-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-subtle">
                      {group.label}
                    </p>

                    {group.sounds.map((sound) => {
                      flatIndex += 1;
                      const isActive = flatIndex === activeIndex;
                      const index = flatIndex;

                      return (
                        <div
                          key={sound.id}
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => pick(sound)}
                          className={cn(
                            'flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 transition-colors',
                            isActive
                              ? 'border border-accent bg-accent-soft'
                              : 'border border-transparent hover:bg-background'
                          )}
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-background text-ink-muted">
                            <SoundIcon iconKey={sound.iconKey} className="h-3.5 w-3.5" />
                          </span>

                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                            {sound.displayName}
                          </span>

                          <span className="flex shrink-0 items-center gap-1.5">
                            <TagDot tag={sound.tag} />
                            <span className="text-[11px] text-ink-subtle">{sound.tag}</span>
                          </span>

                          <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-ink-subtle">
                            {formatDuration(durations.get(sound.id))}
                          </span>

                          {isActive ? (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-accent text-accent-foreground">
                              <CornerDownLeft className="h-3 w-3" aria-hidden />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onPreview(sound);
                              }}
                              aria-label={`Preview ${sound.displayName}`}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border border-line text-ink-muted hover:text-ink"
                            >
                              <Play className="h-3 w-3" aria-hidden />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className="border-t border-line px-3 py-2 text-right text-[11px] text-ink-subtle">
                {query.trim() && flat.at(activeIndex)
                  ? `↵ adds ${flat.at(activeIndex)?.displayName} · ↑↓ to change · esc to close`
                  : '↑↓ browse · ↵ add · click ▷ to preview'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
