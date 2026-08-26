/**
 * Minimal observable store designed for `useSyncExternalStore`.
 *
 * State is replaced, never mutated, so the identity check React performs on
 * each snapshot is meaningful. `setState` skips notification when the updater
 * returns the same reference, which keeps a 500ms scheduler tick from
 * re-rendering the tree when nothing has actually changed.
 */
export type Unsubscribe = () => void;

export interface ReadableStore<TState> {
  readonly getSnapshot: () => TState;
  readonly subscribe: (listener: () => void) => Unsubscribe;
}

export interface ExternalStore<TState> extends ReadableStore<TState> {
  readonly setState: (updater: (previous: TState) => TState) => void;
}

export function createExternalStore<TState>(
  initialState: TState
): ExternalStore<TState> {
  let state = initialState;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => state,

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setState: (updater) => {
      const next = updater(state);
      if (Object.is(next, state)) return;

      state = next;
      // Iterate a copy: a listener may unsubscribe during notification.
      for (const listener of [...listeners]) listener();
    },
  };
}

/** Lightweight typed event channel for effects that are not state. */
export interface Emitter<TEvent> {
  readonly emit: (event: TEvent) => void;
  readonly on: (handler: (event: TEvent) => void) => Unsubscribe;
}

export function createEmitter<TEvent>(): Emitter<TEvent> {
  const handlers = new Set<(event: TEvent) => void>();

  return {
    emit: (event) => {
      for (const handler of [...handlers]) handler(event);
    },
    on: (handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}
