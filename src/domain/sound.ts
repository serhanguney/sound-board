import { z } from 'zod';
import { soundIdSchema, type SoundId } from './ids';
import { inferSoundIconKey, soundIconKeySchema } from './sound-icon';

export const soundSchema = z
  .object({
    id: soundIdSchema,
    displayName: z.string().min(1),
    url: z.string().url(),
    iconKey: soundIconKeySchema,
  })
  .readonly();

export type Sound = z.infer<typeof soundSchema>;

/** Turns a stored filename into a human display name. */
export function displayNameFromFilename(pathname: string): string {
  const base = pathname.split('/').at(-1) ?? pathname;
  const withoutExtension = base.includes('.')
    ? base.slice(0, base.lastIndexOf('.'))
    : base;

  return withoutExtension
    .split(/[-_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

/** Builds a `Sound` from the raw blob-store shape. */
export function soundFromBlob(blob: {
  pathname: string;
  url: string;
}): Sound | null {
  const displayName = displayNameFromFilename(blob.pathname);
  if (!displayName) return null;

  const parsed = soundSchema.safeParse({
    id: blob.pathname,
    displayName,
    url: blob.url,
    iconKey: inferSoundIconKey(displayName),
  });

  return parsed.success ? parsed.data : null;
}

export function findSound(
  sounds: readonly Sound[],
  id: SoundId
): Sound | undefined {
  return sounds.find((sound) => sound.id === id);
}

/**
 * Picks a random sound, optionally excluding one (so a repeating "random"
 * schedule does not play the same clip twice in a row).
 */
export function pickRandomSound(
  sounds: readonly Sound[],
  exclude?: SoundId | null
): Sound | undefined {
  const candidates =
    exclude == null ? sounds : sounds.filter((sound) => sound.id !== exclude);
  const pool = candidates.length > 0 ? candidates : sounds;

  return pool.at(Math.floor(Math.random() * pool.length));
}
