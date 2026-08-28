'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/use-store';
import { queueStorage } from '@/persistence/stores';
import { QueueRunner, type QueueRunnerState } from './queue-runner';

const QueueContext = createContext<QueueRunner | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [runner] = useState(() => new QueueRunner());

  useEffect(() => {
    // Rehydrate before the clock starts: a queue prepared in an earlier visit
    // should come back exactly as it was left, still waiting to be played.
    const stored = queueStorage.load();
    if (stored) runner.replaceQueue(stored);

    const stopClock = runner.start();

    let persisted = runner.state.getSnapshot().queue;

    const unsubscribeStore = runner.state.subscribe(() => {
      const { queue } = runner.state.getSnapshot();
      // The clock updates `nowMs` twice a second; only write on real changes.
      if (queue === persisted) return;
      persisted = queue;
      queueStorage.save(queue);
    });

    // Two tabs would otherwise each run their own copy of the queue, firing
    // sounds from a tab whose UI shows something else entirely. Adopting the
    // other tab's state keeps every open tab showing the same queue.
    const unsubscribeTabs = queueStorage.subscribe((queue) => {
      if (queue === null) return;
      persisted = queue;
      runner.replaceQueue(queue);
    });

    return () => {
      unsubscribeStore();
      unsubscribeTabs();
      stopClock();
    };
  }, [runner]);

  return <QueueContext.Provider value={runner}>{children}</QueueContext.Provider>;
}

export function useQueueRunner(): QueueRunner {
  const runner = useContext(QueueContext);
  if (!runner) {
    throw new Error('useQueueRunner must be used within a QueueProvider');
  }
  return runner;
}

export function useQueueState(): QueueRunnerState {
  return useStore(useQueueRunner().state);
}
