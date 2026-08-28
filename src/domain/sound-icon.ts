import { z } from 'zod';

/**
 * Icons are identified by a serializable key, never by a React element, so a
 * queue entry that names one can be persisted.
 *
 * The key -> component mapping lives in the UI layer
 * (`src/features/sounds/sound-icon.tsx`).
 */
export const SOUND_ICON_KEYS = [
  'alarm',
  'applause',
  'bell',
  'boo',
  'bug',
  'coffee',
  'drum',
  'gunshot',
  'laugh',
  'megaphone',
  'monitor',
  'music',
  'plane',
  'sad',
  'shuffle',
  'sparkles',
  'timer',
  'trophy',
  'wrong',
  'zap',
  'human-voice'
] as const;

export const soundIconKeySchema = z.enum(SOUND_ICON_KEYS);
export type SoundIconKey = z.infer<typeof soundIconKeySchema>;

export const DEFAULT_SOUND_ICON: SoundIconKey = 'music';

/**
 * Ordered match table; the first entry with a matching keyword wins, so more
 * specific keywords come first.
 *
 * Keywords are matched against the name with all separators removed, which lets
 * "Ta-da" match `tada` and "Shotgun" match `shot`. That makes matching a plain
 * substring test, so every keyword must be long and distinctive enough not to
 * appear inside an unrelated word — `win` was previously here and made
 * "Windows Startup" a trophy.
 */
const ICON_KEYWORDS: ReadonlyArray<readonly [SoundIconKey, readonly string[]]> =
  [
    ['alarm', ['nervousclock', 'alarm']],
    ['timer', ['countdown', 'timer', 'clock', 'tick']],
    ['applause', ['applause', 'clap', 'cheer']],
    ['trophy', ['tada', 'success', 'victory', 'congrat', 'trophy']],
    ['sparkles', ['sparkle', 'magic', 'shine']],
    ['drum', ['drum']],
    ['bell', ['bell', 'chime', 'ding']],
    ['laugh', ['laugh', 'haha', 'giggle']],
    ['gunshot', ['shotgun', 'gunshot', 'gunfire', 'bang']],
    ['sad', ['sadtrombone', 'trombone', 'lowmotivation', 'womp', 'sad']],
    ['wrong', ['wrong', 'incorrect', 'error', 'fail']],
    ['boo', ['boo', 'negative']],
    ['bug', ['cricket', 'bug']],
    ['megaphone', ['airhorn', 'horn', 'megaphone', 'announce']],
    ['coffee', ['coffee', 'tea', 'brew']],
    ['monitor', ['windows', 'startup', 'computer', 'desktop']],
    ['plane', ['airplane', 'plane', 'captain', 'flight']],
    ['zap', ['whip', 'crack', 'zap', 'electric','horror']],
    ['human-voice',['sneeze','excuse','yawn','cough']]
  ];

/** Lowercases and strips every non-alphanumeric character. */
const collapse = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Derives an icon key from a display name. Pure and total. */
export function inferSoundIconKey(displayName: string): SoundIconKey {
  const haystack = collapse(displayName);

  return (
    ICON_KEYWORDS.find(([, keywords]) =>
      keywords.some((keyword) => haystack.includes(keyword))
    )?.[0] ?? DEFAULT_SOUND_ICON
  );
}
