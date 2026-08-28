'use client';

import { useSyncExternalStore } from 'react';
import type { ReadableStore } from './external-store';

/**
 * Binds an `ExternalStore` to React.
 *
 * The server snapshot is the same getter: store state is replaced rather than
 * mutated, so the first snapshot is referentially stable across the render pass
 * and cannot trip React's "snapshot changed while rendering" guard.
 */
export function useStore<TState>(store: ReadableStore<TState>): TState {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}
