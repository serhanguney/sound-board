'use client';

import { AudioLines, ListPlus, Search } from 'lucide-react';

/**
 * The design puts the brand in a sidebar. With the sidebar dropped for the MVP
 * (Flows and Favourites are its only other destinations) the brand moves here.
 */
export function TopBar({
  query,
  onQueryChange,
  onAddToQueue,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onAddToQueue: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-3.5">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-ink">
            <AudioLines className="h-[18px] w-[18px] text-accent" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[15px] font-bold text-ink">
              Soundboard
            </span>
            <span className="block text-[11px] text-ink-subtle">
              Yuivae · Product
            </span>
          </span>
        </span>

        <label className="relative min-w-[16rem] flex-1 sm:max-w-md">
          <span className="sr-only">Search sounds</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search sounds, tags…"
            className="w-full rounded-full border border-transparent bg-surface py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-line-strong focus-visible:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={onAddToQueue}
          className="ml-auto inline-flex items-center gap-2 rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-muted"
        >
          <ListPlus className="h-4 w-4" aria-hidden />
          Add to queue
        </button>
      </div>
    </header>
  );
}
