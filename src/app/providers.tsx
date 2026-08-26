'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AudioEngineProvider } from '@/audio/audio-provider';
import { SchedulerProvider } from '@/scheduling/scheduler-provider';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: ReactNode }) {
  // One client per mount, so server-rendered requests never share a cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AudioEngineProvider>
        <SchedulerProvider>
          {children}
          <Toaster />
        </SchedulerProvider>
      </AudioEngineProvider>
    </QueryClientProvider>
  );
}
