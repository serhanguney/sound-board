'use client';

import { Repeat, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ScheduleId } from '@/domain/ids';
import {
  byRemainingTime,
  formatRemaining,
  remainingMs,
  type Schedule,
} from '@/domain/schedule';
import { findSound, type Sound } from '@/domain/sound';
import { SoundIcon } from '@/features/sounds/sound-icon';
import type { SoundIconKey } from '@/domain/sound-icon';

const iconKeyFor = (
  schedule: Schedule,
  sounds: readonly Sound[]
): SoundIconKey =>
  schedule.target.kind === 'random'
    ? 'shuffle'
    : (findSound(sounds, schedule.target.soundId)?.iconKey ?? 'music');

export function ScheduledSoundList({
  schedules,
  sounds,
  nowMs,
  onCancel,
}: {
  schedules: readonly Schedule[];
  sounds: readonly Sound[];
  nowMs: number;
  onCancel: (id: ScheduleId) => void;
}) {
  // `toSorted` leaves the caller's array untouched — no defensive copying.
  const ordered = schedules.toSorted(byRemainingTime);

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {ordered.map((schedule) => (
        <li key={schedule.id}>
          <Card className="group relative">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <SoundIcon iconKey={iconKeyFor(schedule, sounds)} />

              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" aria-hidden />
                <time>{formatRemaining(remainingMs(schedule, nowMs))}</time>
                {schedule.repeat && (
                  <Repeat
                    className="h-4 w-4"
                    aria-label="Repeats every interval"
                  />
                )}
              </p>

              <p className="max-w-[12rem] truncate text-sm font-medium">
                {schedule.label}
              </p>

              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => onCancel(schedule.id)}
                  aria-label={`Cancel ${schedule.label}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
