'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ReorderState {
  /** Index being dragged, or null when at rest. */
  readonly fromIndex: number | null;
  /** Index the entry would land on if released now. */
  readonly toIndex: number | null;
  /** Pointer offset from the dragged row's top-left, for the lifted card. */
  readonly pointer: { readonly x: number; readonly y: number } | null;
}

const AT_REST: ReorderState = { fromIndex: null, toIndex: null, pointer: null };

/**
 * Pointer-based list reordering.
 *
 * Pointer events rather than HTML5 drag-and-drop: the native API has no useful
 * touch support and cannot style its drag image, both of which this list needs.
 * Row geometry is measured once at drag start, so the per-move work is a
 * comparison against a fixed array rather than a layout read.
 */
export function useReorder({
  count,
  onCommit,
}: {
  count: number;
  onCommit: (from: number, to: number) => void;
}) {
  const [state, setState] = useState<ReorderState>(AT_REST);

  const rowsRef = useRef(new Map<number, HTMLElement>());
  const midpointsRef = useRef<readonly number[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  const registerRow = useCallback((index: number, node: HTMLElement | null) => {
    if (node) rowsRef.current.set(index, node);
    else rowsRef.current.delete(index);
  }, []);

  const targetFor = useCallback((clientY: number): number => {
    const midpoints = midpointsRef.current;
    const crossed = midpoints.filter((midpoint) => clientY > midpoint).length;
    return Math.min(count - 1, Math.max(0, crossed));
  }, [count]);

  const start = useCallback(
    (index: number, event: React.PointerEvent) => {
      // Ignore secondary buttons so a right-click never begins a drag.
      if (event.button !== 0) return;
      event.preventDefault();

      midpointsRef.current = [...rowsRef.current.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, node]) => {
          const rect = node.getBoundingClientRect();
          return rect.top + rect.height / 2;
        });

      setState({
        fromIndex: index,
        toIndex: index,
        pointer: { x: event.clientX, y: event.clientY },
      });
    },
    []
  );

  useEffect(() => {
    if (state.fromIndex === null) return;

    const move = (event: PointerEvent) => {
      setState((current) =>
        current.fromIndex === null
          ? current
          : {
              ...current,
              toIndex: targetFor(event.clientY),
              pointer: { x: event.clientX, y: event.clientY },
            }
      );
    };

    const finish = () => {
      const { fromIndex, toIndex } = stateRef.current;
      setState(AT_REST);
      if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
        onCommit(fromIndex, toIndex);
      }
    };

    const cancel = () => setState(AT_REST);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', onKey);
    };
  }, [state.fromIndex, targetFor, onCommit]);

  return { ...state, registerRow, start };
}
