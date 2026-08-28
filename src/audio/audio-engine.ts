import type { SoundId } from '@/domain/ids';
import type { Sound } from '@/domain/sound';
import {
  createEmitter,
  createExternalStore,
  type Emitter,
  type ReadableStore,
} from '@/lib/external-store';

export interface AudioState {
  readonly playingSoundId: SoundId | null;
  readonly failedSoundIds: ReadonlySet<SoundId>;
  readonly loopingSoundIds: ReadonlySet<SoundId>;
  readonly volume: number;
  /**
   * Clip length in seconds, filled in from each element's `loadedmetadata`
   * event. The board renders a placeholder until an entry appears, which is
   * cheaper and more accurate than downloading every file a second time just
   * to measure it.
   */
  readonly durations: ReadonlyMap<SoundId, number>;
}

export type AudioEvent =
  | { readonly type: 'started'; readonly soundId: SoundId }
  | { readonly type: 'ended'; readonly soundId: SoundId }
  | {
      readonly type: 'failed';
      readonly soundId: SoundId;
      readonly reason: string;
    };

const INITIAL_STATE: AudioState = {
  playingSoundId: null,
  failedSoundIds: new Set(),
  loopingSoundIds: new Set(),
  volume: 0.7,
  durations: new Map(),
};

const withAdded = <T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> =>
  set.has(value) ? set : new Set(set).add(value);

const withRemoved = <T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> => {
  if (!set.has(value)) return set;
  const next = new Set(set);
  next.delete(value);
  return next;
};

const withoutKey = <K, V>(map: ReadonlyMap<K, V>, key: K): ReadonlyMap<K, V> => {
  if (!map.has(key)) return map;
  const next = new Map(map);
  next.delete(key);
  return next;
};

/**
 * Owns every `HTMLAudioElement` in the app.
 *
 * Deliberate properties, each replacing a defect in the previous inline
 * implementation:
 *
 * - Elements are reconciled by id, so changing the volume or re-fetching the
 *   sound list no longer tears down and re-downloads the entire board.
 * - Event handlers read engine state directly instead of closing over a React
 *   render, so `ended` can never observe a stale `playingSoundId`.
 * - Looping is native `audio.loop` only; there is no second, competing
 *   implementation in the `ended` handler.
 * - Playback end and clip length come from the element's own `ended` and
 *   `loadedmetadata` events, rather than from downloading each file a second
 *   time to measure it.
 */
export class AudioEngine {
  readonly #store = createExternalStore<AudioState>(INITIAL_STATE);
  readonly #events = createEmitter<AudioEvent>();
  readonly #elements = new Map<SoundId, HTMLAudioElement>();

  get state(): ReadableStore<AudioState> {
    return this.#store;
  }

  get events(): Pick<Emitter<AudioEvent>, 'on'> {
    return this.#events;
  }

  /** Adds elements for new sounds and disposes those no longer present. */
  syncSounds(sounds: readonly Sound[]): void {
    const nextIds = new Set(sounds.map((sound) => sound.id));

    for (const [id, element] of this.#elements) {
      if (nextIds.has(id)) continue;
      this.#dispose(id, element);
    }

    for (const sound of sounds) {
      if (this.#elements.has(sound.id)) continue;
      this.#elements.set(sound.id, this.#createElement(sound));
    }
  }

  async play(soundId: SoundId): Promise<void> {
    const element = this.#elements.get(soundId);
    if (!element) return;

    const current = this.#store.getSnapshot().playingSoundId;
    if (current === soundId) return;
    if (current !== null) this.stop(current);

    element.currentTime = 0;
    element.loop = this.#store.getSnapshot().loopingSoundIds.has(soundId);

    try {
      await element.play();
      this.#store.setState((state) => ({
        ...state,
        playingSoundId: soundId,
        failedSoundIds: withRemoved(state.failedSoundIds, soundId),
      }));
      this.#events.emit({ type: 'started', soundId });
    } catch (error) {
      this.#markFailed(
        soundId,
        error instanceof Error ? error.message : 'Playback was blocked'
      );
    }
  }

  stop(soundId: SoundId): void {
    const element = this.#elements.get(soundId);
    if (element) {
      element.pause();
      element.currentTime = 0;
    }

    this.#store.setState((state) =>
      state.playingSoundId === soundId
        ? { ...state, playingSoundId: null }
        : state
    );
  }

  stopAll(): void {
    for (const element of this.#elements.values()) {
      element.pause();
      element.currentTime = 0;
    }
    this.#store.setState((state) =>
      state.playingSoundId === null ? state : { ...state, playingSoundId: null }
    );
  }

  toggleLoop(soundId: SoundId): void {
    this.#store.setState((state) => {
      const looping = state.loopingSoundIds.has(soundId);
      const element = this.#elements.get(soundId);
      if (element) element.loop = !looping;

      return {
        ...state,
        loopingSoundIds: looping
          ? withRemoved(state.loopingSoundIds, soundId)
          : withAdded(state.loopingSoundIds, soundId),
      };
    });
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    for (const element of this.#elements.values()) element.volume = clamped;
    this.#store.setState((state) =>
      state.volume === clamped ? state : { ...state, volume: clamped }
    );
  }

  /** Clears the failed flag and forces the element to re-fetch. */
  retry(soundId: SoundId): void {
    const element = this.#elements.get(soundId);
    if (!element) return;

    this.#store.setState((state) => ({
      ...state,
      failedSoundIds: withRemoved(state.failedSoundIds, soundId),
    }));
    element.load();
  }

  destroy(): void {
    for (const [id, element] of this.#elements) this.#dispose(id, element);
    this.#store.setState(() => INITIAL_STATE);
  }

  #createElement(sound: Sound): HTMLAudioElement {
    const element = new Audio();
    element.preload = 'metadata';
    element.volume = this.#store.getSnapshot().volume;

    element.addEventListener('loadedmetadata', () => {
      const seconds = element.duration;
      if (!Number.isFinite(seconds) || seconds <= 0) return;

      this.#store.setState((state) =>
        state.durations.get(sound.id) === seconds
          ? state
          : {
              ...state,
              durations: new Map(state.durations).set(sound.id, seconds),
            }
      );
    });

    element.addEventListener('ended', () => {
      // `loop` handles repetition natively; `ended` only fires for one-shots.
      this.#store.setState((state) =>
        state.playingSoundId === sound.id
          ? { ...state, playingSoundId: null }
          : state
      );
      this.#events.emit({ type: 'ended', soundId: sound.id });
    });

    element.addEventListener('error', () => {
      this.#markFailed(sound.id, `Could not load "${sound.displayName}"`);
    });

    element.src = sound.url;
    return element;
  }

  #markFailed(soundId: SoundId, reason: string): void {
    this.#store.setState((state) => ({
      ...state,
      playingSoundId:
        state.playingSoundId === soundId ? null : state.playingSoundId,
      failedSoundIds: withAdded(state.failedSoundIds, soundId),
    }));
    this.#events.emit({ type: 'failed', soundId, reason });
  }

  #dispose(soundId: SoundId, element: HTMLAudioElement): void {
    element.pause();
    element.removeAttribute('src');
    element.load();
    this.#elements.delete(soundId);

    this.#store.setState((state) => ({
      ...state,
      playingSoundId:
        state.playingSoundId === soundId ? null : state.playingSoundId,
      failedSoundIds: withRemoved(state.failedSoundIds, soundId),
      loopingSoundIds: withRemoved(state.loopingSoundIds, soundId),
      durations: withoutKey(state.durations, soundId),
    }));
  }
}
