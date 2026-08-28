'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ToastActionElement, ToastProps } from '@/components/ui/toast';
import { createExternalStore } from '@/lib/external-store';
import { useStore } from '@/lib/use-store';

/** `ToastProps` inherits the DOM `title` attribute (a string); rich content
 *  replaces it here, so it has to be omitted before widening. */
export type ToasterToast = Omit<ToastProps, 'title'> & {
  readonly id: string;
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ToastActionElement;
};

const TOAST_LIMIT = 3;
/** How long a dismissed toast stays mounted so its exit animation can run. */
const REMOVE_AFTER_MS = 400;

interface ToastState {
  readonly toasts: readonly ToasterToast[];
}

const store = createExternalStore<ToastState>({ toasts: [] });
const pendingRemovals = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRemoval(id: string): void {
  if (pendingRemovals.has(id)) return;

  pendingRemovals.set(
    id,
    setTimeout(() => {
      pendingRemovals.delete(id);
      store.setState((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, REMOVE_AFTER_MS)
  );
}

export function dismissToast(id?: string): void {
  const { toasts } = store.getSnapshot();
  const targets = id === undefined ? toasts.map((toast) => toast.id) : [id];

  for (const target of targets) scheduleRemoval(target);

  store.setState((state) => ({
    toasts: state.toasts.map((toast) =>
      targets.includes(toast.id) ? { ...toast, open: false } : toast
    ),
  }));
}

export type ToastInput = Omit<ToasterToast, 'id'>;

export interface ToastHandle {
  readonly id: string;
  readonly dismiss: () => void;
  readonly update: (patch: Partial<ToastInput>) => void;
}

export function toast(input: ToastInput): ToastHandle {
  const id = crypto.randomUUID();

  const dismiss = () => dismissToast(id);

  const update = (patch: Partial<ToastInput>) =>
    store.setState((state) => ({
      toasts: state.toasts.map((existing) =>
        existing.id === id ? { ...existing, ...patch } : existing
      ),
    }));

  store.setState((state) => ({
    toasts: [
      {
        ...input,
        id,
        open: true,
        onOpenChange: (open: boolean) => {
          if (!open) dismiss();
        },
      },
      ...state.toasts,
    ].slice(0, TOAST_LIMIT),
  }));

  return { id, dismiss, update };
}

export function useToast() {
  const { toasts } = useStore(store);
  return useMemo(
    () => ({ toasts, toast, dismiss: dismissToast }),
    [toasts]
  );
}
