'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, RefreshCw, Square } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAudioEngine, useAudioState } from '@/audio/audio-provider';
import type { Sound } from '@/domain/sound';
import { ScheduleDialog } from '@/features/schedules/schedule-dialog';
import { ScheduledSoundList } from '@/features/schedules/scheduled-sound-list';
import { useScheduleActions } from '@/features/schedules/use-schedule-actions';
import { useScheduleRunner } from '@/features/schedules/use-schedule-runner';
import { useSounds } from '@/features/sounds/use-sounds';
import { useSchedulerState } from '@/scheduling/scheduler-provider';
import { cn } from '@/lib/utils';
import { SoundTile } from './sound-tile';

const EMPTY_SOUNDS: readonly Sound[] = [];

export function SoundBoard() {
  const { data: sounds = EMPTY_SOUNDS, isPending, isError, error, refetch } =
    useSounds();

  const engine = useAudioEngine();
  const { playingSoundId, loopingSoundIds, failedSoundIds, volume } =
    useAudioState();
  const { schedules, nowMs } = useSchedulerState();
  const { schedule, cancel } = useScheduleActions();

  useScheduleRunner(sounds);

  // Reconciles audio elements against the sound list. Volume is intentionally
  // absent: it is applied directly to live elements and must not rebuild them.
  useEffect(() => {
    engine.syncSounds(sounds);
  }, [engine, sounds]);

  const [dialogTarget, setDialogTarget] = useState<
    { sound: Sound | null } | null
  >(null);

  const handlePlay = useCallback(
    (sound: Sound) => void engine.play(sound.id),
    [engine]
  );
  const handleStop = useCallback(
    (sound: Sound) => engine.stop(sound.id),
    [engine]
  );
  const handleToggleLoop = useCallback(
    (sound: Sound) => engine.toggleLoop(sound.id),
    [engine]
  );
  const handleSchedule = useCallback(
    (sound: Sound) => setDialogTarget({ sound }),
    []
  );

  const failedCount = failedSoundIds.size;

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-3xl">Team Meeting Sound Board</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refetch()}
            disabled={isPending}
            aria-label="Refresh sounds"
          >
            <RefreshCw
              className={cn('h-4 w-4', isPending && 'animate-spin')}
              aria-hidden
            />
          </Button>
        </div>
        <CardDescription>
          Play a sound during your meeting, or schedule one to fire later.
          Scheduled sounds keep running while the tab is in the background.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertTitle>Could not load sounds</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{error instanceof Error ? error.message : 'Unknown error.'}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {failedCount > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" aria-hidden />
            <AlertTitle>Some sounds failed to load</AlertTitle>
            <AlertDescription>
              {failedCount} of {sounds.length} could not be played.
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Scheduled sounds</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => engine.stopAll()}
                disabled={playingSoundId === null}
              >
                <Square className="mr-2 h-4 w-4" aria-hidden />
                Stop
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogTarget({ sound: null })}
                disabled={sounds.length === 0}
              >
                <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
                Schedule random sound
              </Button>
            </div>
          </div>

          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled yet.
            </p>
          ) : (
            <ScheduledSoundList
              schedules={schedules}
              sounds={sounds}
              nowMs={nowMs}
              onCancel={cancel}
            />
          )}
        </section>

        <section className="space-y-2">
          <Label htmlFor="volume">Volume</Label>
          <Slider
            id="volume"
            min={0}
            max={1}
            step={0.05}
            value={[volume]}
            onValueChange={([next]) => next !== undefined && engine.setVolume(next)}
            className="max-w-xs"
          />
        </section>

        <section>
          {isPending ? (
            <p className="py-12 text-center text-muted-foreground">
              Loading sounds…
            </p>
          ) : sounds.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              No sounds yet. Upload one to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sounds.map((sound) => (
                <SoundTile
                  key={sound.id}
                  sound={sound}
                  isPlaying={playingSoundId === sound.id}
                  isLooping={loopingSoundIds.has(sound.id)}
                  hasFailed={failedSoundIds.has(sound.id)}
                  onPlay={handlePlay}
                  onStop={handleStop}
                  onToggleLoop={handleToggleLoop}
                  onSchedule={handleSchedule}
                />
              ))}
            </div>
          )}
        </section>

        <ScheduleDialog
          open={dialogTarget !== null}
          onOpenChange={(open) => !open && setDialogTarget(null)}
          sound={dialogTarget?.sound ?? null}
          onSchedule={({ minutes, repeat }) =>
            schedule({ sound: dialogTarget?.sound ?? null, minutes, repeat })
          }
        />
      </CardContent>
    </Card>
  );
}
