'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/use-store';
import { schedulesStorage } from '@/persistence/stores';
import { Scheduler, type SchedulerState } from './scheduler';

const SchedulerContext = createContext<Scheduler | null>(null);

export function SchedulerProvider({ children }: { children: ReactNode }) {
  const [scheduler] = useState(() => new Scheduler());

  // Rehydrate before starting the clock, so schedules whose deadline elapsed
  // while the page was closed are resolved by the first tick rather than
  // firing a burst of stale sounds.
  useEffect(() => {
    scheduler.replaceAll(schedulesStorage.load());
    const stopClock = scheduler.start();

    let persisted = scheduler.state.getSnapshot().schedules;
    const unsubscribe = scheduler.state.subscribe(() => {
      const { schedules } = scheduler.state.getSnapshot();
      // The clock updates `nowMs` twice a second; only write when the
      // schedules themselves actually changed.
      if (schedules === persisted) return;
      persisted = schedules;
      schedulesStorage.save(schedules);
    });

    return () => {
      unsubscribe();
      stopClock();
    };
  }, [scheduler]);

  return (
    <SchedulerContext.Provider value={scheduler}>
      {children}
    </SchedulerContext.Provider>
  );
}

export function useScheduler(): Scheduler {
  const scheduler = useContext(SchedulerContext);
  if (!scheduler) {
    throw new Error('useScheduler must be used within a SchedulerProvider');
  }
  return scheduler;
}

export function useSchedulerState(): SchedulerState {
  return useStore(useScheduler().state);
}
