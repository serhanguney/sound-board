// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toSoundId } from '@/domain/ids';
import type { Sound } from '@/domain/sound';
import { AudioEngine } from './audio-engine';

const makeSound = (id: string): Sound => ({
  id: toSoundId(`sounds/${id}.mp3`),
  displayName: id,
  url: `https://blob.example.com/sounds/${id}.mp3`,
  iconKey: 'music',
  tag: 'chaos',
});

const bell = makeSound('bell');
const drum = makeSound('drum');

// jsdom does not implement media playback; stub the three methods the engine uses.
let playImpl: () => Promise<void>;

beforeEach(() => {
  playImpl = () => Promise.resolve();
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() =>
    playImpl()
  );
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(
    () => {}
  );
  vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(
    () => {}
  );
});

const newEngine = (sounds: readonly Sound[] = [bell, drum]) => {
  const engine = new AudioEngine();
  engine.syncSounds(sounds);
  return engine;
};

describe('AudioEngine', () => {
  it('tracks the playing sound', async () => {
    const engine = newEngine();
    await engine.play(bell.id);

    expect(engine.state.getSnapshot().playingSoundId).toBe(bell.id);
  });

  it('stops the previous sound when another starts', async () => {
    const engine = newEngine();
    await engine.play(bell.id);
    await engine.play(drum.id);

    expect(engine.state.getSnapshot().playingSoundId).toBe(drum.id);
  });

  it('ignores a play request for the sound already playing', async () => {
    const engine = newEngine();
    await engine.play(bell.id);

    const started: string[] = [];
    engine.events.on((event) => {
      if (event.type === 'started') started.push(event.soundId);
    });

    await engine.play(bell.id);
    expect(started).toEqual([]);
  });

  it('clears the playing sound when playback fails', async () => {
    playImpl = () => Promise.reject(new Error('NotAllowedError'));
    const engine = newEngine();

    await engine.play(bell.id);
    const state = engine.state.getSnapshot();

    expect(state.playingSoundId).toBeNull();
    expect(state.failedSoundIds.has(bell.id)).toBe(true);
  });

  it('toggles looping without restarting playback', async () => {
    const engine = newEngine();
    await engine.play(bell.id);

    engine.toggleLoop(bell.id);
    expect(engine.state.getSnapshot().loopingSoundIds.has(bell.id)).toBe(true);
    expect(engine.state.getSnapshot().playingSoundId).toBe(bell.id);

    engine.toggleLoop(bell.id);
    expect(engine.state.getSnapshot().loopingSoundIds.has(bell.id)).toBe(false);
  });

  it('keeps playing across a volume change', async () => {
    const engine = newEngine();
    await engine.play(bell.id);

    engine.setVolume(0.2);

    // The regression this guards: rebuilding audio elements on every volume
    // change stopped playback and re-downloaded every file.
    expect(engine.state.getSnapshot().playingSoundId).toBe(bell.id);
    expect(engine.state.getSnapshot().volume).toBe(0.2);
  });

  it('clamps volume into range', () => {
    const engine = newEngine();
    engine.setVolume(5);
    expect(engine.state.getSnapshot().volume).toBe(1);
    engine.setVolume(-1);
    expect(engine.state.getSnapshot().volume).toBe(0);
  });

  it('keeps playing when the sound list is re-fetched unchanged', async () => {
    const engine = newEngine();
    await engine.play(bell.id);

    engine.syncSounds([bell, drum]);
    expect(engine.state.getSnapshot().playingSoundId).toBe(bell.id);
  });

  it('drops state for a sound removed from the list', async () => {
    const engine = newEngine();
    engine.toggleLoop(bell.id);
    await engine.play(bell.id);

    engine.syncSounds([drum]);
    const state = engine.state.getSnapshot();

    expect(state.playingSoundId).toBeNull();
    expect(state.loopingSoundIds.has(bell.id)).toBe(false);
  });

  it('stops everything on stopAll', async () => {
    const engine = newEngine();
    await engine.play(bell.id);
    engine.stopAll();

    expect(engine.state.getSnapshot().playingSoundId).toBeNull();
  });

  it('clears the failed flag on retry', async () => {
    playImpl = () => Promise.reject(new Error('boom'));
    const engine = newEngine();
    await engine.play(bell.id);
    expect(engine.state.getSnapshot().failedSoundIds.has(bell.id)).toBe(true);

    engine.retry(bell.id);
    expect(engine.state.getSnapshot().failedSoundIds.has(bell.id)).toBe(false);
  });

  it('publishes a new state object on change and the same one otherwise', async () => {
    const engine = newEngine();
    const before = engine.state.getSnapshot();

    await engine.play(bell.id);
    expect(engine.state.getSnapshot()).not.toBe(before);

    const playing = engine.state.getSnapshot();
    engine.setVolume(playing.volume);
    expect(engine.state.getSnapshot()).toBe(playing);
  });
});
