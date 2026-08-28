import { describe, expect, it } from 'vitest';
import { inferSoundIconKey, SOUND_ICON_KEYS } from './sound-icon';

describe('inferSoundIconKey', () => {
  it.each([
    ['Shotgun', 'gunshot'],
    ['Applause', 'applause'],
    ['Sad Trombone', 'sad'],
    ['Airplane Captain', 'plane'],
    ['Countdown', 'timer'],
    ['Laugh Track', 'laugh'],
    ['Drum Roll', 'drum'],
    ['Crickets', 'bug'],
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

  it('falls back to music for an unrecognised name', () => {
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
