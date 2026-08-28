'use server';

import { list, put } from '@vercel/blob';
import { z } from 'zod';
import { soundFromBlob, type Sound } from '@/domain/sound';
import { inferSoundIconKey } from '@/domain/sound-icon';
import { joinTagSuffix, soundTagSchema } from '@/domain/sound-tag';

const SOUND_PREFIX = 'sounds/';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function listSounds(): Promise<readonly Sound[]> {
  const { blobs } = await list({ prefix: SOUND_PREFIX, limit: 1000 });

  return blobs
    .flatMap((blob) => {
      const sound = soundFromBlob(blob);
      return sound ? [sound] : [];
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

const uploadInputSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  tag: soundTagSchema,
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'The file is empty.')
    .refine(
      (file) => file.size <= MAX_UPLOAD_BYTES,
      'The file is larger than 10 MB.'
    )
    .refine(
      (file) => file.type.startsWith('audio/'),
      'Only audio files can be uploaded.'
    ),
});

export type UploadResult =
  | { readonly ok: true; readonly sound: Sound }
  | { readonly ok: false; readonly error: string };

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Stores the sound as `sounds/<slug>--<tag>.<ext>`.
 *
 * The tag lives in the filename so the blob listing alone is enough to render
 * the board — there is no manifest that could drift out of sync with the files.
 */
export async function uploadSound(formData: FormData): Promise<UploadResult> {
  const parsed = uploadInputSchema.safeParse({
    displayName: formData.get('displayName'),
    tag: formData.get('tag'),
    file: formData.get('file'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid upload.',
    };
  }

  const { file, displayName, tag } = parsed.data;
  const slug = toSlug(displayName);
  if (!slug) {
    return { ok: false, error: 'The display name has no usable characters.' };
  }

  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? 'mp3';
  const pathname = `${SOUND_PREFIX}${joinTagSuffix(slug, tag)}.${extension}`;

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return {
      ok: true,
      sound: {
        id: blob.pathname as Sound['id'],
        displayName,
        url: blob.url,
        iconKey: inferSoundIconKey(displayName),
        tag,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Upload failed.',
    };
  }
}
