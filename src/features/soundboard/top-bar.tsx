'use client';

import { AudioLines, Search } from 'lucide-react';

/**
 * The design puts the brand in a sidebar. With the sidebar dropped for the MVP
 * (Flows and Favourites are its only other destinations) the brand moves here.
 *
 * A three-column grid centres the search against the viewport rather than
 * against the space left over by the brand, so it stays put regardless of how
 * wide the wordmark renders.
 */
export function TopBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_1fr] items-center gap-4 px-6 py-3.5 sm:grid-cols-[1fr_auto_1fr]">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ink">
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

        <label className="relative w-full sm:w-[26rem]">
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

        {/* Balances the brand column so the search sits centred. */}
        <span className="hidden sm:block" aria-hidden />
      </div>
    </header>
  );
}
