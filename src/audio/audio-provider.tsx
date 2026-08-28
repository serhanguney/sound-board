'use client';

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '@/lib/use-store';
import { AudioEngine, type AudioState } from './audio-engine';

const AudioEngineContext = createContext<AudioEngine | null>(null);

export function AudioEngineProvider({ children }: { children: ReactNode }) {
  // Lazily constructed once per mount; the engine outlives every render.
  const [engine] = useState(() => new AudioEngine());

  // Deliberately not destroyed in an effect cleanup. StrictMode runs mount
  // effects twice, and the intervening cleanup would tear down every element
  // and drop the autoplay unlock while the provider is still mounted. The
  // engine lives as long as the document, which unloads with it.

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
