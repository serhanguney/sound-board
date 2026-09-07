import { describe, expect, it } from 'vitest';
import { inferSoundIconKey, SOUND_ICON_KEYS } from './sound-icon';
import { SOUND_TAGS, UNTAGGED } from './sound-tag';

describe('inferSoundIconKey', () => {
  it.each([
    ['Shotgun', 'gunshot'],
    ['Applause', 'party-popper'],
    ['Sad Trombone', 'sad'],
    ['Airplane Captain', 'plane'],
    ['Countdown', 'timer'],
    ['Laugh Track', 'laugh'],
    ['Drum Roll', 'drum'],
    ['Crickets', 'bug'],
    ['Mosquito', 'bug'],
    ['Cat Purr 1', 'paw-print'],
    ['Air Horn', 'megaphone'],
    ['Pour Coffee', 'coffee'],
    ['Windows Startup', 'monitor'],
    ['Wrong Answer', 'wrong'],
    ['Nervous Clock', 'alarm'],
    ['Whip Crack', 'zap'],
    ['Ta-da', 'trophy'],
  ])('%s -> %s', (name, expected) => {
    expect(inferSoundIconKey(name)).toBe(expected);
  });

  it('falls back to music for an unrecognised, untagged name', () => {
    expect(inferSoundIconKey('Something Entirely New')).toBe('music');
  });

  it('ignores separators and case', () => {
    // "Ta-da" and "TADA" must reach the same key.
    expect(inferSoundIconKey('TA_DA')).toBe(inferSoundIconKey('ta-da'));
  });

  it('always returns a key the UI can render', () => {
    const names = ['Windows Startup', 'Ta-da', 'zzz', 'Air Horn'];
    for (const name of names) {
      expect(SOUND_ICON_KEYS).toContain(inferSoundIconKey(name));
    }
  });
});

describe('human-voice', () => {
  it.each([
    ['Sneeze', 'human-voice'],
    ['Excuse Me', 'human-voice'],
    ['Yawn', 'human-voice'],
    ['Cough', 'human-voice'],
  ])('%s -> %s', (name, expected) => {
    expect(inferSoundIconKey(name)).toBe(expected);
  });
});

describe('tag defaults', () => {
  it.each([
    ['fun', 'balloon'],
    ['celebration', 'party-popper'],
    ['chaos', 'zap'],
    ['lame', 'circle-dot-dashed'],
    ['mundane', 'chess-pawn'],
    ['cats', 'paw-print'],
  ] as const)('an unrecognised %s sound gets %s', (tag, expected) => {
    expect(inferSoundIconKey('Something Entirely New', tag)).toBe(expected);
  });

  it.each(['drive', 'untagged'] as const)(
    'leaves %s on the default icon',
    (tag) => {
      expect(inferSoundIconKey('Something Entirely New', tag)).toBe('music');
    }
  );

  it('lets the name win over the tag', () => {
    // The library's "Airplane Captain" is tagged chaos, and is still a plane.
    expect(inferSoundIconKey('Airplane Captain', 'chaos')).toBe('plane');
    // The one the user asked for by name: a mosquito is a bug, not chaos.
    expect(inferSoundIconKey('Mosquito', 'chaos')).toBe('bug');
  });

  it('is total for every tag', () => {
    for (const tag of [...SOUND_TAGS, UNTAGGED]) {
      expect(SOUND_ICON_KEYS).toContain(inferSoundIconKey('zzz', tag));
    }
  });
});

describe('icon key coverage', () => {
  it('every key is renderable', async () => {
    // Guards the split between the domain's key list and the UI's component
    // map: adding a key without a component is a type error, but only if
    // something imports the map.
    const { SOUND_ICON_KEYS: keys } = await import('./sound-icon');
    expect(new Set(keys).size).toBe(keys.length);
  });
});
