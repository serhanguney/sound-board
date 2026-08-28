'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, KeyRound, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isAdminPassword } from '@/server/admin';
import { UploadSoundForm } from './upload-sound-form';

/**
 * Password gate in front of the upload form.
 *
 * The password is verified by a server action and held only in memory for the
 * life of the tab — never written to storage, and never present in the bundle.
 * It is replayed with each upload because the server re-checks it there too.
 */
export function AdminUploadDialog({
  open,
  onOpenChange,
  password,
  onUnlock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Non-null once unlocked, so the gate is not shown again this session. */
  password: string | null;
  onUnlock: (password: string) => void;
}) {
  const [candidate, setCandidate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!open) {
      setCandidate('');
      setError(null);
    }
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!candidate) return setError('Enter the admin password.');

    setChecking(true);
    setError(null);
    try {
      if (await isAdminPassword(candidate)) {
        onUnlock(candidate);
        setCandidate('');
      } else {
        setError('That password is not correct.');
      }
    } catch {
      setError('Could not check the password. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 border-line bg-surface p-0">
        <DialogHeader className="shrink-0 space-y-1 p-6 pb-4 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <Upload className="h-4 w-4" aria-hidden />
            Upload sound
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-subtle">
            {password === null
              ? 'Adding sounds is limited to admins.'
              : 'The tag is stored in the filename, so it travels with the file.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {password === null ? (
            <form onSubmit={(event) => void submit(event)} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[13px] font-medium text-ink">
                  Admin password
                </span>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
                    aria-hidden
                  />
                  <input
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={candidate}
                    onChange={(event) => setCandidate(event.target.value)}
                    placeholder="Enter password to unlock"
                    aria-invalid={error !== null}
                    className="w-full rounded-sm border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus-visible:border-line-strong focus-visible:outline-none"
                  />
                </div>
              </label>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <button
                type="submit"
                disabled={checking || candidate.length === 0}
                className="w-full rounded-sm bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checking ? 'Checking…' : 'Unlock'}
              </button>
            </form>
          ) : (
            <UploadSoundForm password={password} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
