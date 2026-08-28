import { z } from 'zod';

/**
 * Tags are a closed set. They drive the filter chips, the coloured dot on every
 * card, and the "random from tag" queue entry, so an open-ended string would
 * let an unrenderable value reach the UI.
 */
export const SOUND_TAGS = [
  'drive',
  'lame',
  'celebration',
  'chaos',
  'calm',
  'mundane',
  'fun'
] as const;

export const soundTagSchema = z.enum(SOUND_TAGS);
export type SoundTag = z.infer<typeof soundTagSchema>;

/** Sounds whose filename carries no recognised tag suffix. */
export const UNTAGGED = 'untagged' as const;
export type UntaggedTag = typeof UNTAGGED;

export const soundTagOrUntaggedSchema = z.union([
  soundTagSchema,
  z.literal(UNTAGGED),
]);
export type SoundTagOrUntagged = z.infer<typeof soundTagOrUntaggedSchema>;

/** Separator between the display name and the tag in a stored filename. */
export const TAG_SEPARATOR = '--';

export const SOUND_TAG_LABELS: Readonly<Record<SoundTagOrUntagged, string>> = {
  drive: 'drive',
  lame: 'lame',
  mundane: 'mundane',
  celebration: 'celebration',
  chaos: 'chaos',
  calm: 'calm',
  fun: 'fun',
  [UNTAGGED]: 'untagged',
};

export function isSoundTag(value: string): value is SoundTag {
  return soundTagSchema.safeParse(value).success;
}

/**
 * Splits `shotgun--drive` into its name and tag halves.
 *
 * The tag is the segment after the final separator, so a display name may
 * itself contain the separator. An unrecognised or absent suffix yields
 * `untagged` and leaves the name intact rather than silently truncating it.
 */
export function splitTagSuffix(basename: string): {
  name: string;
  tag: SoundTagOrUntagged;
} {
  const index = basename.lastIndexOf(TAG_SEPARATOR);
  if (index <= 0) return { name: basename, tag: UNTAGGED };

  const candidate = basename.slice(index + TAG_SEPARATOR.length);
  return isSoundTag(candidate)
    ? { name: basename.slice(0, index), tag: candidate }
    : { name: basename, tag: UNTAGGED };
}

/** Builds the stored basename for a display name and tag. */
export function joinTagSuffix(slug: string, tag: SoundTagOrUntagged): string {
  return tag === UNTAGGED ? slug : `${slug}${TAG_SEPARATOR}${tag}`;
}
