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
    const unsubscribe = runner.state.subscribe(() => {
      const { queue } = runner.state.getSnapshot();
      // The clock updates `nowMs` twice a second; only write on real changes.
      if (queue === persisted) return;
      persisted = queue;
      queueStorage.save(queue);
    });

    return () => {
      unsubscribe();
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
