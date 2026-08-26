'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Check, Upload, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { displayNameFromFilename } from '@/domain/sound';
import { useUploadSound } from './use-sounds';

export function UploadSoundForm({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending, error } = useUploadSound();

  const reset = () => {
    setFile(null);
    setDisplayName('');
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
    setDisplayName(displayNameFromFilename(selected.name));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!file) return setValidationError('Please choose a file.');
    if (!displayName.trim()) {
      return setValidationError('Please enter a display name.');
    }

    // Reset on success only — a failed upload keeps the user's input.
    mutate(
      { file, displayName: displayName.trim() },
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
    <Card className="mx-auto mb-8 w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" aria-hidden />
          Upload sound
        </CardTitle>
        <CardDescription>Add your own sound to the board.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sound-file">Sound file</Label>
            <Input
              id="sound-file"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isPending}
              ref={fileInputRef}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="How the button will be labelled"
              disabled={isPending}
            />
          </div>

          {message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={isPending || (!file && !displayName)}
          >
            <X className="mr-2 h-4 w-4" aria-hidden />
            Clear
          </Button>
          <Button
            type="submit"
            disabled={isPending || !file || !displayName.trim()}
          >
            <Check className="mr-2 h-4 w-4" aria-hidden />
            {isPending ? 'Uploading…' : 'Upload sound'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
