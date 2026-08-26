import { z } from 'zod';

/**
 * Icons are identified by a serializable key, never by a React element. Domain
 * objects that embed a `ReactNode` cannot be persisted to localStorage, which
 * is what flows and favourites need.
 *
 * The key -> component mapping lives in the UI layer (`src/features/sounds/sound-icon.tsx`).
 */
export const SOUND_ICON_KEYS = [
  'clock',
  'applause',
  'boo',
  'drum',
  'bell',
  'trophy',
  'laugh',
  'gunshot',
  'sad',
  'music',
  'shuffle',
] as const;

export const soundIconKeySchema = z.enum(SOUND_ICON_KEYS);
export type SoundIconKey = z.infer<typeof soundIconKeySchema>;

export const DEFAULT_SOUND_ICON: SoundIconKey = 'music';

/**
 * Ordered match table. First entry whose keyword appears in the name wins, so
 * more specific keywords must come first.
 */
const ICON_KEYWORDS: ReadonlyArray<readonly [SoundIconKey, readonly string[]]> =
  [
    ['clock', ['clock', 'tick', 'timer']],
    ['applause', ['applause', 'clap', 'cheer']],
    ['boo', ['boo', 'negative', 'fail', 'wrong']],
    ['drum', ['drum', 'roll']],
    ['bell', ['bell', 'ring', 'ding', 'chime']],
    ['trophy', ['tada', 'success', 'win', 'congrat', 'victory']],
    ['laugh', ['laugh', 'haha', 'giggle']],
    ['gunshot', ['gun', 'shot', 'shoot', 'bang']],
    ['sad', ['sad', 'motivation', 'trombone', 'womp']],
  ];

/** Derives an icon key from a display name. Pure and total. */
export function inferSoundIconKey(displayName: string): SoundIconKey {
  const haystack = displayName.toLowerCase();
  return (
    ICON_KEYWORDS.find(([, keywords]) =>
      keywords.some((keyword) => haystack.includes(keyword))
    )?.[0] ?? DEFAULT_SOUND_ICON
  );
}
