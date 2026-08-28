'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseSoundPath } from '@/domain/sound';
import { SOUND_TAGS, type SoundTag } from '@/domain/sound-tag';
import { cn } from '@/lib/utils';
import { TagChip } from './tag-badge';
import { useUploadSound } from './use-sounds';

export function UploadSoundForm({
  password,
  onUploaded,
}: {
  /** Verified admin password, replayed with each upload. */
  password: string;
  onUploaded?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [tag, setTag] = useState<SoundTag | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, error } = useUploadSound();

  const reset = () => {
    setFile(null);
    setDisplayName('');
    setTag(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;

    if (!selected.type.startsWith('audio/')) {
      setValidationError('Please choose an audio file.');
      setFile(null);
      return;
    }

    setFile(selected);
    setValidationError(null);

    // A file already named `whip-crack--drive.mp3` pre-fills both fields.
    const parsed = parseSoundPath(selected.name);
    setDisplayName(parsed.displayName);
    if (parsed.tag !== 'untagged') setTag(parsed.tag);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!file) return setValidationError('Please choose a file.');
    if (!displayName.trim()) {
      return setValidationError('Please enter a display name.');
    }
    if (tag === null) return setValidationError('Please pick a tag.');

    // Reset on success only — a failed upload keeps the user's input.
    mutate(
      { file, displayName: displayName.trim(), tag, password },
      {
        onSuccess: () => {
          reset();
          onUploaded?.();
        },
      }
    );
  };

  const message =
    validationError ?? (error instanceof Error ? error.message : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-ink">Sound file</span>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={isPending}
          ref={fileInputRef}
          className="w-full cursor-pointer rounded-sm border border-line bg-surface px-3 py-2 text-[13px] text-ink-muted file:mr-3 file:rounded-sm file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-[13px] file:text-ink"
        />
        {file && (
          <span className="block text-[11px] text-ink-subtle">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </span>
        )}
      </label>

      <label className="block space-y-1.5">
        <span className="text-[13px] font-medium text-ink">Display name</span>
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="How the card will be labelled"
          disabled={isPending}
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-line-strong focus-visible:outline-none"
        />
      </label>

      <fieldset className="space-y-1.5">
        <legend className="text-[13px] font-medium text-ink">Tag</legend>
        <div className="flex flex-wrap gap-2">
          {SOUND_TAGS.map((value) => (
            <TagChip
              key={value}
              tag={value}
              selected={tag === value}
              onClick={() => setTag(value)}
            />
          ))}
        </div>
      </fieldset>

      {message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={isPending || (!file && !displayName)}
          className="inline-flex items-center gap-2 rounded-sm border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-background disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden />
          Clear
        </button>
        <button
          type="submit"
          disabled={isPending || !file || !displayName.trim() || tag === null}
          className={cn(
            'inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          <Check className="h-4 w-4" aria-hidden />
          {isPending ? 'Uploading…' : 'Upload sound'}
        </button>
      </div>
    </form>
  );
}
