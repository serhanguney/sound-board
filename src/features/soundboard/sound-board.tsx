'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAudioEngine, useAudioState } from '@/audio/audio-provider';
import type { QueueEntryId, SoundId } from '@/domain/ids';
import {
  createEntry,
  DEFAULT_GAP_MINUTES,
  minutesToMs,
  type QueueEntry,
} from '@/domain/queue';
import { filterByTag, searchSounds, type Sound } from '@/domain/sound';
import type { SoundTagOrUntagged } from '@/domain/sound-tag';
import { AddToQueueDialog } from '@/features/queue/add-to-queue-dialog';
import { QueuePanel } from '@/features/queue/queue-panel';
import { useQueueAudioBridge } from '@/features/queue/use-queue-runner-bridge';
import { AdminUploadDialog } from '@/features/sounds/admin-upload-dialog';
import { useSounds } from '@/features/sounds/use-sounds';
import { FAVICON_IDLE, FAVICON_PLAYING } from './favicon';
import { useFavicon } from './use-favicon';
import { useQueueRunner, useQueueState } from '@/scheduling/queue-provider';
import { SoundGrid } from './sound-grid';
import { TopBar } from './top-bar';

const EMPTY_SOUNDS: readonly Sound[] = [];

export function SoundBoard() {
  const {
    data: sounds = EMPTY_SOUNDS,
    isPending,
    isError,
    error,
  } = useSounds();

  const engine = useAudioEngine();
  const { playingSoundId, failedSoundIds, durations } = useAudioState();

  const runner = useQueueRunner();
  const { queue, nowMs } = useQueueState();

  useQueueAudioBridge(sounds);

  // A scheduled sound fires while the user is in a call, looking at anything
  // but this tab. The icon is what tells them it went out.
  useFavicon(playingSoundId === null ? FAVICON_IDLE : FAVICON_PLAYING);

  // Reconciles audio elements against the library. Volume is deliberately not a
  // dependency: it is applied to live elements and must not rebuild them.
  useEffect(() => {
    engine.syncSounds(sounds);
  }, [engine, sounds]);

  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<SoundTagOrUntagged | null>(null);
  /**
   * `session` increments on every open and is the dialog's `key`, so each open
   * gets a freshly mounted dialog with default gap, mode and selection. It is
   * kept while the dialog closes so Radix can still play its exit animation.
   */
  const [dialog, setDialog] = useState<{
    session: number;
    open: boolean;
    candidateId: QueueEntryId | null;
  }>({ session: 0, open: false, candidateId: null });
  const [uploadOpen, setUploadOpen] = useState(false);
  // Surfaced as "Recent" in the picker; outlives any one dialog session.
  const [recentIds, setRecentIds] = useState<readonly SoundId[]>([]);
  // Held in memory only, for the life of the tab.
  const [adminPassword, setAdminPassword] = useState<string | null>(null);

  const visible = useMemo(
    () => searchSounds(filterByTag(sounds, activeTag), query),
    [sounds, activeTag, query]
  );

  const handlePlay = useCallback(
    (sound: Sound) => void engine.play(sound.id),
    [engine]
  );
  const handleStop = useCallback(
    (sound: Sound) => engine.stop(sound.id),
    [engine]
  );
  const openQueueDialog = useCallback((candidateId: QueueEntryId | null) => {
    setDialog((current) => ({
      session: current.session + 1,
      open: true,
      candidateId,
    }));
  }, []);

  const handleAdd = useCallback(
    (entry: QueueEntry) => {
      runner.add(entry);
      if (entry.target.kind === 'sound') {
        const { soundId } = entry.target;
        setRecentIds((current) => [
          soundId,
          ...current.filter((id) => id !== soundId),
        ]);
      }
    },
    [runner]
  );

  /**
   * A card's queue button queues the sound outright and opens the dialog on it,
   * so the first thing the user sees is where it landed. Adding it here — in
   * the click that asked for it — is what keeps it out of an effect inside the
   * dialog, where it could only run after a render that had already been given
   * the previous session's gap.
   */
  const handleQueue = useCallback(
    (sound: Sound) => {
      const entry = createEntry({
        target: { kind: 'sound', soundId: sound.id },
        label: sound.displayName,
        gapMs: minutesToMs(DEFAULT_GAP_MINUTES),
      });
      handleAdd(entry);
      openQueueDialog(entry.id);
    },
    [handleAdd, openQueueDialog]
  );
  const handleRemove = useCallback(
    (id: QueueEntry['id']) => runner.remove(id),
    [runner]
  );
  const handleMove = useCallback(
    (from: number, to: number) => runner.move(from, to),
    [runner]
  );
  const handlePreview = useCallback(
    (sound: Sound) => void engine.play(sound.id),
    [engine]
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        query={query}
        onQueryChange={setQuery}
        onUpload={() => setUploadOpen(true)}
      />

      <main className="mx-auto max-w-[1400px] space-y-8 px-6 py-8">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertTitle>Could not load sounds</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Unknown error.'}
            </AlertDescription>
          </Alert>
        )}

        <QueuePanel
          queue={queue}
          sounds={sounds}
          nowMs={nowMs}
          onPlay={() => {
            // Must run inside the click handler: this gesture is what grants
            // the document permission to play sounds minutes from now.
            void engine.unlock();
            runner.play();
          }}
          onHold={() => runner.hold()}
          onReplay={() => {
            void engine.unlock();
            runner.replay();
          }}
          onClear={() => runner.clear()}
          onAdd={() => openQueueDialog(null)}
        />

        {isPending ? (
          <p className="py-16 text-center text-sm text-ink-subtle">
            Loading sounds…
          </p>
        ) : sounds.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-subtle">
            No sounds in the library yet.
          </p>
        ) : (
          <SoundGrid
            sounds={sounds}
            visible={visible}
            durations={durations}
            playingSoundId={playingSoundId}
            failedSoundIds={failedSoundIds}
            activeTag={activeTag}
            onTagChange={setActiveTag}
            onPlay={handlePlay}
            onStop={handleStop}
            onQueue={handleQueue}
          />
        )}
      </main>

      <AddToQueueDialog
        key={dialog.session}
        open={dialog.open}
        onOpenChange={(open) =>
          !open && setDialog((current) => ({ ...current, open: false }))
        }
        queue={queue}
        sounds={sounds}
        durations={durations}
        recentIds={recentIds}
        initialCandidateId={dialog.candidateId}
        onAdd={handleAdd}
        onMove={handleMove}
        onRemove={handleRemove}
        onPreview={handlePreview}
      />

      <AdminUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        password={adminPassword}
        onUnlock={setAdminPassword}
      />
    </div>
  );
}
