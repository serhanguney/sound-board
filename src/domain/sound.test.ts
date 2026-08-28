import { describe, expect, it } from 'vitest';
import { toSoundId } from './ids';
import {
  countByTag,
  filterByTag,
  findSound,
  formatDuration,
  parseSoundPath,
  pickRandomSound,
  searchSounds,
  soundFromBlob,
  tagsInUse,
  type Sound,
} from './sound';

describe('parseSoundPath', () => {
  it.each([
    ['sounds/shotgun--drive.mp3', 'Shotgun', 'drive'],
    ['sounds/air-horn--chaos.mp3', 'Air Horn', 'chaos'],
    ['sounds/pour-coffee--calm.wav', 'Pour Coffee', 'calm'],
    ['sounds/sad-trombone--low-motivation.mp3', 'Sad Trombone', 'low-motivation'],
  ])('%s -> %s / %s', (pathname, name, tag) => {
    expect(parseSoundPath(pathname)).toEqual({ displayName: name, tag });
  });

  it('treats a missing suffix as untagged and keeps the whole name', () => {
    expect(parseSoundPath('sounds/applause.mp3')).toEqual({
      displayName: 'Applause',
      tag: 'untagged',
    });
  });

  it('treats an unrecognised suffix as untagged without truncating the name', () => {
    // Guards against silently eating part of the display name.
    expect(parseSoundPath('sounds/weird--nonsense.mp3')).toEqual({
      displayName: 'Weird Nonsense',
      tag: 'untagged',
    });
  });

  it('uses the final separator so names may contain one', () => {
    expect(parseSoundPath('sounds/a--b--calm.mp3')).toEqual({
      displayName: 'A B',
      tag: 'calm',
    });
  });

  it('handles a filename with no extension', () => {
    expect(parseSoundPath('sounds/whip-crack--drive')).toEqual({
      displayName: 'Whip Crack',
      tag: 'drive',
    });
  });
});

describe('soundFromBlob', () => {
  it('builds a validated sound with tag and inferred icon', () => {
    expect(
      soundFromBlob({
        pathname: 'sounds/applause--celebration.mp3',
        url: 'https://blob.example.com/sounds/applause--celebration.mp3',
      })
    ).toEqual({
      id: 'sounds/applause--celebration.mp3',
      displayName: 'Applause',
      url: 'https://blob.example.com/sounds/applause--celebration.mp3',
      iconKey: 'applause',
      tag: 'celebration',
    });
  });

  it('rejects an unusable url instead of throwing', () => {
    expect(
      soundFromBlob({ pathname: 'sounds/bell--calm.mp3', url: 'not-a-url' })
    ).toBeNull();
  });
});

const make = (name: string, tag: Sound['tag']): Sound => ({
  id: toSoundId(`sounds/${name}`),
  displayName: name,
  url: `https://e.com/${name}`,
  iconKey: 'music',
  tag,
});

const sounds: readonly Sound[] = [
  make('Air Horn', 'chaos'),
  make('Applause', 'celebration'),
  make('Drum Roll', 'drive'),
  make('Crickets', 'low-motivation'),
];

describe('findSound', () => {
  it('matches by id, not display name', () => {
    expect(findSound(sounds, toSoundId('sounds/Applause'))?.tag).toBe(
      'celebration'
    );
    expect(findSound(sounds, toSoundId('missing'))).toBeUndefined();
  });
});

describe('filterByTag', () => {
  it('returns everything for a null tag', () => {
    expect(filterByTag(sounds, null)).toBe(sounds);
  });

  it('narrows to one tag', () => {
    expect(filterByTag(sounds, 'chaos').map((s) => s.displayName)).toEqual([
      'Air Horn',
    ]);
  });
});

describe('searchSounds', () => {
  it('returns everything for a blank query', () => {
    expect(searchSounds(sounds, '   ')).toBe(sounds);
  });

  it('matches display names case-insensitively', () => {
    expect(searchSounds(sounds, 'horn').map((s) => s.displayName)).toEqual([
      'Air Horn',
    ]);
  });

  it('matches tags too', () => {
    expect(searchSounds(sounds, 'celebration').map((s) => s.displayName)).toEqual(
      ['Applause']
    );
  });
});

describe('pickRandomSound', () => {
  it('narrows to a tag', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(pickRandomSound(sounds, { tag: 'drive' })?.displayName).toBe(
        'Drum Roll'
      );
    }
  });

  it('avoids the excluded sound when an alternative exists', () => {
    for (let i = 0; i < 30; i += 1) {
      const picked = pickRandomSound(sounds, {
        exclude: toSoundId('sounds/Air Horn'),
      });
      expect(picked?.displayName).not.toBe('Air Horn');
    }
  });

  it('falls back to the excluded sound when it is the only candidate', () => {
    expect(
      pickRandomSound(sounds, {
        tag: 'chaos',
        exclude: toSoundId('sounds/Air Horn'),
      })?.displayName
    ).toBe('Air Horn');
  });

  it('returns undefined when no sound matches the tag', () => {
    expect(pickRandomSound(sounds, { tag: 'calm' })).toBeUndefined();
  });

  it('returns undefined for an empty library', () => {
    expect(pickRandomSound([])).toBeUndefined();
  });
});

describe('countByTag', () => {
  it('counts every tag, including zeroes', () => {
    expect(countByTag(sounds)).toEqual({
      drive: 1,
      'low-motivation': 1,
      celebration: 1,
      chaos: 1,
      calm: 0,
      untagged: 0,
    });
  });
});

describe('formatDuration', () => {
  it.each([
    [2, '0:02'],
    [65, '1:05'],
    [0.4, '0:00'],
  ])('formats %ss as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('renders a placeholder until the duration is known', () => {
    expect(formatDuration(undefined)).toBe('--:--');
  });
});

describe('tagsInUse', () => {
  it('lists only tags present in the library, in canonical order', () => {
    expect(tagsInUse(sounds)).toEqual([
      'drive',
      'low-motivation',
      'celebration',
      'chaos',
    ]);
  });

  it('includes the untagged bucket when the library has untagged sounds', () => {
    // Every sound is untagged until its file is renamed with a --tag suffix.
    expect(tagsInUse([make('Yawn', 'untagged')])).toEqual(['untagged']);
  });

  it('is empty for an empty library', () => {
    expect(tagsInUse([])).toEqual([]);
  });
});

describe('filterByTag', () => {
  it('can narrow to the untagged bucket', () => {
    const library = [...sounds, make('Yawn', 'untagged')];
    expect(filterByTag(library, 'untagged').map((s) => s.displayName)).toEqual([
      'Yawn',
    ]);
  });
});
