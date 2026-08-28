import { z } from 'zod';
import { soundIdSchema, type SoundId } from './ids';
import { inferSoundIconKey, soundIconKeySchema } from './sound-icon';
import {
  SOUND_TAGS,
  soundTagOrUntaggedSchema,
  type SoundTag,
  splitTagSuffix,
  UNTAGGED,
  type SoundTagOrUntagged,
} from './sound-tag';

export const soundSchema = z
  .object({
    id: soundIdSchema,
    displayName: z.string().min(1),
    url: z.string().url(),
    iconKey: soundIconKeySchema,
    tag: soundTagOrUntaggedSchema,
    /** Seconds, read from audio metadata at runtime; absent until loaded. */
    durationSeconds: z.number().positive().optional(),
  })
  .readonly();

export type Sound = z.infer<typeof soundSchema>;

const stripExtension = (basename: string): string =>
  basename.includes('.') ? basename.slice(0, basename.lastIndexOf('.')) : basename;

const titleCase = (value: string): string =>
  value
    .split(/[-_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');

/**
 * Derives the display name and tag from a stored blob path.
 *
 * The tag lives in the filename as a `--tag` suffix, so the listing alone is
 * enough to render the board — there is no manifest to keep in sync.
 */
export function parseSoundPath(pathname: string): {
  displayName: string;
  tag: SoundTagOrUntagged;
} {
  const basename = pathname.split('/').at(-1) ?? pathname;
  const { name, tag } = splitTagSuffix(stripExtension(basename));
  return { displayName: titleCase(name), tag };
}

export function soundFromBlob(blob: {
  pathname: string;
  url: string;
}): Sound | null {
  const { displayName, tag } = parseSoundPath(blob.pathname);
  if (!displayName) return null;

  const parsed = soundSchema.safeParse({
    id: blob.pathname,
    displayName,
    url: blob.url,
    iconKey: inferSoundIconKey(displayName),
    tag,
  });

  return parsed.success ? parsed.data : null;
}

export function findSound(
  sounds: readonly Sound[],
  id: SoundId
): Sound | undefined {
  return sounds.find((sound) => sound.id === id);
}

export function filterByTag(
  sounds: readonly Sound[],
  tag: SoundTagOrUntagged | null
): readonly Sound[] {
  return tag === null ? sounds : sounds.filter((sound) => sound.tag === tag);
}

/**
 * Tags actually present in the library, in canonical order.
 *
 * The filter row is built from this rather than from the full tag list, so a
 * library with no `calm` sounds does not offer a chip that matches nothing.
 */
export function tagsInUse(
  sounds: readonly Sound[]
): readonly SoundTagOrUntagged[] {
  const counts = countByTag(sounds);
  return ([...SOUND_TAGS, UNTAGGED] as const).filter(
    (tag) => counts[tag] > 0
  );
}

/** Case-insensitive match against the display name and the tag. */
export function searchSounds(
  sounds: readonly Sound[],
  query: string
): readonly Sound[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return sounds;

  return sounds.filter(
    (sound) =>
      sound.displayName.toLowerCase().includes(needle) ||
      sound.tag.toLowerCase().includes(needle)
  );
}

/**
 * Picks a random sound, optionally narrowed to a tag and excluding the one that
 * just played, so a repeating random entry does not play the same clip twice.
 */
export function pickRandomSound(
  sounds: readonly Sound[],
  options: { tag?: SoundTag | null; exclude?: SoundId | null } = {}
): Sound | undefined {
  const { tag = null, exclude = null } = options;

  const tagged = filterByTag(sounds, tag);
  const withoutExcluded =
    exclude === null ? tagged : tagged.filter((sound) => sound.id !== exclude);
  const pool = withoutExcluded.length > 0 ? withoutExcluded : tagged;

  return pool.at(Math.floor(Math.random() * pool.length));
}

export function countByTag(
  sounds: readonly Sound[]
): Readonly<Record<SoundTagOrUntagged, number>> {
  // Seeded from the tag list rather than a literal, so adding a tag does not
  // silently leave a bucket missing here.
  const empty = Object.fromEntries(
    [...SOUND_TAGS, UNTAGGED].map((tag) => [tag, 0])
  ) as Record<SoundTagOrUntagged, number>;

  return sounds.reduce<Record<SoundTagOrUntagged, number>>(
    (counts, sound) => ({ ...counts, [sound.tag]: counts[sound.tag] + 1 }),
    empty
  );
}

/** `m:ss` from a duration in seconds. */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '--:--';
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
