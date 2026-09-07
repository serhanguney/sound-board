import { z } from 'zod';
import { UNTAGGED, type SoundTagOrUntagged } from './sound-tag';

/**
 * Icons are identified by a serializable key, never by a React element, so a
 * queue entry that names one can be persisted.
 *
 * The key -> component mapping lives in the UI layer
 * (`src/features/sounds/sound-icon.tsx`).
 */
export const SOUND_ICON_KEYS = [
  'alarm',
  'balloon',
  'bell',
  'boo',
  'bug',
  'chess-pawn',
  'circle-dot-dashed',
  'coffee',
  'drum',
  'gunshot',
  'human-voice',
  'laugh',
  'megaphone',
  'monitor',
  'music',
  'party-popper',
  'paw-print',
  'plane',
  'sad',
  'shuffle',
  'sparkles',
  'timer',
  'trophy',
  'wrong',
  'zap',
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
    ['party-popper', ['applause', 'clap', 'cheer']],
    ['trophy', ['tada', 'success', 'victory', 'congrat', 'trophy']],
    ['sparkles', ['sparkle', 'magic', 'shine']],
    ['drum', ['drum']],
    ['bell', ['bell', 'chime', 'ding']],
    ['laugh', ['laugh', 'haha', 'giggle']],
    ['gunshot', ['shotgun', 'gunshot', 'gunfire', 'bang']],
    ['sad', ['sadtrombone', 'trombone', 'lowmotivation', 'womp', 'sad']],
    ['wrong', ['wrong', 'incorrect', 'error', 'fail']],
    ['boo', ['boo', 'negative']],
    ['bug', ['cricket', 'bug', 'mosquito']],
    // `cat` is not here: it is a substring of ordinary words like
    // "communicate". Cat sounds are reached by their `cats` tag instead.
    ['paw-print', ['meow', 'purr', 'kitten']],
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

/**
 * What a tag falls back to when nothing in the name is more specific.
 *
 * A tag says what a sound is *for*, which is a weaker signal than what it is
 * called — "Airplane Captain" is tagged chaos but is still a plane. So these
 * apply only once every keyword has missed. A tag with no entry here, and an
 * untagged sound, fall through to `DEFAULT_SOUND_ICON`.
 */
const ICON_BY_TAG: Partial<
  Readonly<Record<SoundTagOrUntagged, SoundIconKey>>
> = {
  fun: 'balloon',
  celebration: 'party-popper',
  chaos: 'zap',
  lame: 'circle-dot-dashed',
  mundane: 'chess-pawn',
  cats: 'paw-print',
};

/** Derives an icon key from a display name and tag. Pure and total. */
export function inferSoundIconKey(
  displayName: string,
  tag: SoundTagOrUntagged = UNTAGGED
): SoundIconKey {
  const haystack = collapse(displayName);

  const named = ICON_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => haystack.includes(keyword))
  )?.[0];

  return named ?? ICON_BY_TAG[tag] ?? DEFAULT_SOUND_ICON;
}
