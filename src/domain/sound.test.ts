import { describe, expect, it } from 'vitest';
import { toSoundId } from './ids';
import { SOUND_TAGS, UNTAGGED } from './sound-tag';
import {
  countByTag,
  filterByTag,
  findSound,
  formatDuration,
  parseSoundPath,
  pickRandomSound,
  searchSounds,
  soundFromBlob,
  tagOptions,
  type Sound,
} from './sound';

describe('parseSoundPath', () => {
  it.each([
    ['sounds/shotgun--drive.mp3', 'Shotgun', 'drive'],
    ['sounds/air-horn--chaos.mp3', 'Air Horn', 'chaos'],
    ['sounds/pour-coffee--calm.wav', 'Pour Coffee', 'calm'],
    ['sounds/sad-trombone--lame.mp3', 'Sad Trombone', 'lame'],
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
  make('Crickets', 'lame'),
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
  it('counts the tags in use', () => {
    const counts = countByTag(sounds);

    expect(counts.drive).toBe(1);
    expect(counts.celebration).toBe(1);
    expect(counts.chaos).toBe(1);
    expect(counts.lame).toBe(1);
  });

  it('returns a zero for every known tag, not just the ones present', () => {
    // Derived from the tag list so adding a tag does not break this test.
    const counts = countByTag([]);

    for (const tag of [...SOUND_TAGS, UNTAGGED]) {
      expect(counts[tag]).toBe(0);
    }
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

describe('tagOptions', () => {
  it('lists every tag in canonical order, whatever the library holds', () => {
    expect(tagOptions(sounds).map((option) => option.tag)).toEqual([
      ...SOUND_TAGS,
    ]);
  });

  it('offers a tag no sound carries yet, with a count of zero', () => {
    // A tag added to SOUND_TAGS has to be visible before anything is uploaded
    // with it, or there is no way to discover it exists.
    const added = tagOptions([make('Shotgun', 'drive')]);

    expect(added.find((option) => option.tag === 'calm')).toEqual({
      tag: 'calm',
      count: 0,
    });
    expect(added.find((option) => option.tag === 'drive')).toEqual({
      tag: 'drive',
      count: 1,
    });
  });

  it('appends the untagged bucket only when something is untagged', () => {
    // Every sound is untagged until its file is renamed with a --tag suffix,
    // but nobody can choose it, so it is not offered otherwise.
    expect(tagOptions(sounds).map((option) => option.tag)).not.toContain(
      UNTAGGED
    );
    expect(tagOptions([make('Yawn', 'untagged')]).at(-1)).toEqual({
      tag: UNTAGGED,
      count: 1,
    });
  });

  it('still lists every tag for an empty library', () => {
    expect(tagOptions([])).toEqual(
      SOUND_TAGS.map((tag) => ({ tag, count: 0 }))
    );
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
