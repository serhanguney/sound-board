'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/use-store';
import { AudioEngine, type AudioState } from './audio-engine';

const AudioEngineContext = createContext<AudioEngine | null>(null);

export function AudioEngineProvider({ children }: { children: ReactNode }) {
  // Lazily constructed once per mount; the engine outlives every render.
  const [engine] = useState(() => new AudioEngine());

  useEffect(() => () => engine.destroy(), [engine]);

  return (
    <AudioEngineContext.Provider value={engine}>
      {children}
    </AudioEngineContext.Provider>
  );
}

export function useAudioEngine(): AudioEngine {
  const engine = useContext(AudioEngineContext);
  if (!engine) {
    throw new Error('useAudioEngine must be used within an AudioEngineProvider');
  }
  return engine;
}

export function useAudioState(): AudioState {
  return useStore(useAudioEngine().state);
}
