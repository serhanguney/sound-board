import { describe, expect, it } from 'vitest';
import { toSoundId } from './ids';
import {
  displayNameFromFilename,
  findSound,
  pickRandomSound,
  soundFromBlob,
  type Sound,
} from './sound';
import { inferSoundIconKey } from './sound-icon';

describe('displayNameFromFilename', () => {
  it.each([
    ['sounds/nervous-clock.mp3', 'Nervous Clock'],
    ['sounds/drum_roll.wav', 'Drum Roll'],
    ['applause.mp3', 'Applause'],
    ['sounds/my.long.name.mp3', 'My.long.name'],
    ['sounds/no-extension', 'No Extension'],
  ])('%s -> %s', (pathname, expected) => {
    expect(displayNameFromFilename(pathname)).toBe(expected);
  });
});

describe('soundFromBlob', () => {
  it('builds a validated sound with an inferred icon', () => {
    const sound = soundFromBlob({
      pathname: 'sounds/applause.mp3',
      url: 'https://blob.example.com/sounds/applause.mp3',
    });

    expect(sound).toEqual({
      id: 'sounds/applause.mp3',
      displayName: 'Applause',
      url: 'https://blob.example.com/sounds/applause.mp3',
      iconKey: 'applause',
    });
  });

  it('rejects a blob with an unusable url instead of throwing', () => {
    expect(
      soundFromBlob({ pathname: 'sounds/bell.mp3', url: 'not-a-url' })
    ).toBeNull();
  });

  it('rejects a blob that yields no display name', () => {
    expect(
      soundFromBlob({ pathname: 'sounds/', url: 'https://example.com/a' })
    ).toBeNull();
  });
});

describe('inferSoundIconKey', () => {
  it.each([
    ['Nervous Clock', 'clock'],
    ['Applause', 'applause'],
    ['Gun Shoot', 'gunshot'],
    ['Low Motivation', 'sad'],
    ['Congrats Everyone', 'trophy'],
    ['Something Unrecognised', 'music'],
  ])('%s -> %s', (name, expected) => {
    expect(inferSoundIconKey(name)).toBe(expected);
  });
});

const sounds: readonly Sound[] = [
  {
    id: toSoundId('a'),
    displayName: 'A',
    url: 'https://e.com/a',
    iconKey: 'music',
  },
  {
    id: toSoundId('b'),
    displayName: 'B',
    url: 'https://e.com/b',
    iconKey: 'music',
  },
];

describe('findSound', () => {
  it('matches by id, not by display name', () => {
    expect(findSound(sounds, toSoundId('b'))?.displayName).toBe('B');
    expect(findSound(sounds, toSoundId('missing'))).toBeUndefined();
  });
});

describe('pickRandomSound', () => {
  it('never repeats the excluded sound when an alternative exists', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      expect(pickRandomSound(sounds, toSoundId('a'))?.id).toBe('b');
    }
  });

  it('falls back to the excluded sound when it is the only one', () => {
    const onlyA = sounds.filter((sound) => sound.id === toSoundId('a'));
    expect(pickRandomSound(onlyA, toSoundId('a'))?.id).toBe('a');
  });

  it('returns undefined for an empty list', () => {
    expect(pickRandomSound([], null)).toBeUndefined();
  });
});
